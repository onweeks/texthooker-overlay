const { app, BrowserWindow, session, clipboard, globalShortcut } = require('electron')
const path = require('path')

app.whenReady().then(async () => {
  // Accessory apps (no Dock icon) are the only ones macOS lets overlay another
  // app's fullscreen Space. Quit with the toolbar's ✕ button or Ctrl+C in the
  // terminal.
  if (process.platform === 'darwin') app.dock.hide()

  const extension = await session.defaultSession.extensions.loadExtension(
    path.join(__dirname, 'yomitan-chrome'),
    { allowFileAccess: true }
  )

  // Starts hidden: the overlay only appears when new text arrives (or Cmd+Shift+Y).
  // Frameless: no title bar or traffic lights; the page's toolbar is the drag handle.
  const win = new BrowserWindow({ width: 900, height: 600, show: false, frame: false })
  win.loadFile(path.join(__dirname, 'texthooker.html'))

  // Float above fullscreen apps: on macOS a fullscreen app gets its own Space,
  // and only windows at an elevated level marked visible-on-all-workspaces can
  // appear over it. setFullScreenable(false) is required for the flag to work.
  win.setFullScreenable(false)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Spotlight-style dismissal: the overlay takes focus when shown, so clicking
  // anywhere else (e.g. the manga) blurs it and hides it immediately.
  win.on('blur', () => win.hide())

  // The toolbar's ✕ button closes this window via window.close(); quit the
  // whole app then, even if the Yomitan settings window is still open.
  win.on('closed', () => app.quit())

  // Cmd+Shift+Y toggles the overlay from anywhere, even while another app is fullscreen
  globalShortcut.register('CommandOrControl+Shift+Y', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
    }
  })

  // Cmd+Shift+S (Ctrl+Shift+S on Windows/Linux) opens Yomitan settings for dictionary import
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.meta || input.control) && input.shift && input.key.toLowerCase() === 's') {
      event.preventDefault()
      const settingsWin = new BrowserWindow({ width: 1100, height: 750 })
      settingsWin.loadURL(extension.url + 'settings.html')
    }
  })

  let last = ''
  setInterval(() => {
    if (win.isDestroyed()) return
    const text = clipboard.readText()
    if (text && text !== last) {
      last = text
      // New text pops the overlay over the manga; it keeps focus until you
      // click back on the manga, which hides it (see the blur handler)
      if (!win.isVisible()) win.show()
      win.webContents.executeJavaScript(`
        (function(){
          const p = document.createElement('p')
          p.textContent = ${JSON.stringify(text)}
          document.body.appendChild(p)
        })()
      `)
    }
  }, 200)
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())