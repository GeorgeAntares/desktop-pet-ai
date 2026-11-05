import { Menu, Tray, nativeImage, type BrowserWindow, type NativeImage } from 'electron'

export function createTray(win: BrowserWindow, onQuit: () => void): Tray {
  const tray = new Tray(createPetIcon())
  tray.setToolTip('桌宠')
  const menu = Menu.buildFromTemplate([
    {
      label: '显示 / 隐藏',
      click: () => {
        if (win.isVisible()) win.hide()
        else win.showInactive()
      },
    },
    { type: 'separator' },
    { label: '退出', click: onQuit },
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    win.showInactive()
  })
  return tray
}

function createPetIcon(): NativeImage {
  const size = 32
  const buf = Buffer.alloc(size * size * 4)
  const dot = (x: number, y: number, radius: number, r: number, g: number, b: number) => {
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - x
        const dy = py - y
        if (dx * dx + dy * dy > radius * radius) continue
        const i = (py * size + px) * 4
        buf[i] = b
        buf[i + 1] = g
        buf[i + 2] = r
        buf[i + 3] = 255
      }
    }
  }
  dot(16, 18, 12, 109, 94, 252)
  dot(11, 16, 2, 255, 255, 255)
  dot(21, 16, 2, 255, 255, 255)
  dot(11, 16, 1, 42, 36, 84)
  dot(21, 16, 1, 42, 36, 84)
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}
