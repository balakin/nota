export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function formatResponse(
  ms: number | null,
  lessSecond = '< 1s',
  secondUnit = 's',
): string {
  if (ms === null) return '—';
  return ms < 1000 ? lessSecond : `${(ms / 1000).toFixed(1)}${secondUnit}`;
}
