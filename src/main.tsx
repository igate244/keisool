import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getData } from './store';
import './styles.css';

// 起動時に前回のツールを開く（ホームに戻れば一覧）
const d = getData();
if (!location.hash && d.settings.openLast && d.recent[0]) {
  history.replaceState(null, '', `#/tool/${d.recent[0]}`);
}

createRoot(document.getElementById('root')!).render(<App />);

// PWA：オフライン対応。新しい版が入ったら次の起動で切り替わる。
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
