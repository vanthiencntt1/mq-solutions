'use client';

import { useEffect, useRef } from 'react';

// Cloudflare Turnstile – chỉ hiện khi có site key (production). Dev để trống = không có CAPTCHA.
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey?: string;
  onToken: (token: string | undefined) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let widgetId: string | undefined;
    const mount = () => {
      if (ref.current && window.turnstile) {
        widgetId = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          language: 'vi',
          callback: (t: string) => onToken(t),
          'expired-callback': () => onToken(undefined),
        });
      }
    };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      if (!s) {
        s = document.createElement('script');
        s.src = SCRIPT;
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener('load', mount, { once: true });
    }
    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
