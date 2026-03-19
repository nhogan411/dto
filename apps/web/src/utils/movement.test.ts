import { describe, expect, it } from 'vitest';
import { getReachableSquares, getShortestPathToTarget } from './movement';

const sortSquares = (squares: { x: number; y: number }[]) =>
  [...squares].sort((a, b) => (a.y - b.y) || (a.x - b.x));

const makeOpenBoard = (rows = 12, cols = 12) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: 'open' }))
  );

const makeBoardWithBlocked = (blockedPositions: [number, number][]) => {
  const board = makeOpenBoard();
  for (const [x, y] of blockedPositions) {
    board[y - 1][x - 1] = { type: 'blocked' };
  }
  return board;
};

describe('getReachableSquares', () => {
  it('returns cardinal BFS reachability within move budget', () => {
    const reachable = getReachableSquares({
      origin: { x: 6, y: 6 },
      moveBudget: 2,
      boardTiles: makeOpenBoard(),
      characters: [],
      currentUserId: 1,
    });

    expect(sortSquares(reachable)).toEqual(sortSquares([
      { x: 5, y: 6 },
      { x: 7, y: 6 },
      { x: 6, y: 5 },
      { x: 6, y: 7 },
      { x: 4, y: 6 },
      { x: 8, y: 6 },
      { x: 6, y: 4 },
      { x: 6, y: 8 },
      { x: 5, y: 5 },
      { x: 7, y: 5 },
      { x: 5, y: 7 },
      { x: 7, y: 7 },
    ]));
  });

  it('respects blocked and occupied impassable squares', () => {
    const reachable = getReachableSquares({
      origin: { x: 2, y: 2 },
      moveBudget: 3,
      boardTiles: makeBoardWithBlocked([[3, 2], [2, 3]]),
      characters: [
        { id: 1, userId: 2, position: { x: 1, y: 2 }, alive: true, currentHp: 10 },
      ],
      currentUserId: 1,
    });

    expect(sortSquares(reachable)).toEqual(sortSquares([
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ]));

    expect(reachable).not.toContainEqual({ x: 3, y: 2 });
    expect(reachable).not.toContainEqual({ x: 2, y: 3 });
    expect(reachable).not.toContainEqual({ x: 1, y: 2 });
  });

  it('enforces 12x12 board boundaries', () => {
    const reachable = getReachableSquares({
      origin: { x: 1, y: 1 },
      moveBudget: 3,
      boardTiles: makeOpenBoard(),
      characters: [],
      currentUserId: 1,
    });

    expect(reachable.every(({ x, y }) => x >= 1 && y >= 1 && x <= 12 && y <= 12)).toBe(true);
    expect(reachable).not.toContainEqual({ x: 0, y: 1 });
    expect(reachable).not.toContainEqual({ x: 1, y: 0 });
  });

  it('treats non-positive move budget as no movement', () => {
    expect(getReachableSquares({
      origin: { x: 6, y: 6 },
      moveBudget: 0,
      boardTiles: makeOpenBoard(),
      characters: [],
      currentUserId: 1,
    })).toEqual([]);

    expect(getReachableSquares({
      origin: { x: 6, y: 6 },
      moveBudget: -2,
      boardTiles: makeOpenBoard(),
      characters: [],
      currentUserId: 1,
    })).toEqual([]);
  });

  it('allows passing through an ally mid-path', () => {
    const reachable = getReachableSquares({
      origin: { x: 4, y: 1 },
      moveBudget: 3,
      boardTiles: makeOpenBoard(),
      characters: [
        { id: 2, userId: 1, position: { x: 5, y: 1 }, alive: true, currentHp: 10 },
      ],
      currentUserId: 1,
    });

    expect(reachable).toContainEqual({ x: 6, y: 1 });
    expect(reachable).not.toContainEqual({ x: 5, y: 1 });
  });

  it('blocks ending on an ally tile', () => {
    const reachable = getReachableSquares({
      origin: { x: 4, y: 1 },
      moveBudget: 3,
      boardTiles: makeOpenBoard(),
      characters: [
        { id: 2, userId: 1, position: { x: 5, y: 1 }, alive: true, currentHp: 10 },
      ],
      currentUserId: 1,
    });

    expect(reachable).not.toContainEqual({ x: 5, y: 1 });
  });

  it('blocks traversal through an opponent mid-path', () => {
    const reachable = getReachableSquares({
      origin: { x: 4, y: 1 },
      moveBudget: 3,
      boardTiles: makeOpenBoard(),
      characters: [
        { id: 2, userId: 2, position: { x: 5, y: 1 }, alive: true, currentHp: 10 },
      ],
      currentUserId: 1,
    });

    expect(reachable).not.toContainEqual({ x: 6, y: 1 });
    expect(reachable).not.toContainEqual({ x: 5, y: 1 });
  });

  it('returns shortest cardinal path to a target square', () => {
    const path = getShortestPathToTarget({
      origin: { x: 2, y: 2 },
      target: { x: 4, y: 2 },
      moveBudget: 4,
      boardTiles: makeOpenBoard(),
      characters: [],
      currentUserId: 1,
    });

    expect(path).toEqual([
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]);
  });

  it('returns null when target is unreachable within budget or blocked', () => {
    const outOfBudget = getShortestPathToTarget({
      origin: { x: 2, y: 2 },
      target: { x: 5, y: 2 },
      moveBudget: 2,
      boardTiles: makeOpenBoard(),
      characters: [],
      currentUserId: 1,
    });

    const blockedTarget = getShortestPathToTarget({
      origin: { x: 2, y: 2 },
      target: { x: 3, y: 2 },
      moveBudget: 2,
      boardTiles: makeBoardWithBlocked([[3, 2]]),
      characters: [],
      currentUserId: 1,
    });

    expect(outOfBudget).toBeNull();
    expect(blockedTarget).toBeNull();
  });

  it('getShortestPathToTarget returns null when target is occupied', () => {
    const path = getShortestPathToTarget({
      origin: { x: 4, y: 1 },
      target: { x: 5, y: 1 },
      moveBudget: 3,
      boardTiles: makeOpenBoard(),
      characters: [
        { id: 2, userId: 2, position: { x: 5, y: 1 }, alive: true, currentHp: 10 },
      ],
      currentUserId: 1,
    });

    expect(path).toBeNull();
  });
});
