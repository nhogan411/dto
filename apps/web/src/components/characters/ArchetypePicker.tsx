type Archetype = 'warrior' | 'scout';

interface ArchetypeOption {
  value: Archetype;
  label: string;
  flavor: string;
  hp: number;
  mov: number;
  str: number;
  dex: number;
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    value: 'warrior',
    label: 'Warrior',
    flavor: 'Tank. Slow and hard to kill.',
    hp: 16,
    mov: 3,
    str: 14,
    dex: 8,
  },
  {
    value: 'scout',
    label: 'Scout',
    flavor: 'Flanker. Fast and fragile.',
    hp: 10,
    mov: 5,
    str: 8,
    dex: 14,
  },
];

interface ArchetypePickerProps {
  value: Archetype;
  onChange: (archetype: Archetype) => void;
  disabled?: boolean;
}

export function ArchetypePicker({ value, onChange, disabled }: ArchetypePickerProps) {
  return (
    <div role="radiogroup" aria-label="Character archetype" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ARCHETYPES.map((archetype) => {
        const isSelected = value === archetype.value;
        return (
          <button
            key={archetype.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(archetype.value)}
            className={`
              focus-ring flex flex-col gap-3 p-5 rounded-lg border-2 text-left transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-700'}
              ${isSelected ? 'border-green-500 bg-neutral-700' : 'border-neutral-600 bg-neutral-800'}
            `}
          >
            <div>
              <div className={`text-lg font-bold ${isSelected ? 'text-green-400' : 'text-white'}`}>
                {archetype.label}
              </div>
              <div className="text-sm text-neutral-400 mt-0.5">{archetype.flavor}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-300">
              <span><span className="text-neutral-500">HP</span> {archetype.hp}</span>
              <span><span className="text-neutral-500">MOV</span> {archetype.mov}</span>
              <span><span className="text-neutral-500">STR</span> {archetype.str}</span>
              <span><span className="text-neutral-500">DEX</span> {archetype.dex}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
