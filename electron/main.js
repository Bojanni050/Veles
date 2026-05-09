const { app, BrowserWindow, shell } = require("electron")
const { spawn } = require("child_process")
const path = require("path")

let mainWindow
let nextProcess

function startNextServer() {
  nextProcess = spawn("node", ["node_modules/.bin/next", "start", "-p", "3000"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "production" },
    shell: true,
  })

  nextProcess.stdout.on("data", (data) => console.log(`Next: ${data}`))
  nextProcess.stderr.on("data", (data) => console.error(`Next error: ${data}`))
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
    },
  })

  mainWindow.loadURL("http://localhost:3000")
  mainWindow.setMenuBarVisibility(false)

  // externe links in browser openen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })
}

app.whenReady().then(() => {
  startNextServer()

  // wacht tot Next klaar is
  setTimeout(createWindow, 3000)

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill()
  if (process.platform !== "darwin") app.quit()
})