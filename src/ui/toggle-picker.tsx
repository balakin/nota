export function TogglePicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <div className="segmented">
        {options.map(([key, text]) => (
          <button
            type="button"
            key={key}
            className={key === value ? 'selected' : ''}
            aria-pressed={key === value}
            onClick={() => onChange(key)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
