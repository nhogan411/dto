import { RACE_OPTIONS } from '../../constants/races';

interface RacePickerProps {
  value: string;
  onChange: (race: string) => void;
  disabled?: boolean;
}

export function RacePicker({ value, onChange, disabled }: RacePickerProps) {
  return (
    <div role="radiogroup" aria-label="Character race" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {RACE_OPTIONS.map((race) => {
        const isSelected = value === race.value;
        return (
          <button
            key={race.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(race.value)}
            className={`
              focus-ring flex flex-col gap-1 p-4 rounded-lg border-2 text-left transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-700'}
              ${isSelected ? 'border-purple-500 bg-neutral-700' : 'border-neutral-600 bg-neutral-800'}
            `}
          >
            <div className={`text-base font-bold ${isSelected ? 'text-purple-400' : 'text-white'}`}>
              {race.label}
            </div>
            <div className="text-xs text-neutral-400">{race.flavor}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{race.statBonuses}</div>
          </button>
        );
      })}
    </div>
  );
}
