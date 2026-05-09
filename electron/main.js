import { app, BrowserWindow, Menu, ipcMain, shell } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const startUrl = process.env.ELECTRON_START_URL || "http://localhost:5377"

let mainWindow
let nativeMenuEnabled = false

function createNativeMenu() {
  return Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "forceReload" }, { role: "toggleDevTools" }],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ])
}

function applyNativeMenuEnabled(enabled) {
  nativeMenuEnabled = enabled
  if (!mainWindow) return

  if (enabled) {
    const nativeMenu = createNativeMenu()
    Menu.setApplicationMenu(nativeMenu)
    mainWindow.setMenu(nativeMenu)
    mainWindow.setAutoHideMenuBar(false)
    mainWindow.setMenuBarVisibility(true)
    return
  }

  Menu.setApplicationMenu(null)
  mainWindow.setMenu(null)
  mainWindow.setAutoHideMenuBar(true)
  mainWindow.setMenuBarVisibility(false)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Veles",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  })

  mainWindow.loadURL(startUrl)
  applyNativeMenuEnabled(nativeMenuEnabled)

  // externe links in browser openen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })
}

ipcMain.handle("native-menu:set-enabled", (_, enabled) => {
  if (typeof enabled !== "boolean") {
    throw new Error("Expected a boolean value")
  }

  applyNativeMenuEnabled(enabled)
  return { enabled: nativeMenuEnabled }
})

ipcMain.handle("native-menu:get-enabled", () => {
  return { enabled: nativeMenuEnabled, supported: process.platform === "win32" }
})

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})