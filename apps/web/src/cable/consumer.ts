import { createConsumer, type Consumer } from '@rails/actioncable';

const CABLE_URL = 'ws://localhost:4000/cable';

let cableConsumer: Consumer | null = null;
let currentToken: string | null = null;

const getStoredAccessToken = () =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

const buildCableUrl = (token: string | null) =>
  `${CABLE_URL}?token=${encodeURIComponent(token ?? '')}`;

export function getCableConsumer() {
  const nextToken = getStoredAccessToken();

  if (cableConsumer && currentToken !== nextToken) {
    cableConsumer.disconnect();
    cableConsumer = null;
  }

  if (!cableConsumer) {
    currentToken = nextToken;
    cableConsumer = createConsumer(buildCableUrl(nextToken));
  }

  return cableConsumer;
}
