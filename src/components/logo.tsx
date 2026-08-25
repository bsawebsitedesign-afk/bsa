import React from 'react';
import { cn } from '@/lib/utils';

/**
 * The BSA mark.
 *
 * Drawn to match the struck-metal badge: a medallion with a riveted rim, an
 * escutcheon set into it, a portcullis lattice across the field, and a chevron
 * device over the top. The shield is split, one flank carrying the steel-blue
 * field and one left as polished silver, as the artwork is.
 *
 * Inline SVG rather than an image so it inherits the theme, scales without a
 * request, and can carry the engraved highlight as a real gradient. This is the
 * brand mark: it is drawn once here and never altered per page.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt={title || 'Business Security Alliance'}
      className={cn('h-8 w-8 flex-shrink-0 object-contain drop-shadow-md', className)}
    />
  );
}

/** Mark plus wordmark, used in the header and footer. */
export function Logo({
  className,
  showWord = true,
  subtitle,
}: {
  className?: string;
  showWord?: boolean;
  subtitle?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark className="h-8 w-8 flex-shrink-0" title="Business Security Alliance" />
      {showWord && (
        <span className="flex flex-col leading-none">
          <span
            className="font-display text-sm sm:text-base font-extrabold tracking-tight group-hover:text-cyan transition-colors whitespace-nowrap"
            style={{ color: '#ffffff' }}
          >
            Business Security Alliance
          </span>
          {subtitle && (
            <span
              className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.18em]"
              style={{ color: '#94a3b8' }}
            >
              Professional Industry Network
            </span>
          )}
        </span>
      )}
    </span>
  );
}
