import {
  LuArrowRight,
  LuBook,
  LuChartLine,
  LuCheck,
  LuClock,
  LuMusic,
  LuPlay,
  LuSettings,
} from 'react-icons/lu';

const icons = {
  note: LuMusic,
  play: LuPlay,
  chart: LuChartLine,
  settings: LuSettings,
  arrow: LuArrowRight,
  check: LuCheck,
  clock: LuClock,
  book: LuBook,
};

export type IconName = keyof typeof icons;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const Glyph = icons[name];
  return <Glyph size={size} aria-hidden />;
}
