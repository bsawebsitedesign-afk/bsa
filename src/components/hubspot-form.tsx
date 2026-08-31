'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface HubspotFormProps {
  className?: string;
  shareUrl?: string;
}

export function HubspotForm({
  className,
  shareUrl = 'https://41nx02.share-na2.hsforms.com/2LnJRf-bpT06pgGvZUWj8BA',
}: HubspotFormProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-panel-lg',
        className,
      )}
    >
      <iframe
        src={shareUrl}
        width="100%"
        height="680"
        className="w-full border-0 bg-transparent min-h-[680px]"
        title="Contact Form"
        loading="eager"
      />
    </div>
  );
}
