import { useState } from 'react';
import { TOOLS, toolById } from '../tools/registry';
import { GROUPS, type GroupId, type ToolDef } from '../tools/types';
import { useData, toggleFavorite } from '../store';
import { go } from '../router';
import { IconSearch, IconStar } from '../tools/icons';

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s+/g, '');

function matches(t: ToolDef, q: string) {
  if (!q) return true;
  const hay = norm([t.name, t.desc, ...t.keywords].join(' '));
  return norm(q)
    .split(/[、,]/)
    .every((w) => hay.includes(w));
}

type Filter = 'all' | 'fav' | GroupId;

export function HomeScreen() {
  const d = useData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const list = TOOLS.filter((t) => matches(t, q)).filter((t) => (filter === 'all' ? true : filter === 'fav' ? d.favorites.includes(t.id) : t.group === filter));
  const recent = d.recent.map(toolById).filter((t): t is ToolDef => !!t).slice(0, 4);
  const groupsInUse = GROUPS.filter((g) => TOOLS.some((t) => t.group === g.id));

  return (
    <div className="screen home">
      <header className="home-head">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <i />
          </span>
          <h1>
            Keisool<small>計装ツール</small>
          </h1>
        </div>
        <label className="search">
          <IconSearch />
          <input type="search" placeholder="ツール名・Pt100・開平…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
        </label>
        <div className="chips">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            すべて
          </button>
          <button className={filter === 'fav' ? 'on' : ''} onClick={() => setFilter('fav')}>
            ★
          </button>
          {groupsInUse.map((g) => (
            <button key={g.id} className={`g-${g.id} ${filter === g.id ? 'on' : ''}`} onClick={() => setFilter(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      </header>

      {!q && filter === 'all' && recent.length > 0 && (
        <section className="recent">
          <h2>最近</h2>
          <div className="recent-row">
            {recent.map((t) => (
              <button key={t.id} className={`recent-item g-${t.group}`} onClick={() => go(`tool/${t.id}`)}>
                <span className="ico">
                  <t.icon />
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="tool-list">
        {list.map((t) => {
          const fav = d.favorites.includes(t.id);
          return (
            <div key={t.id} className={`tool-card g-${t.group}`}>
              <button className="tool-main" onClick={() => go(`tool/${t.id}`)}>
                <span className="ico">
                  <t.icon />
                </span>
                <span className="tool-text">
                  <b>{t.name}</b>
                  <small>{t.desc}</small>
                </span>
              </button>
              <button className={`star ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(t.id)} aria-label={fav ? 'お気に入り解除' : 'お気に入り'}>
                <IconStar on={fav} />
              </button>
            </div>
          );
        })}
        {list.length === 0 && <p className="empty">{filter === 'fav' && !q ? '★をタップするとここに並ぶ' : '見つからない'}</p>}
      </section>
    </div>
  );
}
