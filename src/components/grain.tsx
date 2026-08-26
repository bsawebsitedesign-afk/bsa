import React from 'react';

/**
 * Fixed film-grain overlay.
 *
 * Large flat areas of near-black band badly on 8-bit displays; a few percent of
 * noise breaks the gradient up so the plate reads as a surface rather than a
 * void. Purely decorative, never intercepts pointer events, and sits above page
 * content but below toasts and dialogs.
 *
 * Desktop only. It is a full-viewport fixed layer composited over every frame
 * of every scroll, and at 3.5% opacity on a phone screen there is nothing there
 * to see for it - the banding it exists to break up needs a large flat area,
 * which is exactly what a handset does not have.
 */
export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] hidden opacity-[0.035] lg:block"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
