import { socketManager } from './socket/socketManager';

export const socketService = {
  getSocket: () => socketManager.connect(),
  updateAuthToken: (token: string) => socketManager.updateAuthToken(token),
  joinFrequency: (code: string, onUsersUpdate?: any) => socketManager.joinFrequency(code, onUsersUpdate),
  leaveFrequency: (code: string) => socketManager.leaveFrequency(code),
  disconnect: () => socketManager.disconnect(),
};
