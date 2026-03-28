/**
 * Calculate the movement budget for a character based on their stats.
 * Uses the 'movement' stat if available and valid, otherwise returns fallback of 3.
 */
export const getMoveBudget = (character: { stats: Record<string, unknown> }): number => {
  const moveStat = Number(character.stats.movement);
  if (Number.isFinite(moveStat) && moveStat > 0) {
    return Math.floor(moveStat);
  }
  return 3;
};
