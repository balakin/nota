import {
  LuArrowRight,
  LuBook,
  LuChartLine,
  LuCheck,
  LuClock,
  LuLock,
  LuMusic,
  LuPlay,
  LuSettings,
} from 'react-icons/lu';
import { SiGithub } from 'react-icons/si';

const icons = {
  note: LuMusic,
  play: LuPlay,
  chart: LuChartLine,
  settings: LuSettings,
  arrow: LuArrowRight,
  check: LuCheck,
  clock: LuClock,
  lock: LuLock,
  book: LuBook,
  github: SiGithub,
};

export type IconName = keyof typeof icons;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const Glyph = icons[name];
  return <Glyph size={size} aria-hidden />;
}
