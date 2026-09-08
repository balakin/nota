import { Icon } from '../ui/icon';

export function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: 'play' | 'book' | 'chart' | 'settings';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={icon} size={17} />
      <span>{label}</span>
    </button>
  );
}
