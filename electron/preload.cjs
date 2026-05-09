const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronNativeMenu", {
  isSupported: () => process.platform === "win32",
  getState: () => ipcRenderer.invoke("native-menu:get-enabled"),
  setEnabled: (enabled) => ipcRenderer.invoke("native-menu:set-enabled", enabled),
})
