declare module '@rails/actioncable' {
  export interface Subscription {
    unsubscribe(): void;
  }

  export interface SubscriptionCallbacks {
    connected?(): void;
    disconnected?(): void;
    rejected?(): void;
    received?(data: unknown): void;
  }

  export interface SubscriptionCollection {
    create(identifier: Record<string, unknown>, callbacks: SubscriptionCallbacks): Subscription;
  }

  export interface Consumer {
    subscriptions: SubscriptionCollection;
    disconnect(): void;
  }

  export function createConsumer(url?: string): Consumer;
}
