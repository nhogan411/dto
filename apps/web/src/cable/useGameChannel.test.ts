import { createElement } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cableMocks = vi.hoisted(() => ({
  createConsumer: vi.fn(),
  subscriptionsCreate: vi.fn(),
  disconnect: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@rails/actioncable', () => ({
  createConsumer: cableMocks.createConsumer,
}));

function HookHarness({
  gameId,
  onMessage,
  useGameChannel,
}: {
  gameId: number | null;
  onMessage: (data: unknown) => void;
  useGameChannel: (gameId: number | null, onMessage: (data: unknown) => void) => void;
}) {
  useGameChannel(gameId, onMessage);
  return null;
}

describe('useGameChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    cableMocks.createConsumer.mockReturnValue({
      subscriptions: {
        create: cableMocks.subscriptionsCreate,
      },
      disconnect: cableMocks.disconnect,
    });

    cableMocks.subscriptionsCreate.mockReturnValue({
      unsubscribe: cableMocks.unsubscribe,
    });
  });

  it('subscribes with the game id, forwards messages, and unsubscribes on unmount', async () => {
    localStorage.setItem('accessToken', 'test-token');
    vi.resetModules();

    const { useGameChannel } = await import('./useGameChannel');
    const onMessage = vi.fn();
    const { unmount } = render(
      createElement(HookHarness, { gameId: 42, onMessage, useGameChannel }),
    );

    expect(cableMocks.createConsumer).toHaveBeenCalledWith(
      'ws://localhost:4000/cable?token=test-token',
    );
    expect(cableMocks.subscriptionsCreate).toHaveBeenCalledWith(
      { channel: 'GameChannel', game_id: 42 },
      expect.objectContaining({ received: expect.any(Function) }),
    );

    const [, callbacks] = cableMocks.subscriptionsCreate.mock.calls[0];
    callbacks.received({ event: 'game_updated', data: { game_id: 42 } });

    expect(onMessage).toHaveBeenCalledWith({ event: 'game_updated', data: { game_id: 42 } });

    unmount();

    expect(cableMocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('resubscribes when the game id changes', async () => {
    vi.resetModules();
    const { useGameChannel } = await import('./useGameChannel');

    const { rerender } = render(
      createElement(HookHarness, { gameId: 7, onMessage: vi.fn(), useGameChannel }),
    );

    rerender(createElement(HookHarness, { gameId: 8, onMessage: vi.fn(), useGameChannel }));

    expect(cableMocks.subscriptionsCreate).toHaveBeenCalledTimes(2);
    expect(cableMocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(cableMocks.subscriptionsCreate).toHaveBeenLastCalledWith(
      { channel: 'GameChannel', game_id: 8 },
      expect.objectContaining({ received: expect.any(Function) }),
    );
  });

  it('does not subscribe when no game id is provided', async () => {
    vi.resetModules();
    const { useGameChannel } = await import('./useGameChannel');

    render(createElement(HookHarness, { gameId: null, onMessage: vi.fn(), useGameChannel }));

    expect(cableMocks.subscriptionsCreate).not.toHaveBeenCalled();
  });
});
