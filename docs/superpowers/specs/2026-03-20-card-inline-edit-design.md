# 卡片原地编辑功能设计

## 概述

将卡片的编辑方式从「React 覆盖层 (CardEditor)」改为「Fabric.js Textbox 原生原地编辑」。

## 背景

当前双击卡片时，会在卡片上方弹出一个 React CardEditor 覆盖层，用户在覆盖层中编辑内容后保存。用户反馈这种交互不够直观，希望像编辑文本一样直接双击卡片进入编辑状态。

## 设计

### 核心思路

Fabric.js 的 Textbox 组件本身支持 `editable` 属性，设为 `true` 时双击即可进入原地编辑模式。方案A直接利用这个能力，最小化改动。

### 实现方案

#### 1. 修改 `renderCard` 函数

文件：`src/renderer/components/Canvas/renderCard.ts`

- 新增 `isEditing` 参数（或 `editable` 参数）
- 当 `isEditing=true` 时，将 title 和 content Textbox 的 `editable` 设为 `true`
- 当 `isEditing=false` 时，`editable` 为 `false`

```typescript
export function renderCard(
  card: { id, position, size, title?, content, locked, isEditing? },
  options?: { isEditing?: boolean }
): FabricObject {
  // ...
  if (title) {
    const titleText = new Textbox(title, {
      // ...
      editable: options?.isEditing ?? false,
    })
  }
  // content Textbox 同理
}
```

#### 2. 修改双击处理逻辑

文件：`src/renderer/components/Canvas/InfiniteCanvas.tsx`

**双击时：**
- 不再设置 `editingCard` 状态
- 直接找到卡片对应的 Textbox，设置 `editable: true`
- 调用 `textbox.enterEditing()` 触发编辑

**编辑完成时：**
- 监听 Fabric.js 的 `editing:exited` 事件
- 从 Textbox 获取编辑后的文本
- 调用 `updateElement` 保存到 store

#### 3. 移除 CardEditor 相关代码

- 删除 `CardEditor` 组件
- 移除 `InfiniteCanvas` 中的 `editingCard` 状态
- 移除 `handleCardSave` 和 `handleCardCancel`
- 移除 CardEditor 的条件渲染

### Fabric.js 对象模型

卡片在 Fabric.js 中是一个 Group，包含以下子对象：
- `bg`: Rect（背景）
- `titleText`（可选）: Textbox（标题）
- `contentText`: Textbox（内容）

通过 `group._objects` 可以访问子对象。双击时，从 `target._objects` 中找到 `titleText` 和 `contentText`。

### 交互细节

| 操作 | 行为 |
|------|------|
| 双击卡片 | 卡片进入编辑模式，光标出现在标题位置 |
| Enter | 完成当前 Textbox 编辑，焦点移到内容区 |
| Escape | 取消编辑，恢复原内容，退出编辑模式 |
| 点击其他区域 | 完成编辑并保存 |
| Ctrl+S | 保存并退出编辑 |

### 数据流

```
双击卡片
  → 从 canvas.findTarget() 获取 Group
  → 从 group._objects 找到 titleText 和 contentText
  → 设置 editable: true
  → 调用 titleText.enterEditing()

编辑完成 (editing:exited on contentText)
  → 从 Textbox 读取 text 属性
  → try {
      调用 updateElement({ id, title, content, updatedAt })
    } catch {
      恢复原 title/content（不做保存）
    }
  → 设置所有 Textbox editable: false

点击其他区域（canvas click with no target）
  → 如果正在编辑，触发保存逻辑
```

### 边界情况

1. **锁定卡片**：锁定卡片的 `selectable: false`，双击事件不会触发编辑
2. **空内容**：显示 "Double-click to edit" 提示文字
3. **保存失败**：`updateElement` 抛出异常时，不退出编辑模式，保留用户输入内容，用户可重试
4. **多个卡片同时编辑**：通过 `isEditingCardId` 状态确保同时只有一个卡片可编辑

## 改动范围

| 文件 | 改动 |
|------|------|
| `renderCard.ts` | 修改参数，支持 isEditing 控制 Textbox 的 editable 属性 |
| `InfiniteCanvas.tsx` | 修改双击逻辑，添加 isEditingCardId 状态，监听 editing:exited，移除 CardEditor 渲染 |
| `CardEditor.tsx` | 删除组件 |
| `elementsStore.ts` | 无需改动（`updateElement(id, Partial<CanvasElement>)` 已存在） |

### `updateElement` 接口

```typescript
// elementsStore.ts
updateElement: (id: string, updates: Partial<CanvasElement>) => void

// 对于 CardElement，updates 应包含：
{ title?: string, content?: string, updatedAt: string }
```

## 验收标准

1. ✅ 双击卡片直接进入编辑状态
2. ✅ 可以直接修改标题和内容
3. ✅ 点击其他区域或按 Escape 取消编辑
4. ✅ 编辑内容正确保存
5. ✅ 锁定卡片不能编辑
