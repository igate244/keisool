import { useEffect, useRef, useState } from 'react';
import { useData, saveMemo, deleteMemo, toggleMemoPin, newId, getData } from '../store';
import { go, back } from '../router';
import { IconBack, IconStar } from '../tools/icons';

const when = (t: number) => {
  const d = new Date(t);
  if (d.toDateString() === new Date().toDateString()) return d.toTimeString().slice(0, 5);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const norm = (s: string) => s.normalize('NFKC').toLowerCase();

export function MemoListScreen() {
  const d = useData();
  const [q, setQ] = useState('');
  const list = d.memos
    .filter((m) => m.text.trim())
    .filter((m) => !q || norm(m.text).includes(norm(q)))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt);
  return (
    <div className="screen">
      <header className="page-head">
        <h1>メモ</h1>
        <button className="text-btn accent" onClick={() => go(`memo/${newId()}`)}>
          ＋ 新規
        </button>
      </header>
      {d.memos.length > 3 && (
        <label className="search memo-search">
          <input type="search" placeholder="メモを検索" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      )}
      {list.length === 0 && <p className="empty">{q ? '見つからない' : '自分用のメモ。この端末の中だけに保存される'}</p>}
      <section className="memo-list">
        {list.map((m) => {
          const [title, ...rest] = m.text.trim().split('\n');
          return (
            <button key={m.id} className="memo-card" onClick={() => go(`memo/${m.id}`)}>
              <span className="memo-top">
                <b>{title}</b>
                {m.pinned && <span className="pin">★</span>}
              </span>
              {rest.join(' ').trim() && <small>{rest.join(' ').trim()}</small>}
              <time>{when(m.updatedAt)}</time>
            </button>
          );
        })}
      </section>
    </div>
  );
}

export function MemoEditScreen({ id }: { id: string }) {
  const d = useData();
  const memo = d.memos.find((m) => m.id === id);
  const [text, setText] = useState(memo?.text ?? '');
  const timer = useRef(0);
  const latest = useRef(text);
  latest.current = text;

  // 入力が止まったら保存。画面を離れるときも保存（空なら作らない／消す）
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (text.trim() || getData().memos.some((m) => m.id === id)) saveMemo(id, text);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [text, id]);
  useEffect(
    () => () => {
      const t = latest.current;
      if (t.trim()) saveMemo(id, t);
      else if (getData().memos.some((m) => m.id === id)) deleteMemo(id);
    },
    [id],
  );

  return (
    <div className="screen memo-edit">
      <header className="tool-head">
        <button className="icon-btn" onClick={() => back('/memo')} aria-label="戻る">
          <IconBack />
        </button>
        <div className="tool-title">
          <h1>メモ</h1>
        </div>
        {memo && (
          <button className={`icon-btn star ${memo.pinned ? 'on' : ''}`} onClick={() => toggleMemoPin(id)} aria-label="上に固定">
            <IconStar on={memo.pinned} />
          </button>
        )}
      </header>
      <textarea autoFocus={!memo} value={text} onChange={(e) => setText(e.target.value)} placeholder="1行目がタイトルになる" />
      {memo && (
        <button
          className="text-btn"
          onClick={() => {
            if (!window.confirm('このメモを消す？')) return;
            setText('');
            latest.current = '';
            deleteMemo(id);
            back('/memo');
          }}
        >
          このメモを削除
        </button>
      )}
    </div>
  );
}
