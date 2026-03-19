const AVAILABLE_ICONS = ['warrior', 'rogue', 'mage', 'archer', 'paladin', 'ranger'];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
      {AVAILABLE_ICONS.map((icon) => {
        const isSelected = value === icon;
        return (
          <button
            key={icon}
            type="button"
            disabled={disabled}
            onClick={() => onChange(icon)}
            className={`
              focus-ring flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-800'}
              ${isSelected ? 'border-green-500 bg-neutral-800' : 'border-neutral-700 bg-neutral-900'}
            `}
          >
            <span className={`text-sm font-medium capitalize ${isSelected ? 'text-green-500' : 'text-neutral-300'}`}>
              {icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
