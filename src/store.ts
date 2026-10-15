// 端末内保存（localStorage）。お気に入り・最近使った・各ツールの入力状態・計算履歴・設定。
// 実データは扱わないので IndexedDB ではなく軽い localStorage で十分。
import { useSyncExternalStore } from 'react';

const KEY = 'keisool:v1';

export type HistoryEntry = { id: string; tool: string; at: number; summary: string; state: unknown };
export type Memo = { id: string; text: string; createdAt: number; updatedAt: number; pinned?: boolean; color?: string; deletedAt?: number };

type Data = {
  favorites: string[];
  recent: string[];
  states: Record<string, unknown>;
  history: HistoryEntry[];
  memos: Memo[];
  teamId: string | null; // 今日のワークで使うチーム
  settings: { openLast: boolean; memoView?: 'grid' | 'list' };
};

const EMPTY: Data = { favorites: [], recent: [], states: {}, history: [], memos: [], teamId: null, settings: { openLast: true } };
const HISTORY_MAX = 200;

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const d = JSON.parse(raw);
    const out: Data = { ...structuredClone(EMPTY), ...d, settings: { ...EMPTY.settings, ...(d.settings ?? {}) } };
    // ゴミ箱のメモは30日で完全に消す
    const limit = Date.now() - 30 * 864e5;
    out.memos = (out.memos ?? []).filter((m) => !m.deletedAt || m.deletedAt > limit);
    return out;
  } catch {
    return structuredClone(EMPTY);
  }
}

let data: Data = load();
const subs = new Set<() => void>();

function commit(next: Data) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 保存できない環境（プライベートモード等）でも計算は動かす */
  }
  subs.forEach((f) => f());
}

export function useData(): Data {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => data,
  );
}

export const getData = () => data;

export function toggleFavorite(tool: string) {
  const fav = data.favorites.includes(tool) ? data.favorites.filter((t) => t !== tool) : [...data.favorites, tool];
  commit({ ...data, favorites: fav });
}

export function touchRecent(tool: string) {
  if (data.recent[0] === tool) return;
  commit({ ...data, recent: [tool, ...data.recent.filter((t) => t !== tool)].slice(0, 8) });
}

export function saveToolState(tool: string, state: unknown) {
  commit({ ...data, states: { ...data.states, [tool]: state } });
}

/** 計算履歴に追加。同じツールを1分以内に続けて触った分はまとめる（最後の状態だけ残す） */
export function pushHistory(tool: string, summary: string, state: unknown) {
  const now = Date.now();
  const last = data.history[0];
  if (last && last.summary === summary && last.tool === tool) return;
  const merge = last && last.tool === tool && now - last.at < 60_000;
  const entry: HistoryEntry = { id: merge ? last.id : `${now}-${Math.random().toString(36).slice(2, 7)}`, tool, at: now, summary, state };
  const rest = merge ? data.history.slice(1) : data.history;
  commit({ ...data, history: [entry, ...rest].slice(0, HISTORY_MAX) });
}

export function deleteHistory(id: string) {
  commit({ ...data, history: data.history.filter((h) => h.id !== id) });
}

export function clearHistory() {
  commit({ ...data, history: [] });
}

export function setSetting<K extends keyof Data['settings']>(k: K, v: Data['settings'][K]) {
  commit({ ...data, settings: { ...data.settings, [k]: v } });
}

// ---------------------------------------------------------------- メモ（自分用・端末内）
export function saveMemo(id: string, text: string) {
  const now = Date.now();
  const cur = data.memos.find((m) => m.id === id);
  const memos = cur
    ? data.memos.map((m) => (m.id === id ? { ...m, text, updatedAt: now } : m))
    : [{ id, text, createdAt: now, updatedAt: now }, ...data.memos];
  commit({ ...data, memos });
}

export function toggleMemoPin(id: string) {
  commit({ ...data, memos: data.memos.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) });
}

export function updateMemo(id: string, patch: Partial<Memo>) {
  commit({ ...data, memos: data.memos.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
}

/** ゴミ箱へ（30日後に自動で消える） */
export function trashMemo(id: string) {
  updateMemo(id, { deletedAt: Date.now() });
}

export function restoreMemo(id: string) {
  updateMemo(id, { deletedAt: undefined });
}

/** 完全に消す（ゴミ箱から・空のメモ） */
export function deleteMemo(id: string) {
  commit({ ...data, memos: data.memos.filter((m) => m.id !== id) });
}

export function emptyTrash() {
  commit({ ...data, memos: data.memos.filter((m) => !m.deletedAt) });
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------- 今日のワーク
export function setTeamId(id: string | null) {
  commit({ ...data, teamId: id });
}
