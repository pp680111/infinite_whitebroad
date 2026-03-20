import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import Store from 'electron-store'

const store = new Store<{ recentFiles: string[] }>({
  defaults: { recentFiles: [] }
})

export function setupIPC(mainWindow: BrowserWindow) {
  ipcMain.handle('file:new', () => {
    return { success: true }
  })

  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Whiteboard', extensions: ['whiteboard'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }
    const filePath = result.filePaths[0]
    try {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      return { success: true, data, filePath }
    } catch (error) {
      return { success: false, error: 'Failed to read file' }
    }
  })

  ipcMain.handle('file:save', async (_, { data, filePath }) => {
    if (!filePath) {
      // No filePath means save as - show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [{ name: 'Whiteboard', extensions: ['whiteboard'] }]
      })
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }
      filePath = result.filePath
    }
    try {
      const tmpPath = filePath + '.tmp'
      await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: 'Failed to save file' }
    }
  })

  ipcMain.handle('file:save-as', async (_, { data }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'Whiteboard', extensions: ['whiteboard'] }]
    })
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }
    const filePath = result.filePath
    try {
      const tmpPath = filePath + '.tmp'
      await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: 'Failed to save file' }
    }
  })

  ipcMain.handle('file:get-recent', () => {
    return store.get('recentFiles', [])
  })

  ipcMain.handle('file:add-recent', (_, filePath: string) => {
    const recent = store.get('recentFiles', [])
    const filtered = recent.filter((f: string) => f !== filePath)
    filtered.unshift(filePath)
    store.set('recentFiles', filtered.slice(0, 10))
    return { success: true }
  })
}
