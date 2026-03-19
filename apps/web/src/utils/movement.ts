export interface Coordinate {
  x: number;
  y: number;
}

export interface ReachableSquaresInput {
  origin: Coordinate;
  moveBudget: number;
  boardTiles: Array<Array<{ type: string }>>;
  characters: Array<{ id: number; userId: number; position: Coordinate; alive?: boolean; currentHp?: number }>;
  currentUserId: number;
  boardMin?: number;
  boardMax?: number;
}

interface QueueNode {
  x: number;
  y: number;
  distance: number;
}

const DEFAULT_BOARD_MIN = 1;
const DEFAULT_BOARD_MAX = 12;

const toKey = (x: number, y: number) => `${x},${y}`;

const normalizeMoveBudget = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const isWithinBounds = (x: number, y: number, boardMin: number, boardMax: number): boolean =>
  x >= boardMin && x <= boardMax && y >= boardMin && y <= boardMax;

const buildImpassableSets = (
  origin: Coordinate,
  boardTiles: Array<Array<{ type: string }>>,
  characters: Array<{ id: number; userId: number; position: Coordinate; alive?: boolean; currentHp?: number }>,
  currentUserId: number,
) => {
  // Derive blocked from tile types
  const impassable = new Set<string>();
  for (let row = 0; row < boardTiles.length; row++) {
    for (let col = 0; col < (boardTiles[row]?.length ?? 0); col++) {
      if (boardTiles[row][col]?.type === 'blocked') {
        impassable.add(toKey(col + 1, row + 1)); // position x=col+1, y=row+1
      }
    }
  }

  // endBlocked = all alive non-self characters' positions (allies + opponents cannot be endpoints)
  const endBlocked = new Set<string>();
  // impassable also includes opponents (cannot traverse through)
  for (const char of characters) {
    const isAlive = char.alive !== false && (char.currentHp === undefined || char.currentHp > 0);
    const charKey = toKey(char.position.x, char.position.y);
    if (charKey === toKey(origin.x, origin.y)) continue; // skip self
    if (isAlive) {
      endBlocked.add(charKey);
      if (char.userId !== currentUserId) {
        // Opponent: also impassable mid-path
        impassable.add(charKey);
      }
      // Ally: only endBlocked (can be traversed mid-path)
    }
  }

  return { impassable, endBlocked };
};

export const getReachableSquares = ({
  origin,
  moveBudget,
  boardTiles,
  characters,
  currentUserId,
  boardMin = DEFAULT_BOARD_MIN,
  boardMax = DEFAULT_BOARD_MAX,
}: ReachableSquaresInput): Coordinate[] => {
  const budget = normalizeMoveBudget(moveBudget);
  if (budget === 0) return [];

  const { impassable, endBlocked } = buildImpassableSets(origin, boardTiles, characters, currentUserId);

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  const queue: QueueNode[] = [{ x: origin.x, y: origin.y, distance: 0 }];
  const visited = new Set<string>([toKey(origin.x, origin.y)]);
  const reachable: Coordinate[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current.distance >= budget) continue;

    for (const { dx, dy } of directions) {
      const nextX = current.x + dx;
      const nextY = current.y + dy;
      const nextKey = toKey(nextX, nextY);

      if (!isWithinBounds(nextX, nextY, boardMin, boardMax)) continue;
      if (visited.has(nextKey)) continue;
      if (impassable.has(nextKey)) continue;

      visited.add(nextKey);
      if (!endBlocked.has(nextKey)) {
        reachable.push({ x: nextX, y: nextY });
      }
      queue.push({ x: nextX, y: nextY, distance: current.distance + 1 });
    }
  }

  return reachable;
};

export const getShortestPathToTarget = ({
  origin,
  target,
  moveBudget,
  boardTiles,
  characters,
  currentUserId,
  boardMin = DEFAULT_BOARD_MIN,
  boardMax = DEFAULT_BOARD_MAX,
}: ReachableSquaresInput & { target: Coordinate }): Coordinate[] | null => {
  const budget = normalizeMoveBudget(moveBudget);
  if (budget === 0) return null;
  if (origin.x === target.x && origin.y === target.y) return [];
  if (!isWithinBounds(target.x, target.y, boardMin, boardMax)) return null;

  const { impassable, endBlocked } = buildImpassableSets(origin, boardTiles, characters, currentUserId);
  const targetKey = toKey(target.x, target.y);

  if (impassable.has(targetKey) || endBlocked.has(targetKey)) {
    return null;
  }

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  const queue: QueueNode[] = [{ x: origin.x, y: origin.y, distance: 0 }];
  const visited = new Set<string>([toKey(origin.x, origin.y)]);
  const parents = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const currentKey = toKey(current.x, current.y);
    if (currentKey === targetKey) {
      const path: Coordinate[] = [];
      let stepKey: string | undefined = targetKey;

      while (stepKey && stepKey !== toKey(origin.x, origin.y)) {
        const [stepX, stepY] = stepKey.split(',').map(Number);
        path.push({ x: stepX, y: stepY });
        stepKey = parents.get(stepKey);
      }

      return path.reverse();
    }

    if (current.distance >= budget) continue;

    for (const { dx, dy } of directions) {
      const nextX = current.x + dx;
      const nextY = current.y + dy;
      const nextKey = toKey(nextX, nextY);

      if (!isWithinBounds(nextX, nextY, boardMin, boardMax)) continue;
      if (visited.has(nextKey)) continue;
      if (impassable.has(nextKey)) continue;

      visited.add(nextKey);
      parents.set(nextKey, currentKey);
      queue.push({ x: nextX, y: nextY, distance: current.distance + 1 });
    }
  }

  return null;
};
