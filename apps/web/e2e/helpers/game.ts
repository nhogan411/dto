import { type Page } from '@playwright/test';

interface GameSetupResult {
  gameId: number;
  accessTokenA: string;
  accessTokenB: string;
}

export async function setupActiveGame(
  pageA: Page,
  pageB: Page,
  emailA: string,
  emailB: string,
): Promise<GameSetupResult> {
  const baseURL = 'http://localhost:4000';

  const loginA = await pageA.request.post(`${baseURL}/login`, {
    data: { email: emailA, password: 'Passw0rd' },
  });
  const { access_token: accessTokenA } = (await loginA.json()).data;

  const loginB = await pageB.request.post(`${baseURL}/login`, {
    data: { email: emailB, password: 'Passw0rd' },
  });
  const { access_token: accessTokenB, user: userB } = (await loginB.json()).data;

  const createGameRes = await pageA.request.post(`${baseURL}/games`, {
    headers: { Authorization: `Bearer ${accessTokenA}` },
    data: { challenged_id: userB.id },
  });
  const gameId = (await createGameRes.json()).data.game.id;

  await pageB.request.patch(`${baseURL}/games/${gameId}/accept`, {
    headers: { Authorization: `Bearer ${accessTokenB}` },
    data: {},
  });

  const playerAChars = await pageA.request.get(`${baseURL}/player_characters`, {
    headers: { Authorization: `Bearer ${accessTokenA}` },
  });
  const charsA = (await playerAChars.json()).data.slice(0, 2).map((c: { id: number }) => c.id);

  await pageA.request.post(`${baseURL}/games/${gameId}/select_characters`, {
    headers: { Authorization: `Bearer ${accessTokenA}` },
    data: { player_character_ids: charsA },
  });

  const playerBChars = await pageB.request.get(`${baseURL}/player_characters`, {
    headers: { Authorization: `Bearer ${accessTokenB}` },
  });
  const charsB = (await playerBChars.json()).data.slice(0, 2).map((c: { id: number }) => c.id);

  await pageB.request.post(`${baseURL}/games/${gameId}/select_characters`, {
    headers: { Authorization: `Bearer ${accessTokenB}` },
    data: { player_character_ids: charsB },
  });

  await pageA.request.patch(`${baseURL}/games/${gameId}/choose_position`, {
    headers: { Authorization: `Bearer ${accessTokenA}` },
    data: { starting_position_index: 0 },
  });

  await pageB.request.patch(`${baseURL}/games/${gameId}/choose_position`, {
    headers: { Authorization: `Bearer ${accessTokenB}` },
    data: { starting_position_index: 1 },
  });

  return { gameId, accessTokenA, accessTokenB };
}
