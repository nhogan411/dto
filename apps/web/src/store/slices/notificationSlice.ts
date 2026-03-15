import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type NotificationType =
  | 'game_invitation'
  | 'friend_request'
  | 'your_turn'
  | 'friend_request_accepted';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  gameId?: number;
  friendshipId?: number;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  count: number;
}

const initialState: NotificationState = {
  notifications: [],
  count: 0,
};

const buildNotification = (
  notification: Omit<Notification, 'id' | 'read' | 'createdAt'> &
    Partial<Pick<Notification, 'id' | 'read' | 'createdAt'>>,
): Notification => ({
  id: notification.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  type: notification.type,
  message: notification.message,
  gameId: notification.gameId,
  friendshipId: notification.friendshipId,
  read: notification.read ?? false,
  createdAt: notification.createdAt ?? new Date().toISOString(),
});

const syncCount = (state: NotificationState) => {
  state.count = state.notifications.filter((notification) => !notification.read).length;
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      syncCount(state);
    },
    addGameInvitation: (
      state,
      action: PayloadAction<{ gameId: number; challengerUsername: string }>,
    ) => {
      state.notifications.unshift(
        buildNotification({
          type: 'game_invitation',
          message: `${action.payload.challengerUsername} invited you to a game.`,
          gameId: action.payload.gameId,
        }),
      );
      syncCount(state);
    },
    addFriendRequestNotification: (
      state,
      action: PayloadAction<{ friendshipId: number; requesterUsername: string }>,
    ) => {
      state.notifications.unshift(
        buildNotification({
          type: 'friend_request',
          message: `${action.payload.requesterUsername} sent you a friend request.`,
          friendshipId: action.payload.friendshipId,
        }),
      );
      syncCount(state);
    },
    addFriendRequestAcceptedNotification: (
      state,
      action: PayloadAction<{ friendshipId?: number; accepterUsername: string }>,
    ) => {
      state.notifications.unshift(
        buildNotification({
          type: 'friend_request_accepted',
          message: `${action.payload.accepterUsername} accepted your friend request.`,
          friendshipId: action.payload.friendshipId,
        }),
      );
      syncCount(state);
    },
    markYourTurn: (state, action: PayloadAction<{ gameId: number }>) => {
      state.notifications.unshift(
        buildNotification({
          type: 'your_turn',
          message: `It's your turn in game #${action.payload.gameId}.`,
          gameId: action.payload.gameId,
        }),
      );
      syncCount(state);
    },
    dismissNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload,
      );
      syncCount(state);
    },
    markAllRead: (state) => {
      state.notifications.forEach((notification) => {
        notification.read = true;
      });
      syncCount(state);
    },
  },
});

export const {
  addNotification,
  addGameInvitation,
  addFriendRequestNotification,
  addFriendRequestAcceptedNotification,
  markYourTurn,
  dismissNotification,
  markAllRead,
} = notificationSlice.actions;
export default notificationSlice.reducer;
