# Card Inline Edit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React CardEditor overlay with Fabric.js Textbox native in-place editing.

**Architecture:** Modify `renderCard` to support editable Textboxes, replace `editingCard` state with `isEditingCardId`, and handle Fabric.js `editing:exited` event to save content.

**Tech Stack:** Fabric.js Textbox, React state, elementsStore

---

## Chunk 1: Modify renderCard to support isEditing option

**Files:**
- Modify: `src/renderer/components/Canvas/renderCard.ts`

**Changes:**
- Add optional `options?: { isEditing?: boolean }` parameter
- Set `editable: options?.isEditing ?? false` on both titleText and contentText Textboxes
- Store references to titleText and contentText on the group for later access

- [ ] **Step 1: Read renderCard.ts fully**

```typescript
// Current code at line 35-47 shows title Textbox with editable: false
// Current code at line 50-62 shows content Textbox with editable: false
// Need to change these to use options?.isEditing ?? false
```

- [ ] **Step 2: Modify renderCard function signature and implementation**

```typescript
// Change function signature from:
export function renderCard(card: { ... }): FabricObject
// To:
export function renderCard(
  card: {
    id: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    title?: string
    content: string
    locked: boolean
  },
  options?: { isEditing?: boolean }
): FabricObject

// Add isEditing to group data for later retrieval:
;(group as any).data = { id, type: 'card', isEditing: options?.isEditing ?? false }

// Update titleText (line 36-47):
if (title) {
  const titleText = new Textbox(title, {
    width: size.width - 20,
    fontSize: 14,
    fontWeight: 'bold',
    fill: '#333',
    left: 10,
    top: 10,
    editable: options?.isEditing ?? false,
    textDirection: 'ltr'
  })
  cardGroup.push(titleText)
}

// Update contentText (line 50-62):
const contentText = new Textbox(displayContent, {
  width: size.width - 20,
  fontSize: 13,
  fill: content ? '#555' : '#999',
  left: 10,
  top: title ? 35 : 10,
  editable: options?.isEditing ?? false,
  textDirection: 'ltr'
})
cardGroup.push(contentText)
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Canvas/renderCard.ts
git commit -m "feat: add isEditing option to renderCard for inline editing"
```

---

## Chunk 2: Update InfiniteCanvas - replace editingCard state with isEditingCardId

**Files:**
- Modify: `src/renderer/components/Canvas/InfiniteCanvas.tsx`

**Changes:**
- Replace `editingCard` state with `isEditingCardId: string | null`
- Remove `setEditingCard` usage
- Remove CardEditor import and JSX

- [ ] **Step 1: Replace editingCard state (line 24-29)**

```typescript
// Old:
const [editingCard, setEditingCard] = useState<{
  id: string
  title: string
  content: string
  position: { x: number; y: number; width: number; height: number }
} | null>(null)

// New:
const [isEditingCardId, setIsEditingCardId] = useState<string | null>(null)
```

- [ ] **Step 2: Remove CardEditor import (line 10)**

```typescript
// Delete this line:
import { CardEditor } from '../CardEditor/CardEditor'
```

- [ ] **Step 3: Remove CardEditor JSX (lines 489-497)**

```tsx
// Delete:
{editingCard && (
  <CardEditor
    initialTitle={editingCard.title}
    initialContent={editingCard.content}
    position={editingCard.position}
    onSave={handleCardSave}
    onCancel={handleCardCancel}
  />
)}
```

- [ ] **Step 4: Replace handleCardSave (lines 305-316)**

```typescript
// Old:
const handleCardSave = useCallback((title: string, content: string) => {
  if (editingCard) {
    useElementsStore.getState().updateElement(editingCard.id, {
      title,
      content,
      updatedAt: new Date().toISOString()
    } as any)
    setEditingCard(null)
    useElementsStore.getState().setEditingCard(null)
    useCanvasStore.getState().setDirty(true)
  }
}, [editingCard])

// New: Save card from editing state (called by editing:exited)
const saveEditingCard = useCallback((texts: { title?: string; content: string }) => {
  if (isEditingCardId) {
    useElementsStore.getState().updateElement(isEditingCardId, {
      title: texts.title,
      content: texts.content,
      updatedAt: new Date().toISOString()
    } as any)
    setIsEditingCardId(null)
    useElementsStore.getState().setEditingCard(null)
    useCanvasStore.getState().setDirty(true)
    syncElementsToCanvas() // Re-render card with editable: false
  }
}, [isEditingCardId, syncElementsToCanvas])
```

- [ ] **Step 5: Replace handleCardCancel (line 318-321)**

```typescript
// Old:
const handleCardCancel = useCallback(() => {
  setEditingCard(null)
  useElementsStore.getState().setEditingCard(null)
}, [])

// New:
const cancelEditingCard = useCallback(() => {
  setIsEditingCardId(null)
  useElementsStore.getState().setEditingCard(null)
  syncElementsToCanvas() // Re-render card with editable: false
}, [syncElementsToCanvas])
```

- [ ] **Step 6: Update dblclick handler (lines 157-204)**

Replace the card editing section in `handleDblClick` to enter Fabric.js editing mode instead of showing overlay:

```typescript
const handleDblClick = (opt: { e: TPointerEvent; target?: FabricObject }) => {
  if (currentTool === 'card') {
    // ... existing new card creation code stays unchanged ...
    return
  }

  const target = canvas.findTarget(opt.e as any)
  if (target && (target as any).data?.type === 'card') {
    const cardEl = useElementsStore.getState().getElement((target as any).data.id) as CardElement
    if (cardEl && !cardEl.locked) {
      // Enter editing mode
      const cardId = cardEl.id
      setIsEditingCardId(cardId)
      useElementsStore.getState().setEditingCard(cardId)

      // Re-render card with editable: true
      syncElementsToCanvas()

      // Find the group and enter editing on the content Textbox
      const objects = canvas.getObjects()
      const cardGroup = objects.find((obj: any) => obj.data?.id === cardId && obj.data?.type === 'card')
      if (cardGroup) {
        const textboxes = (cardGroup as any)._objects?.filter((o: any) => o.type === 'textbox')
        const contentTextbox = textboxes?.find((t: any) => !t.fontWeight || t.fontWeight !== 'bold')
        if (contentTextbox) {
          contentTextbox.enterEditing()
        }
      }
    }
  } else if (!target) {
    // ... existing new card creation on empty canvas ...
  }
}
```

- [ ] **Step 7: Add editing:exited event listener**

After the dblclick handler, add a new useEffect for `editing:exited`:

```typescript
// Handle text editing completion
useEffect(() => {
  const canvas = fabricRef.current
  if (!canvas) return

  const handleEditingExited = (e: { target?: FabricObject }) => {
    if (!isEditingCardId) return
    const target = e.target as any
    if (!target || target.type !== 'textbox') return

    // Find the card group this textbox belongs to
    const objects = canvas.getObjects()
    const cardGroup = objects.find((obj: any) =>
      obj.data?.id === isEditingCardId &&
      obj.data?.type === 'card' &&
      (obj._objects?.includes(target) || obj === target)
    )
    if (!cardGroup) return

    // Get edited text from all textboxes in the card
    const textboxes = (cardGroup as any)._objects?.filter((o: any) => o.type === 'textbox')
    const titleTextbox = textboxes?.find((t: any) => t.fontWeight === 'bold')
    const contentTextbox = textboxes?.find((t: any) => !t.fontWeight || t.fontWeight !== 'bold')

    const title = titleTextbox?.text || ''
    const content = contentTextbox?.text || ''

    // Only save if content has changed (basic check)
    saveEditingCard({ title, content })
  }

  canvas.on('editing:exited', handleEditingExited)
  return () => { canvas.off('editing:exited', handleEditingExited) }
}, [isEditingCardId, saveEditingCard])
```

- [ ] **Step 8: Update references to editingCard in Delete key handler (line 406)**

```typescript
// Old:
if (e.key === 'Delete' && !editingCard) {
// New:
if (e.key === 'Delete' && !isEditingCardId) {
```

- [ ] **Step 9: Add syncElementsToCanvas dependency fix**

The `syncElementsToCanvas` needs to be updated to pass `isEditing` flag. First update `syncElementsToCanvas`:

```typescript
// In syncElementsToCanvas (around line 109):
if (element.type === 'card') {
  const obj = renderCard(element, { isEditing: element.id === isEditingCardId }) as FabricObject
  // ...
}
```

Add `isEditingCardId` to the dependency array of `syncElementsToCanvas` useCallback (line 151).

- [ ] **Step 10: Commit**

```bash
git add src/renderer/components/Canvas/InfiniteCanvas.tsx
git commit -m "feat: replace CardEditor overlay with Fabric.js inline editing"
```

---

## Chunk 3: Delete CardEditor component

**Files:**
- Delete: `src/renderer/components/CardEditor/CardEditor.tsx`
- Check for other imports/usages before deletion

- [ ] **Step 1: Check if CardEditor is used anywhere else**

```bash
grep -r "CardEditor" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: If only used in InfiniteCanvas, delete the component file**

```bash
rm src/renderer/components/CardEditor/CardEditor.tsx
```

- [ ] **Step 3: Check if the CardEditor directory is now empty and remove if so**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove CardEditor component"
```

---

## Chunk 4: Verify and test

**Files:**
- Test manually in browser

- [ ] **Step 1: Build and check for TypeScript errors**

```bash
cd E:/otherCode/infinite_whiteboard
npm run build 2>&1 | head -50
```

- [ ] **Step 2: Start dev server and test manually**

```bash
npm run dev
# Then:
# 1. Double-click a card → should enter edit mode directly on the card
# 2. Type in content → should appear in card's text
# 3. Press Escape → should cancel and restore original
# 4. Click outside → should save and exit edit mode
# 5. Locked card → double-click should not enter edit mode
```

- [ ] **Step 5: Commit any remaining changes**
