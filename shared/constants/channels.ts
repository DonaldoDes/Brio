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
    DELETE: 'notes:delete',
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
} as const

export type IPCChannel =
  | (typeof IPC_CHANNELS.NOTES)[keyof typeof IPC_CHANNELS.NOTES]
  | (typeof IPC_CHANNELS.LINKS)[keyof typeof IPC_CHANNELS.LINKS]
  | (typeof IPC_CHANNELS.WINDOW)[keyof typeof IPC_CHANNELS.WINDOW]
