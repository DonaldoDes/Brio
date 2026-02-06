/**
 * IPC Channel Names
 *
 * Single source of truth for IPC communication
 */

export const IPC_CHANNELS = {
  NOTES: {
    CREATE: 'notes:create',
    GET: 'notes:get',
    GET_ALL: 'notes:getAll',
    UPDATE: 'notes:update',
    UPDATE_TYPE: 'notes:updateType',
    DELETE: 'notes:delete',
    SEARCH: 'notes:search',
  },
  LINKS: {
    CREATE: 'links:create',
    GET_OUTGOING: 'links:getOutgoing',
    GET_BACKLINKS: 'links:getBacklinks',
    UPDATE_ON_RENAME: 'links:updateOnRename',
    MARK_BROKEN: 'links:markBroken',
    DELETE_BY_NOTE: 'links:deleteByNote',
  },
  WINDOW: {
    OPEN_NOTE: 'window:openNote',
  },
  TAGS: {
    GET_ALL: 'tags:getAll',
    GET_BY_NOTE: 'tags:getByNote',
    GET_NOTES_BY_TAG: 'tags:getNotesByTag',
  },
  TASKS: {
    GET_ALL: 'tasks:getAll',
    GET_BY_NOTE: 'tasks:getByNote',
    GET_BY_STATUS: 'tasks:getByStatus',
  },
  QUICK_CAPTURE: {
    SAVE: 'quickCapture:save',
    GET_HISTORY: 'quickCapture:getHistory',
  },
  THEME: {
    GET: 'theme:get',
    SET: 'theme:set',
    GET_SYSTEM_THEME: 'theme:getSystemTheme',
  },
} as const

export type IPCChannel =
  | (typeof IPC_CHANNELS.NOTES)[keyof typeof IPC_CHANNELS.NOTES]
  | (typeof IPC_CHANNELS.LINKS)[keyof typeof IPC_CHANNELS.LINKS]
  | (typeof IPC_CHANNELS.WINDOW)[keyof typeof IPC_CHANNELS.WINDOW]
  | (typeof IPC_CHANNELS.TAGS)[keyof typeof IPC_CHANNELS.TAGS]
  | (typeof IPC_CHANNELS.TASKS)[keyof typeof IPC_CHANNELS.TASKS]
  | (typeof IPC_CHANNELS.QUICK_CAPTURE)[keyof typeof IPC_CHANNELS.QUICK_CAPTURE]
  | (typeof IPC_CHANNELS.THEME)[keyof typeof IPC_CHANNELS.THEME]
