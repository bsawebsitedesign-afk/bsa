'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ScriptsData {
  headerCode: string;
  footerCode: string;
  pageBodyCodes: Record<string, string>;
}

function parseAndInject(html: string, parent: HTMLElement, containerId: string) {
  // Remove existing container if re-injecting
  const existing = document.getElementById(containerId);
  if (existing) existing.remove();

  if (!html || !html.trim()) return;

  const container = document.createElement('div');
  container.id = containerId;
  container.setAttribute('data-bsa-script-container', 'true');
  container.style.display = 'contents';

  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Copy non-script nodes
  Array.from(doc.head.childNodes).concat(Array.from(doc.body.childNodes)).forEach((node) => {
    if (node.nodeName.toLowerCase() === 'script') {
      const scriptEl = document.createElement('script');
      const origScript = node as HTMLScriptElement;
      Array.from(origScript.attributes).forEach((attr) => {
        scriptEl.setAttribute(attr.name, attr.value);
      });
      scriptEl.textContent = origScript.textContent;
      container.appendChild(scriptEl);
    } else {
      container.appendChild(node.cloneNode(true));
    }
  });

  parent.appendChild(container);
}

export function ScriptInjector() {
  const pathname = usePathname();
  const scriptsRef = useRef<ScriptsData | null>(null);

  useEffect(() => {
    let active = true;

    async function loadScripts() {
      try {
        const res = await fetch('/api/scripts');
        const data = await res.json();
        if (!active || !data.ok) return;

        const payload: ScriptsData = {
          headerCode: data.headerCode || '',
          footerCode: data.footerCode || '',
          pageBodyCodes: data.pageBodyCodes || {},
        };

        scriptsRef.current = payload;
        injectAll(payload, pathname);
      } catch {
        // quiet retry fallback
      }
    }

    loadScripts();

    return () => {
      active = false;
    };
  }, []);

  // Re-evaluate page-specific body scripts whenever route changes
  useEffect(() => {
    if (scriptsRef.current) {
      injectAll(scriptsRef.current, pathname);
    }
  }, [pathname]);

  return null;
}

function injectAll(data: ScriptsData, pathname: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Inject Global Header Code
  if (data.headerCode) {
    parseAndInject(data.headerCode, document.head, 'bsa-header-scripts');
  }

  // 2. Inject Page-Specific Body Code
  // Check exact path match (e.g. "/events"), fallback to "/" or "global"
  const bodyCode =
    data.pageBodyCodes[pathname] ||
    data.pageBodyCodes['global'] ||
    data.pageBodyCodes['*'] ||
    '';

  if (bodyCode) {
    parseAndInject(bodyCode, document.body, 'bsa-body-scripts');
  } else {
    const existingBody = document.getElementById('bsa-body-scripts');
    if (existingBody) existingBody.remove();
  }

  // 3. Inject Global Footer Code
  if (data.footerCode) {
    parseAndInject(data.footerCode, document.body, 'bsa-footer-scripts');
  }
}
