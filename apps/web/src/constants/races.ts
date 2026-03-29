export interface RaceOption {
  value: string;
  label: string;
  flavor: string;
  statBonuses: string;
}

export const RACE_OPTIONS: RaceOption[] = [
  { value: 'human',    label: 'Human',    flavor: 'Adaptable and ambitious.',    statBonuses: '+1 all stats' },
  { value: 'elf',      label: 'Elf',      flavor: 'Graceful and keen-eyed.',     statBonuses: '+2 DEX' },
  { value: 'dwarf',    label: 'Dwarf',    flavor: 'Tough and tireless.',         statBonuses: '+2 CON' },
  { value: 'halfling', label: 'Halfling', flavor: 'Lucky and nimble.',           statBonuses: '+2 DEX' },
  { value: 'gnome',    label: 'Gnome',    flavor: 'Curious and inventive.',      statBonuses: '+2 INT' },
  { value: 'half_elf', label: 'Half-Elf', flavor: 'Charming and versatile.',     statBonuses: '+2 CHA' },
  { value: 'half_orc', label: 'Half-Orc', flavor: 'Fierce and resilient.',       statBonuses: '+2 STR, +1 CON' },
  { value: 'tiefling', label: 'Tiefling', flavor: 'Cunning and infernal.',       statBonuses: '+2 CHA, +1 INT' },
];

export const RACE_LABELS: Record<string, string> = Object.fromEntries(
  RACE_OPTIONS.map(r => [r.value, r.label])
);
