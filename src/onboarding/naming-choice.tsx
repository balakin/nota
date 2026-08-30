export function NamingChoice({
  selected,
  onClick,
  title,
  example,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  example: string;
}) {
  return (
    <button
      type="button"
      className={`choice-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="choice-radio" />{' '}
      <span>
        <strong>{title}</strong>
        <small>{example}</small>
      </span>
    </button>
  );
}
