import { useData, saveToolState, deleteHistory, clearHistory, getData, type HistoryEntry } from '../store';
import { toolById } from '../tools/registry';
import { go } from '../router';
import { copy } from '../components/ui';

const dayLabel = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return '今日';
  if (same(d, y)) return '昨日';
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
};
const hm = (t: number) => new Date(t).toTimeString().slice(0, 5);

export function HistoryScreen() {
  const d = useData();
  const groups: { label: string; items: HistoryEntry[] }[] = [];
  for (const h of d.history) {
    const label = dayLabel(h.at);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(h);
    else groups.push({ label, items: [h] });
  }
  const restore = (h: HistoryEntry) => {
    const t = toolById(h.tool);
    if (!t) return;
    if (t.id === h.tool) saveToolState(t.id, h.state);
    else if (t.id === 'temp') saveToolState('temp', { ...(getData().states.temp as object), kind: h.tool, [h.tool]: h.state });
    go(`tool/${t.id}`);
  };
  return (
    <div className="screen">
      <header className="page-head">
        <h1>計算履歴</h1>
        {d.history.length > 0 && (
          <button
            className="text-btn"
            onClick={() => {
              if (window.confirm('履歴を全部消す？')) clearHistory();
            }}
          >
            全部消す
          </button>
        )}
      </header>
      {d.history.length === 0 && <p className="empty">ツールで計算すると、ここに自動で残る</p>}
      {groups.map((g) => (
        <section key={g.label} className="hist-group">
          <h2>{g.label}</h2>
          {g.items.map((h) => {
            const t = toolById(h.tool);
            return (
              <div key={h.id} className={`hist-item g-${t?.group ?? ''}`}>
                <button className="hist-main" onClick={() => restore(h)}>
                  <span className="ico">{t && <t.icon />}</span>
                  <span className="hist-text">
                    <small>
                      {hm(h.at)}・{t?.name ?? h.tool}
                    </small>
                    <b>{h.summary}</b>
                  </span>
                </button>
                <div className="hist-actions">
                  <button onClick={() => copy(h.summary)}>コピー</button>
                  <button onClick={() => deleteHistory(h.id)}>削除</button>
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {d.history.length > 0 && <p className="foot-note">タップでその条件を呼び出して再計算。最大200件</p>}
    </div>
  );
}
