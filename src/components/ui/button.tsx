import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Actions.
 *
 * The primary action carries the logo's cyan→violet sweep and the glow that
 * implies; everything else is a hairline. Tone names are semantic slots rather
 * than literal colours, so a change of palette does not mean touching every
 * call site:
 *
 *   magenta  the one commitment on the page (join, pay, submit)
 *   lime     the affirmative signal action
 *   paper    the light secondary
 *   ink      the quiet neutral
 *   violet · tangerine · cobalt   section accents
 */

export type ButtonTone = 'magenta' | 'lime' | 'paper' | 'ink' | 'violet' | 'tangerine' | 'cobalt' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Labels on filled buttons use `on-accent`, which flips with the theme, not a
 * fixed `void` or `white`. The accent fills themselves already flip - `cyan` is
 * a deep navy on the light palette and a mid blue on the dark one - so a label
 * pinned to either end of the scale is unreadable on one of the two. `text-void`
 * on `bg-cyan` was near-black on navy in light mode, on the page's primary
 * action. Amber keeps `void` deliberately: it is light in both palettes.
 */
const tones: Record<ButtonTone, string> = {
  magenta: 'bg-cyan text-white font-extrabold shadow-md hover:bg-cyan-bright hover:scale-[1.01] active:scale-[0.99]',
  lime: 'bg-cyan text-white font-extrabold shadow-md hover:bg-cyan-bright hover:scale-[1.01] active:scale-[0.99]',
  violet: 'bg-violet text-white font-extrabold shadow-md hover:bg-violet-bright hover:scale-[1.01] active:scale-[0.99]',
  cobalt: 'bg-violet-deep text-white font-extrabold hover:bg-violet hover:scale-[1.01] active:scale-[0.99]',
  tangerine: 'bg-amber text-black font-extrabold hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]',
  paper: 'border border-white/25 bg-surface-raised text-white font-extrabold hover:border-cyan hover:bg-surface-raised/80 hover:text-cyan hover:scale-[1.01] active:scale-[0.99]',
  ink: 'border border-white/20 bg-surface/90 text-white font-extrabold hover:border-cyan/80 hover:bg-surface-raised hover:text-cyan transition-all duration-200',
  ghost: 'text-white font-extrabold hover:bg-surface-raised hover:text-cyan',
  danger: 'border border-rose/40 bg-rose/10 text-rose font-extrabold hover:bg-rose/20',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs font-semibold gap-2 rounded-lg',
  md: 'h-11 px-5 text-sm font-semibold gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base font-bold gap-2.5 rounded-xl',
};

const base =
  'group/btn relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-medium ' +
  'transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-45';

interface Common {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  /** Trailing arrow that slides on hover. */
  arrow?: boolean;
}

type ButtonProps = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };

type AnchorProps = Common & {
  href: string;
  target?: string;
  rel?: string;
  prefetch?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/** A light sweep that crosses filled buttons on hover. */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 opacity-0 transition-opacity duration-200 group-hover/btn:animate-sheen-sweep group-hover/btn:opacity-100 motion-reduce:hidden"
    />
  );
}

export function Button(props: ButtonProps | AnchorProps) {
  const { tone = 'magenta', size = 'md', className, children, arrow } = props;
  const filled = tone !== 'ink' && tone !== 'ghost' && tone !== 'danger';
  const classes = cn(base, tones[tone], sizes[size], className);

  const content = (
    <>
      {filled && <Sheen />}
      <span className="relative inline-flex items-center gap-2">
        {children}
        {arrow && (
          <span aria-hidden className="transition-transform duration-300 group-hover/btn:translate-x-1">
            →
          </span>
        )}
      </span>
    </>
  );

  if ('href' in props && props.href) {
    const { href, target, rel, prefetch, onClick } = props;
    const external = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');

    if (external) {
      return (
        <a
          href={href}
          target={target ?? '_blank'}
          rel={rel ?? 'noopener noreferrer'}
          onClick={onClick}
          className={classes}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} target={target} rel={rel} prefetch={prefetch} onClick={onClick} className={classes}>
        {content}
      </Link>
    );
  }

  const { tone: _t, size: _s, className: _c, children: _ch, arrow: _a, href: _h, ...rest } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {content}
    </button>
  );
}

/** Square icon button, sized to match Button heights. */
export function IconButton({
  children,
  label,
  size = 'md',
  tone = 'ink',
  className,
  ...rest
}: {
  children: React.ReactNode;
  label: string;
  size?: ButtonSize;
  tone?: ButtonTone;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  const square = { sm: 'h-8 w-8 rounded', md: 'h-10 w-10 rounded-md', lg: 'h-12 w-12 rounded-md' }[size];
  return (
    <button aria-label={label} title={label} className={cn(base, tones[tone], square, className)} {...rest}>
      {children}
    </button>
  );
}
