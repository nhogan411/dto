export const ICON_EMOJI: Record<string, string> = {
  warrior: '⚔️',
  scout: '🏹',
};

export const CHARACTER_ICONS = Object.keys(ICON_EMOJI) as (keyof typeof ICON_EMOJI)[];
