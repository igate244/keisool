import { useEffect } from 'react';
import { toolById } from '../tools/registry';
import { GROUPS } from '../tools/types';
import { useData, saveToolState, touchRecent, toggleFavorite, pushHistory, getData } from '../store';
import { back } from '../router';
import { useDebounced } from '../components/ui';
import { IconBack, IconStar } from '../tools/icons';

export function ToolScreen({ id }: { id: string }) {
  const tool = toolById(id);
  const d = useData();

  useEffect(() => {
    if (tool) touchRecent(tool.id);
  }, [tool]);

  const saved = tool ? (d.states[tool.id] as object | undefined) : undefined;
  const state = tool ? { ...tool.defaults, ...(saved ?? {}) } : null;

  // 入力が落ち着いたら計算履歴へ（同じツールを1分以内に続けて触った分はまとめる）
  useDebounced(
    () => {
      if (!tool || !state || !saved) return;
      const line = tool.summary(state);
      if (line) pushHistory(tool.id, line, state);
    },
    [saved],
    2500,
  );

  if (!tool || !state) {
    return (
      <div className="screen">
        <p className="empty">ツールが見つからない</p>
      </div>
    );
  }

  const set = (patch: object) => {
    const cur = (getData().states[tool.id] as object | undefined) ?? {};
    saveToolState(tool.id, { ...tool.defaults, ...cur, ...patch });
  };
  const fav = d.favorites.includes(tool.id);
  const group = GROUPS.find((g) => g.id === tool.group);
  const Comp = tool.Component;

  return (
    <div className={`screen tool g-${tool.group}`}>
      <header className="tool-head">
        <button className="icon-btn" onClick={() => back('/')} aria-label="戻る">
          <IconBack />
        </button>
        <span className="ico">
          <tool.icon />
        </span>
        <div className="tool-title">
          <small>{group?.label}</small>
          <h1>{tool.name}</h1>
        </div>
        <button className={`icon-btn star ${fav ? 'on' : ''}`} onClick={() => toggleFavorite(tool.id)} aria-label="お気に入り">
          <IconStar on={fav} />
        </button>
      </header>
      <div className="tool-body">
        <Comp state={state} set={set} />
      </div>
    </div>
  );
}
