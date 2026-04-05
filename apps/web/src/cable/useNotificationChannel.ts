import { useEffect, useRef } from 'react';
import type { Subscription } from '@rails/actioncable';
import { getCableConsumer } from './consumer';

export function useNotificationChannel<T = unknown>(onMessage: (data: T) => void) {
  const messageHandlerRef = useRef(onMessage);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const subscription: Subscription = getCableConsumer().subscriptions.create(
      { channel: 'NotificationChannel' },
      {
        received: (data) => {
          messageHandlerRef.current(data as T);
        },
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
