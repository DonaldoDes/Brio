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
} as const

export type IPCChannel = (typeof IPC_CHANNELS.NOTES)[keyof typeof IPC_CHANNELS.NOTES]
