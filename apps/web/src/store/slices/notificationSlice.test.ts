import { describe, expect, it } from 'vitest';
import notificationReducer, {
  addFriendRequestAcceptedNotification,
  addFriendRequestNotification,
  addGameInvitation,
  markAllRead,
  markYourTurn,
} from './notificationSlice';

describe('notificationSlice', () => {
  it('adds a game invitation notification', () => {
    const state = notificationReducer(
      undefined,
      addGameInvitation({ gameId: 12, challengerUsername: 'alice' }),
    );

    expect(state.count).toBe(1);
    expect(state.notifications[0]).toMatchObject({
      type: 'game_invitation',
      gameId: 12,
      message: 'alice invited you to a game.',
      read: false,
    });
    expect(typeof state.notifications[0].id).toBe('string');
    expect(typeof state.notifications[0].createdAt).toBe('string');
  });

  it('adds a friend request notification', () => {
    const state = notificationReducer(
      undefined,
      addFriendRequestNotification({ friendshipId: 44, requesterUsername: 'bob' }),
    );

    expect(state.count).toBe(1);
    expect(state.notifications[0]).toMatchObject({
      type: 'friend_request',
      friendshipId: 44,
      message: 'bob sent you a friend request.',
      read: false,
    });
  });

  it('adds a your turn notification', () => {
    const state = notificationReducer(undefined, markYourTurn({ gameId: 99 }));

    expect(state.count).toBe(1);
    expect(state.notifications[0]).toMatchObject({
      type: 'your_turn',
      gameId: 99,
      message: "It's your turn in game #99.",
      read: false,
    });
  });

  it('adds a friend request accepted notification', () => {
    const state = notificationReducer(
      undefined,
      addFriendRequestAcceptedNotification({ accepterUsername: 'charlie', friendshipId: 7 }),
    );

    expect(state.count).toBe(1);
    expect(state.notifications[0]).toMatchObject({
      type: 'friend_request_accepted',
      friendshipId: 7,
      message: 'charlie accepted your friend request.',
    });
  });

  it('marks all notifications as read and resets count', () => {
    const withNotifications = notificationReducer(
      notificationReducer(undefined, addGameInvitation({ gameId: 5, challengerUsername: 'delta' })),
      addFriendRequestNotification({ friendshipId: 3, requesterUsername: 'echo' }),
    );

    const state = notificationReducer(withNotifications, markAllRead());

    expect(state.count).toBe(0);
    expect(state.notifications.every((notification) => notification.read)).toBe(true);
  });
});
