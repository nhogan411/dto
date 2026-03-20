export const ICON_EMOJI: Record<string, string> = {
  warrior: '⚔️',
  rogue: '🗡️',
  mage: '🔮',
  archer: '🏹',
  paladin: '🛡️',
  ranger: '🌿',
};

export const CHARACTER_ICONS = Object.keys(ICON_EMOJI) as (keyof typeof ICON_EMOJI)[];
