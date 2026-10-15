// メモ（自分用・端末内）
// 取り入れた機能：色分け／★固定／#タグで絞り込み／チェックリスト（☐ をタップで ☑）／グリッド・リスト表示
//                 ／日時の挿入／共有・コピー／文字数／ゴミ箱（30日で自動削除・復元可）
import { useEffect, useRef, useState } from 'react';
import { useData, saveMemo, deleteMemo, trashMemo, restoreMemo, emptyTrash, toggleMemoPin, updateMemo, newId, getData, setSetting, type Memo } from '../store';
import { go, back } from '../router';
import { toast } from '../components/ui';
import { IconBack, IconStar } from '../tools/icons';

export const MEMO_COLORS: { id: string; label: string }[] = [
  { id: '', label: 'なし' },
  { id: 'red', label: '赤' },
  { id: 'orange', label: 'オレンジ' },
  { id: 'yellow', label: '黄' },
  { id: 'green', label: '緑' },
  { id: 'cyan', label: '水色' },
  { id: 'blue', label: '青' },
  { id: 'purple', label: '紫' },
];

const TAG_RE = /#([^\s#、。,.!?！？「」（）()]+)/g;
export const tagsOf = (text: string) => [...new Set([...text.matchAll(TAG_RE)].map((m) => m[1]))];
const norm = (s: string) => s.normalize('NFKC').toLowerCase();
const CHECK_OFF = '☐ ';
const CHECK_ON = '☑ ';
const isCheck = (line: string) => line.startsWith(CHECK_OFF) || line.startsWith(CHECK_ON);

const when = (t: number) => {
  const d = new Date(t);
  if (d.toDateString() === new Date().toDateString()) return d.toTimeString().slice(0, 5);
  const y = d.getFullYear() === new Date().getFullYear() ? '' : `${d.getFullYear()}/`;
  return `${y}${d.getMonth() + 1}/${d.getDate()}`;
};
const stamp = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）${d.toTimeString().slice(0, 5)}`;
};

function checkCount(text: string) {
  const lines = text.split('\n').filter(isCheck);
  return lines.length ? { done: lines.filter((l) => l.startsWith(CHECK_ON)).length, all: lines.length } : null;
}

// ---------------------------------------------------------------- 一覧
export function MemoListScreen() {
  const d = useData();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [trash, setTrash] = useState(false);
  const view = d.settings.memoView ?? 'grid';

  const live = d.memos.filter((m) => !m.deletedAt && m.text.trim());
  const trashed = d.memos.filter((m) => m.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  const allTags = [...new Set(live.flatMap((m) => tagsOf(m.text)))].sort((a, b) => a.localeCompare(b, 'ja'));
  const list = (trash ? trashed : live)
    .filter((m) => !q || norm(m.text).includes(norm(q)))
    .filter((m) => trash || !tag || tagsOf(m.text).includes(tag))
    .sort((a, b) => (trash ? 0 : Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt));
  const pinned = trash ? [] : list.filter((m) => m.pinned);
  const others = trash ? list : list.filter((m) => !m.pinned);

  return (
    <div className="screen memos">
      <header className="page-head">
        {trash ? (
          <>
            <button className="icon-btn" onClick={() => setTrash(false)} aria-label="戻る">
              <IconBack />
            </button>
            <h1>ゴミ箱</h1>
            {trashed.length > 0 && (
              <button className="text-btn" onClick={() => window.confirm(`ゴミ箱の${trashed.length}件を完全に消す？`) && emptyTrash()}>
                空にする
              </button>
            )}
          </>
        ) : (
          <>
            <h1>メモ</h1>
            <button className="icon-btn" onClick={() => setSetting('memoView', view === 'grid' ? 'list' : 'grid')} aria-label={view === 'grid' ? 'リスト表示' : 'グリッド表示'}>
              {view === 'grid' ? (
                <svg viewBox="0 0 24 24" className="ui-ico">
                  <path d="M5 7h14M5 12h14M5 17h14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="ui-ico">
                  <rect x="4" y="4" width="7" height="9" rx="2" />
                  <rect x="13" y="4" width="7" height="6" rx="2" />
                  <rect x="4" y="15" width="7" height="5" rx="2" />
                  <rect x="13" y="12" width="7" height="8" rx="2" />
                </svg>
              )}
            </button>
          </>
        )}
      </header>

      <label className="search memo-search">
        <svg viewBox="0 0 24 24" className="ui-ico">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" />
        </svg>
        <input type="search" placeholder={trash ? 'ゴミ箱を検索' : 'メモを検索'} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {!trash && allTags.length > 0 && (
        <div className="chips memo-tags">
          <button className={!tag ? 'on' : ''} onClick={() => setTag(null)}>
            すべて
          </button>
          {allTags.map((t) => (
            <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(tag === t ? null : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <p className="empty">
          {trash ? 'ゴミ箱は空' : q || tag ? '見つからない' : '自分用のメモ。この端末の中だけに保存される\n下の＋から書き始めてね'}
        </p>
      )}

      {pinned.length > 0 && <h2 className="memo-sec">★ 固定</h2>}
      {pinned.length > 0 && <MemoGrid memos={pinned} view={view} />}
      {pinned.length > 0 && others.length > 0 && <h2 className="memo-sec">その他</h2>}
      {trash ? (
        <section className="memo-list list">
          {others.map((m) => (
            <div key={m.id} className={`memo-card c-${m.color || 'none'} trashed`}>
              <MemoPreview m={m} />
              <div className="hist-actions">
                <button onClick={() => restoreMemo(m.id)}>元に戻す</button>
                <button className="danger" onClick={() => window.confirm('完全に消す？') && deleteMemo(m.id)}>
                  完全に削除
                </button>
              </div>
            </div>
          ))}
          {others.length > 0 && <p className="foot-note">ゴミ箱のメモは30日で自動的に消える</p>}
        </section>
      ) : (
        <MemoGrid memos={others} view={view} />
      )}

      {!trash && (
        <>
          <button className="trash-link" onClick={() => setTrash(true)}>
            ゴミ箱{trashed.length ? `（${trashed.length}）` : ''}
          </button>
          <button className="fab" onClick={() => go(`memo/${newId()}`)} aria-label="新しいメモ">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

function MemoGrid({ memos, view }: { memos: Memo[]; view: 'grid' | 'list' }) {
  return (
    <section className={`memo-list ${view}`}>
      {memos.map((m) => (
        <button key={m.id} className={`memo-card c-${m.color || 'none'}`} onClick={() => go(`memo/${m.id}`)}>
          <MemoPreview m={m} />
        </button>
      ))}
    </section>
  );
}

function MemoPreview({ m }: { m: Memo }) {
  const [title, ...rest] = m.text.trim().split('\n');
  const body = rest.filter((l) => l.trim()).slice(0, 6);
  const cc = checkCount(m.text);
  const tags = tagsOf(m.text);
  return (
    <>
      <span className="memo-top">
        <b>{title.replace(/^[☐☑] /, '')}</b>
        {m.pinned && <span className="pin">★</span>}
      </span>
      {body.length > 0 && (
        <span className="memo-body">
          {body.map((l, i) => (
            <span key={i} className={l.startsWith(CHECK_ON) ? 'chk on' : l.startsWith(CHECK_OFF) ? 'chk' : ''}>
              {l}
            </span>
          ))}
        </span>
      )}
      <span className="memo-foot">
        <time>{when(m.updatedAt)}</time>
        {cc && (
          <span className="memo-cc">
            ☑ {cc.done}/{cc.all}
          </span>
        )}
        {tags.slice(0, 3).map((t) => (
          <span key={t} className="memo-tag">
            #{t}
          </span>
        ))}
      </span>
    </>
  );
}

// ---------------------------------------------------------------- 編集
export function MemoEditScreen({ id }: { id: string }) {
  const d = useData();
  const memo = d.memos.find((m) => m.id === id);
  const [text, setText] = useState(memo?.text ?? '');
  const [editing, setEditing] = useState(!memo || !memo.text.trim());
  const [showColors, setShowColors] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(text);
  latest.current = text;
  const caret = useRef<number | null>(null);

  // 入力が止まったら保存。画面を離れるときも保存（空なら作らない／消す）
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() || getData().memos.some((m) => m.id === id)) saveMemo(id, text);
    }, 400);
    return () => clearTimeout(t);
  }, [text, id]);
  useEffect(
    () => () => {
      const t = latest.current;
      if (t.trim()) saveMemo(id, t);
      else if (getData().memos.some((m) => m.id === id)) deleteMemo(id);
    },
    [id],
  );
  // 表示→編集に切り替えたらカーソルを置く
  useEffect(() => {
    if (editing && ta.current) {
      ta.current.focus();
      const pos = caret.current ?? ta.current.value.length;
      ta.current.setSelectionRange(pos, pos);
      caret.current = null;
    }
  }, [editing]);

  const ensure = () => {
    if (!getData().memos.some((m) => m.id === id)) saveMemo(id, latest.current || ' ');
  };

  /** カーソル位置に文字を入れる（行頭に入れるものは行頭へ） */
  const insert = (s: string, atLineStart = false) => {
    const el = ta.current;
    if (!el) return;
    const v = el.value;
    let start = el.selectionStart;
    let end = el.selectionEnd;
    if (atLineStart) {
      start = end = v.lastIndexOf('\n', start - 1) + 1;
      if (v.startsWith(CHECK_OFF, start) || v.startsWith(CHECK_ON, start)) {
        // もう付いていたら外す
        const next = v.slice(0, start) + v.slice(start + 2);
        setText(next);
        requestAnimationFrame(() => el.setSelectionRange(Math.max(start, el.selectionStart - 2), Math.max(start, el.selectionStart - 2)));
        return;
      }
    }
    const next = v.slice(0, start) + s + v.slice(end);
    setText(next);
    const pos = (atLineStart ? el.selectionStart : start) + s.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  /** チェック行で改行したら次の行も ☐ にする（空のチェック行で改行したら終わる） */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const v = el.value;
    const ls = v.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const line = v.slice(ls, el.selectionStart);
    if (!isCheck(line)) return;
    e.preventDefault();
    if (line.trim() === '☐' || line.trim() === '☑') {
      const next = v.slice(0, ls) + v.slice(el.selectionStart);
      setText(next);
      requestAnimationFrame(() => el.setSelectionRange(ls, ls));
      return;
    }
    insert(`\n${CHECK_OFF}`);
  };

  const toggleLine = (i: number) => {
    const lines = text.split('\n');
    const l = lines[i];
    lines[i] = l.startsWith(CHECK_ON) ? CHECK_OFF + l.slice(2) : CHECK_ON + l.slice(2);
    setText(lines.join('\n'));
  };

  const share = async () => {
    const t = text.trim();
    if (!t) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: t });
      } catch {
        /* キャンセル */
      }
    } else {
      navigator.clipboard?.writeText(t).then(() => toast('コピーした'));
    }
  };

  const lines = text.split('\n');
  const cc = checkCount(text);
  const color = memo?.color || 'none';

  return (
    <div className={`screen memo-edit c-${color}`}>
      <header className="tool-head">
        <button className="icon-btn" onClick={() => back('/memo')} aria-label="戻る">
          <IconBack />
        </button>
        <div className="tool-title">
          <small>{memo ? `更新 ${when(memo.updatedAt)}` : '新しいメモ'}</small>
          <h1>メモ</h1>
        </div>
        <button className="icon-btn" onClick={() => (ensure(), setShowColors((v) => !v))} aria-label="色">
          <span className={`color-dot c-${color}`} />
        </button>
        <button className={`icon-btn star ${memo?.pinned ? 'on' : ''}`} onClick={() => (ensure(), toggleMemoPin(id))} aria-label="上に固定">
          <IconStar on={memo?.pinned} />
        </button>
      </header>

      {showColors && (
        <div className="color-row">
          {MEMO_COLORS.map((c) => (
            <button
              key={c.id}
              className={`color-dot big c-${c.id || 'none'} ${(memo?.color ?? '') === c.id ? 'on' : ''}`}
              onClick={() => {
                updateMemo(id, { color: c.id || undefined });
                setShowColors(false);
              }}
              aria-label={c.label}
            />
          ))}
        </div>
      )}

      {editing ? (
        <textarea ref={ta} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} placeholder={'1行目がタイトルになる\n#タグ を書くと一覧で絞り込める'} />
      ) : (
        <div className="memo-view" onClick={() => setEditing(true)}>
          {lines.map((l, i) => {
            const offset = lines.slice(0, i + 1).join('\n').length;
            if (isCheck(l)) {
              const on = l.startsWith(CHECK_ON);
              return (
                <div key={i} className={`mv-check ${on ? 'on' : ''}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLine(i);
                    }}
                    aria-label={on ? 'チェックを外す' : 'チェック'}
                  >
                    {on ? '☑' : '☐'}
                  </button>
                  <span
                    onClick={() => {
                      caret.current = offset;
                    }}
                  >
                    <Tagged text={l.slice(2)} />
                  </span>
                </div>
              );
            }
            return (
              <div
                key={i}
                className={i === 0 ? 'mv-title' : 'mv-line'}
                onClick={() => {
                  caret.current = offset;
                }}
              >
                {l ? <Tagged text={l} /> : ' '}
              </div>
            );
          })}
          <p className="mv-hint">タップで編集</p>
        </div>
      )}

      <div className="memo-tools">
        {editing ? (
          <>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => insert(CHECK_OFF, true)}>
              ☐ チェック
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => insert(stamp())}>
              日時
            </button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => insert('#')}>
              #タグ
            </button>
            <button className="accent" onClick={() => setEditing(false)}>
              完了
            </button>
          </>
        ) : (
          <>
            <button onClick={share}>共有</button>
            <button onClick={() => navigator.clipboard?.writeText(text).then(() => toast('コピーした'))}>コピー</button>
            {memo && (
              <button
                className="danger"
                onClick={() => {
                  trashMemo(id);
                  toast('ゴミ箱に移した（30日間は戻せる）');
                  back('/memo');
                }}
              >
                ゴミ箱へ
              </button>
            )}
          </>
        )}
      </div>
      <p className="memo-count">
        {text.length}文字{cc ? `・チェック ${cc.done}/${cc.all}` : ''}
      </p>
    </div>
  );
}

/** #タグを色付きで表示 */
function Tagged({ text }: { text: string }) {
  const parts: (string | { tag: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(TAG_RE)) {
    parts.push(text.slice(last, m.index));
    parts.push({ tag: m[0] });
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <span key={i} className="mv-tag">
            {p.tag}
          </span>
        ),
      )}
    </>
  );
}
