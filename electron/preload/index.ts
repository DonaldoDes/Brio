import { ipcRenderer, contextBridge } from 'electron'
import type { BrioAPI } from '../../shared/types/api'
import { IPC_CHANNELS } from '../../shared/constants/channels'

console.log('[Preload] Script started')

// --------- Expose secure API to the Renderer process ---------
// This API uses contextBridge to safely expose IPC functionality
// without giving direct access to Node.js or Electron internals

const api: BrioAPI = {
  notes: {
    create: (title: string, slug: string, content: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTES.CREATE, title, slug, content),

    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTES.GET, id),

    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.NOTES.GET_ALL),

    update: (id: string, title: string, slug: string, content: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTES.UPDATE, id, title, slug, content),

    updateType: (id: string, type: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTES.UPDATE_TYPE, id, type),

    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTES.DELETE, id),

    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTES.SEARCH, query),
  },
  links: {
    create: (
      fromNoteId: string,
      toNoteId: string | null,
      toNoteTitle: string,
      alias: string | null,
      positionStart: number,
      positionEnd: number
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.LINKS.CREATE,
        fromNoteId,
        toNoteId,
        toNoteTitle,
        alias,
        positionStart,
        positionEnd
      ),

    getOutgoing: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.LINKS.GET_OUTGOING, noteId),

    getBacklinks: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.LINKS.GET_BACKLINKS, noteId),

    updateOnRename: (oldTitle: string, newTitle: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LINKS.UPDATE_ON_RENAME, oldTitle, newTitle),

    markBroken: (toNoteTitle: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LINKS.MARK_BROKEN, toNoteTitle),

    deleteByNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.LINKS.DELETE_BY_NOTE, noteId),
  },
  window: {
    openNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.OPEN_NOTE, noteId),
  },
  tags: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TAGS.GET_ALL),

    getByNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.TAGS.GET_BY_NOTE, noteId),

    getNotesByTag: (tag: string) => ipcRenderer.invoke(IPC_CHANNELS.TAGS.GET_NOTES_BY_TAG, tag),
  },
  tasks: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS.GET_ALL),

    getByNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.GET_BY_NOTE, noteId),

    getByStatus: (status: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.GET_BY_STATUS, status),
  },
  quickCapture: {
    save: (content: string) => ipcRenderer.invoke(IPC_CHANNELS.QUICK_CAPTURE.SAVE, content),

    getHistory: () => ipcRenderer.invoke(IPC_CHANNELS.QUICK_CAPTURE.GET_HISTORY),
  },
  theme: {
    getSystemTheme: () => ipcRenderer.invoke(IPC_CHANNELS.THEME.GET_SYSTEM_THEME),
  },
}

console.log('[Preload] Exposing API to main world')
contextBridge.exposeInMainWorld('api', api)
console.log('[Preload] API exposed successfully')

// --------- Legacy ipcRenderer exposure (for backward compatibility) ---------
// WARNING: This is less secure than the typed API above
// Consider removing this once all code uses window.api
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    ipcRenderer.on(channel, (event, ...args) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      listener(event, ...args)
    })
    return ipcRenderer
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    ipcRenderer.off(channel, ...omit)
    return ipcRenderer
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']): Promise<boolean> {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading(): { appendLoading: () => void; removeLoading: () => void } {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
void domReady().then(appendLoading)

window.onmessage = (ev) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (ev.data.payload === 'removeLoading') {
    removeLoading()
  }
}

setTimeout(removeLoading, 4999)
