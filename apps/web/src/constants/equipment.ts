export const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  shortsword: 'Shortsword',
};

export function getEquipmentDisplayName(slug: string | undefined): string | null {
  if (!slug) return null;
  return EQUIPMENT_DISPLAY_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}