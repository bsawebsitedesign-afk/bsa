'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ScriptsData {
  headerCode: string;
  footerCode: string;
  pageBodyCodes: Record<string, string>;
}

function injectHeaderNodes(html: string) {
  // Clean up previous header nodes
  document.querySelectorAll('[data-bsa-header-node="true"]').forEach((el) => el.remove());

  if (!html || !html.trim()) return;

  const range = document.createRange();
  const fragment = range.createContextualFragment(html);

  Array.from(fragment.childNodes).forEach((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      const comment = document.createComment(node.textContent || '');
      document.head.appendChild(comment);
    } else if (node.nodeName.toLowerCase() === 'script') {
      const scriptEl = document.createElement('script');
      scriptEl.setAttribute('data-bsa-header-node', 'true');
      const origScript = node as HTMLScriptElement;
      Array.from(origScript.attributes).forEach((attr) => {
        scriptEl.setAttribute(attr.name, attr.value);
      });
      scriptEl.textContent = origScript.textContent;
      document.head.appendChild(scriptEl);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const cloned = node.cloneNode(true) as HTMLElement;
      cloned.setAttribute('data-bsa-header-node', 'true');
      document.head.appendChild(cloned);
    }
  });
}

function parseAndInjectBody(html: string, parent: HTMLElement, containerId: string) {
  const existing = document.getElementById(containerId);
  if (existing) existing.remove();

  if (!html || !html.trim()) return;

  const container = document.createElement('div');
  container.id = containerId;
  container.setAttribute('data-bsa-script-container', 'true');
  container.style.display = 'contents';

  const range = document.createRange();
  const fragment = range.createContextualFragment(html);

  Array.from(fragment.childNodes).forEach((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      container.appendChild(document.createComment(node.textContent || ''));
    } else if (node.nodeName.toLowerCase() === 'script') {
      const scriptEl = document.createElement('script');
      const origScript = node as HTMLScriptElement;
      Array.from(origScript.attributes).forEach((attr) => {
        scriptEl.setAttribute(attr.name, attr.value);
      });
      scriptEl.textContent = origScript.textContent;
      container.appendChild(scriptEl);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
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

  // 1. Inject Global Header Code directly into <head>
  injectHeaderNodes(data.headerCode);

  // 2. Inject Page-Specific Body Code
  const bodyCode =
    data.pageBodyCodes[pathname] ||
    data.pageBodyCodes['global'] ||
    data.pageBodyCodes['*'] ||
    '';

  if (bodyCode) {
    parseAndInjectBody(bodyCode, document.body, 'bsa-body-scripts');
  } else {
    const existingBody = document.getElementById('bsa-body-scripts');
    if (existingBody) existingBody.remove();
  }

  // 3. Inject Global Footer Code
  if (data.footerCode) {
    parseAndInjectBody(data.footerCode, document.body, 'bsa-footer-scripts');
  }
}
