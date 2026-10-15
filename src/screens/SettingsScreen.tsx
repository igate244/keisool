import { useData, setSetting } from '../store';

declare const __BUILD_TIME__: string;

async function reload() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {
    /* オフラインなど */
  }
  location.reload();
}

export function SettingsScreen() {
  const d = useData();
  return (
    <div className="screen">
      <header className="page-head">
        <h1>設定</h1>
      </header>
      <section className="card">
        <label className="switch-row">
          <span>
            <b>起動時に前回のツールを開く</b>
            <small>電卓みたいに、開いたらすぐ続きから</small>
          </span>
          <input type="checkbox" checked={d.settings.openLast} onChange={(e) => setSetting('openLast', e.target.checked)} />
        </label>
      </section>
      <section className="card">
        <div className="kv">
          <span>ビルド</span>
          <b>{__BUILD_TIME__}</b>
        </div>
        <button className="wide-btn" onClick={reload}>
          最新版に更新（再読み込み）
        </button>
      </section>
      <section className="card about">
        <p>
          <b>Keisool</b> は計装保全の電卓アプリ。計算履歴・メモはこの端末の中だけに保存。「今日のワーク」のタスクだけはチームで共有するためクラウド（Firebase）に保存される。
        </p>
        <p>計算式：熱電対 JIS C 1602（ITS-90）、測温抵抗体 JIS C 1604／IEC 60751。現場で使う前に重要な値は規格表でも確認してね。</p>
      </section>
    </div>
  );
}
