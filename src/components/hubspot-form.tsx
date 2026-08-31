'use client';

import React from 'react';
import Script from 'next/script';
import { cn } from '@/lib/utils';

export interface HubspotFormProps {
  className?: string;
  portalId?: string;
  formId?: string;
  region?: string;
}

/**
 * Reusable HubSpot Form Component
 *
 * Safe for Next.js App Router (Client-side hydration safe).
 * Uses next/script with strategy="afterInteractive" to prevent page blocking
 * and hydration mismatches while rendering HubSpot forms smoothly.
 */
export function HubspotForm({
  className,
  portalId = '244660178',
  formId = '2e72517f-e6e9-4f4e-a980-6bd95168fc04',
  region = 'na2',
}: HubspotFormProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-3xl border border-cyan/30 bg-[#0B0F19]/90 p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.12)] sm:p-8',
        className,
      )}
    >
      {/* Background Cyber Glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-violet/15 blur-3xl" />

      {/* HubSpot External Embed Engine */}
      <Script
        src={`https://js-${region}.hsforms.net/forms/embed/${portalId}.js`}
        strategy="afterInteractive"
      />

      {/* Container where HubSpot script injects the iframe/form */}
      <div
        className="hs-form-frame min-h-[380px] w-full"
        data-region={region}
        data-form-id={formId}
        data-portal-id={portalId}
      />
    </div>
  );
}
