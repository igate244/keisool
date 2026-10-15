import { useEffect, useState } from 'react';

const parse = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);

// アプリ内で進んだ回数。0のときの「戻る」はアプリ外に出ずホームへ
let depth = 0;

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string) {
  const next = path.startsWith('/') ? path : `/${path}`;
  if (`#${next}` === location.hash || (next === '/' && !location.hash)) return;
  depth++;
  location.hash = next;
}

export function back(fallback = '/') {
  if (depth > 0) {
    depth--;
    history.back();
  } else {
    history.replaceState(null, '', `#${fallback}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}
