'use client';

import React, { useEffect, useRef } from 'react';
import Script from 'next/script';
import { cn } from '@/lib/utils';

export interface HubspotFormProps {
  className?: string;
  portalId?: string;
  formId?: string;
  region?: string;
}

export function HubspotForm({
  className,
  portalId = '244660178',
  formId = '2e72517f-e6e9-4f4e-a980-6bd95168fc04',
  region = 'na2',
}: HubspotFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const initForm = () => {
    if (typeof window !== 'undefined' && (window as any).hbspt && containerRef.current) {
      containerRef.current.innerHTML = '';
      (window as any).hbspt.forms.create({
        region,
        portalId,
        formId,
        target: `#hs-form-${formId}`,
      });
    }
  };

  useEffect(() => {
    initForm();
  }, [formId, portalId, region]);

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl border border-line bg-surface/95 p-6 backdrop-blur-xl shadow-panel-lg sm:p-8',
        className,
      )}
    >
      <Script
        src={`https://js-${region}.hsforms.net/forms/embed/${portalId}.js`}
        strategy="afterInteractive"
        onLoad={initForm}
      />

      <div
        id={`hs-form-${formId}`}
        ref={containerRef}
        className="hs-form-frame min-h-[380px] w-full"
      />
    </div>
  );
}
