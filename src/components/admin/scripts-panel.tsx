'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Code, FloppyDisk, Sparkle, ArrowClockwise } from '@phosphor-icons/react';

const PRESET_PAGES = [
  { label: 'Global / All Pages (default)', value: 'global' },
  { label: 'Home Page (/)', value: '/' },
  { label: 'Community Hub (/community)', value: '/community' },
  { label: 'Member Directory (/directory)', value: '/directory' },
  { label: 'Events (/events)', value: '/events' },
  { label: 'Opportunities (/opportunities)', value: '/opportunities' },
  { label: 'Resources (/resources)', value: '/resources' },
  { label: 'Membership Tiers (/membership)', value: '/membership' },
  { label: 'About Alliance (/about)', value: '/about' },
  { label: 'Contact Us (/contact)', value: '/contact' },
  { label: 'Checkout (/checkout)', value: '/checkout' },
  { label: 'Custom Path…', value: 'custom' },
];

export function ScriptsPanel() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [headerCode, setHeaderCode] = useState('');
  const [footerCode, setFooterCode] = useState('');
  const [pageBodyCodes, setPageBodyCodes] = useState<Record<string, string>>({});

  const [selectedPage, setSelectedPage] = useState('global');
  const [customPath, setCustomPath] = useState('');

  const activePathKey = selectedPage === 'custom' ? (customPath.trim() || '/custom') : selectedPage;
  const currentBodyCode = pageBodyCodes[activePathKey] || '';

  useEffect(() => {
    async function fetchScripts() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/scripts');
        const data = await res.json();
        if (data.ok && data.script) {
          setHeaderCode(data.script.headerCode || '');
          setFooterCode(data.script.footerCode || '');
          setPageBodyCodes(data.script.pageBodyCodes || {});
        }
      } catch {
        toast.error('Failed to load script configurations.');
      } finally {
        setLoading(false);
      }
    }
    fetchScripts();
  }, []);

  function handleBodyCodeChange(val: string) {
    setPageBodyCodes((prev) => ({
      ...prev,
      [activePathKey]: val,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/scripts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerCode,
          footerCode,
          pageBodyCodes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success('Header, Footer & Body script tags saved successfully! Live DOM updated.');
      } else {
        toast.error(data.error || 'Failed to save script tags.');
      }
    } catch {
      toast.error('Network error saving scripts.');
    } finally {
      setSaving(false);
    }
  }

  function insertGtmHeader() {
    const template = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`;
    setHeaderCode((prev) => (prev ? `${prev}\n\n${template}` : template));
    toast.info('Inserted Google Tag Manager Header snippet');
  }

  function insertGtmBody() {
    const template = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
    handleBodyCodeChange(currentBodyCode ? `${currentBodyCode}\n\n${template}` : template);
    toast.info(`Inserted GTM Body snippet for [${activePathKey}]`);
  }

  function insertFooterTracker() {
    const template = `<!-- Custom Analytics & Call Tracking -->
<script>
  console.log('BSA Executive Analytics initialized for page: ' + window.location.pathname);
</script>`;
    setFooterCode((prev) => (prev ? `${prev}\n\n${template}` : template));
    toast.info('Inserted Footer Script snippet');
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ArrowClockwise className="h-8 w-8 animate-spin text-cyan mb-3" />
        <p className="font-mono text-sm text-ink-muted">Loading script tags database…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan">
            <Code className="h-4 w-4 text-cyan" />
            GLOBAL & PAGE SCRIPT INJECTION
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Header, Footer & Body Tags</h2>
          <p className="mt-1 text-xs text-ink-muted max-w-2xl">
            Easily include custom code, GTM tracking, meta tags, and analytics pixels into page headers, footers, or body tags. Changes reflect instantly when inspecting the DOM.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          tone="cobalt"
          size="md"
          className="rounded-xl px-6 py-3 font-bold shadow-glow-cyan"
        >
          <FloppyDisk weight="bold" className="mr-2 h-4 w-4" />
          {saving ? 'Saving Changes…' : 'Save Script Tags'}
        </Button>
      </div>

      {/* 1. Global Header Code */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-3 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="rounded bg-cyan/20 border border-cyan/40 px-2 py-0.5 font-mono text-xs text-cyan">
                &lt;head&gt;
              </span>
              Global Header Code
            </h3>
            <p className="text-xs text-ink-muted">
              These scripts will be printed inside the <code className="text-cyan font-mono">&lt;head&gt;</code> section across all pages (e.g. Google Tag Manager header, meta tags, CSS links).
            </p>
          </div>
          <button
            type="button"
            onClick={insertGtmHeader}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-semibold text-cyan hover:bg-cyan/10 transition-colors"
          >
            <Sparkle className="h-3.5 w-3.5" />
            + Add GTM Header Snippet
          </button>
        </div>

        <textarea
          rows={7}
          value={headerCode}
          onChange={(e) => setHeaderCode(e.target.value)}
          placeholder="<!-- Insert global header scripts, GTM, meta tags here -->"
          className="w-full rounded-xl border border-line-bright bg-surface-inset p-4 font-mono text-xs text-cyan-bright placeholder:text-ink-faint focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan shadow-inner"
        />
      </div>

      {/* 2. Page-Specific Body Code */}
      <div className="rounded-2xl border border-cyan/40 bg-surface p-6 space-y-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/60 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="rounded bg-violet/20 border border-violet/40 px-2 py-0.5 font-mono text-xs text-violet-bright">
                &lt;body&gt;
              </span>
              Page-Specific Body Code
            </h3>
            <p className="text-xs text-ink-muted">
              Select a page to include different body tags (e.g. GTM noscript iframe, conversion pixels). Header and footer tags remain global across all pages.
            </p>
          </div>

          <button
            type="button"
            onClick={insertGtmBody}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-semibold text-violet-bright hover:bg-violet/10 transition-colors"
          >
            <Sparkle className="h-3.5 w-3.5" />
            + Add GTM Body Snippet
          </button>
        </div>

        {/* Page Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-inset/60 p-4 rounded-xl border border-line">
          <div>
            <label className="block font-mono text-xs font-bold text-ink-soft mb-1.5">
              Target Page Selection:
            </label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full rounded-xl border border-line-bright bg-surface p-2.5 font-sans text-xs font-semibold text-white focus:border-cyan focus:outline-none"
            >
              {PRESET_PAGES.map((p) => (
                <option key={p.value} value={p.value} className="bg-surface text-white">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {selectedPage === 'custom' && (
            <div>
              <label className="block font-mono text-xs font-bold text-ink-soft mb-1.5">
                Custom Page Route Path (e.g. /blog or /podcast):
              </label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/custom-page-slug"
                className="w-full rounded-xl border border-line-bright bg-surface p-2.5 font-mono text-xs text-cyan-bright placeholder:text-ink-faint focus:border-cyan focus:outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs font-bold text-violet-bright">
              Body Code for [{activePathKey}]:
            </span>
            <span className="font-mono text-[11px] text-ink-muted">
              Printed just below the opening &lt;body&gt; tag on page: <code className="text-cyan">{activePathKey}</code>
            </span>
          </div>
          <textarea
            rows={7}
            value={currentBodyCode}
            onChange={(e) => handleBodyCodeChange(e.target.value)}
            placeholder={`<!-- Insert body tags for ${activePathKey} (e.g. GTM noscript iframe, tracking pixel) -->`}
            className="w-full rounded-xl border border-line-bright bg-surface-inset p-4 font-mono text-xs text-violet-bright placeholder:text-ink-faint focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan shadow-inner"
          />
        </div>
      </div>

      {/* 3. Global Footer Code */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-3 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="rounded bg-emerald/20 border border-emerald/40 px-2 py-0.5 font-mono text-xs text-emerald">
                &lt;/body&gt;
              </span>
              Global Footer Code
            </h3>
            <p className="text-xs text-ink-muted">
              These scripts will be printed right before the closing <code className="text-emerald font-mono">&lt;/body&gt;</code> tag across all pages (e.g. chat widgets, analytics trackers, custom event listeners).
            </p>
          </div>
          <button
            type="button"
            onClick={insertFooterTracker}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-semibold text-emerald hover:bg-emerald/10 transition-colors"
          >
            <Sparkle className="h-3.5 w-3.5" />
            + Add Footer Snippet
          </button>
        </div>

        <textarea
          rows={7}
          value={footerCode}
          onChange={(e) => setFooterCode(e.target.value)}
          placeholder="<!-- Insert global footer scripts, chat widgets, analytics trackers here -->"
          className="w-full rounded-xl border border-line-bright bg-surface-inset p-4 font-mono text-xs text-emerald placeholder:text-ink-faint focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan shadow-inner"
        />
      </div>
    </div>
  );
}
