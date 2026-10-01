/* The app mark: a sharp beside a note. The same drawing as public/favicon.svg, in a single ink that
   follows the text colour. */
export function BrandMark() {
  return (
    <span className="brand-mark">
      <svg viewBox="6.4 4.5 52 52" fill="currentColor" aria-hidden>
        <rect x="17" y="16" width="3.2" height="36" />
        <rect x="27" y="11" width="3.2" height="36" />
        <path d="M12 27.5 35 21v5.5L12 33zm0 14L35 35v5.5L12 47z" />
        <ellipse
          cx="45"
          cy="44"
          rx="7.8"
          ry="5.8"
          transform="rotate(-22 45 44)"
        />
        <rect x="49.4" y="13" width="3.4" height="30" />
      </svg>
    </span>
  );
}
