import { useEffect, useRef } from 'react';
import type { Subscription } from '@rails/actioncable';
import { getCableConsumer } from './consumer';

export function useGameChannel(gameId: number | null, onMessage: (data: any) => void) {
  const messageHandlerRef = useRef(onMessage);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (gameId === null) {
      return;
    }

    const subscription: Subscription = getCableConsumer().subscriptions.create(
      { channel: 'GameChannel', game_id: gameId },
      {
        received: (data) => {
          messageHandlerRef.current(data);
        },
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId]);
}
