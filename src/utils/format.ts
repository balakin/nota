export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes)}:${String(rest).padStart(2, '0')}`;
}

/** Long spans read as hours; mm:ss stops being legible well before a month of practice. */
export function formatSpan(
  seconds: number,
  hourUnit = 'h',
  minuteUnit = 'm',
): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${String(minutes)}${minuteUnit}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${String(hours)}${hourUnit}`
    : `${String(hours)}${hourUnit} ${String(rest)}${minuteUnit}`;
}

export function formatResponse(
  ms: number | null,
  lessSecond = '< 1s',
  secondUnit = 's',
): string {
  if (ms === null) return '—';
  return ms < 1000 ? lessSecond : `${(ms / 1000).toFixed(1)}${secondUnit}`;
}
