export function Icon({
  name,
  size = 20,
}: {
  name: 'note' | 'play' | 'chart' | 'settings' | 'arrow' | 'check' | 'clock' | 'book';
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'note')
    return (
      <svg {...common}>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    );
  if (name === 'play')
    return (
      <svg {...common}>
        <path d="m8 5 11 7-11 7V5Z" />
      </svg>
    );
  if (name === 'chart')
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </svg>
    );
  if (name === 'settings')
    return (
      <svg {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path
          d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.3a2 2 0 1 1-4 0v-.2a2 2 0 0 0-3.4-1.5l-.1.1A2 2 0 1 1 3 15.1l.1-.1A2 2 0 0 0 1.6 11.6h-.2a2 2 0 1 1 0-4h.2A2 2 0 0 0 3 4.2L2.9 4A2 2 0 1 1 5.7 1.2l.1.1A2 2 0 0 0 9.2 0h.2a2 2 0 1 1 4 0v.2a2 2 0 0 0 3.4 1.1l.1-.1A2 2 0 1 1 19.7 4l-.1.1A2 2 0 0 0 21 7.5h.2a2 2 0 1 1 0 4H21a2 2 0 0 0-1.6 3.5Z"
          transform="translate(1 1) scale(.92)"
        />
      </svg>
    );
  if (name === 'arrow')
    return (
      <svg {...common}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  if (name === 'check')
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  if (name === 'clock')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z" />
      <path d="M7 4v16M8 8h8M8 12h6" />
    </svg>
  );
}
