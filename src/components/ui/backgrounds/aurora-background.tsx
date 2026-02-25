import { cn } from '@/lib/utils';

interface Props {
  settings: Record<string, unknown>;
}

export default function AuroraBackground({ settings }: Props) {
  const showRadialGradient = (settings.showRadialGradient as boolean) ?? true;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={
        {
          '--aurora':
            'repeating-linear-gradient(100deg,#3b82f6_10%,#a5b4fc_15%,#93c5fd_20%,#ddd6fe_25%,#60a5fa_30%)',
          '--dark-gradient':
            'repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)',
          '--transparent': 'transparent',
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          `pointer-events-none absolute -inset-[10px] opacity-50 blur-[10px] will-change-transform after:animate-aurora`,
          `[background-image:var(--dark-gradient),var(--aurora)] [background-position:50%_50%,50%_50%] [background-size:300%,_200%]`,
          `after:absolute after:inset-0 after:mix-blend-difference after:content-[""] after:[background-attachment:fixed] after:[background-image:var(--dark-gradient),var(--aurora)] after:[background-size:200%,_100%]`,
          showRadialGradient &&
            `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`,
        )}
      />
    </div>
  );
}
