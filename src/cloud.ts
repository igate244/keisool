// 「今日のワーク」のクラウド共有（Firebase：KEEP のプロジェクトに相乗り）
// SDK は npm に入れず、必要になったときだけ gstatic から読み込む（計算ツールだけ使うときは読み込まない）。
//
// データの置き場所（Firestore）
//   keisoolTeams/{teamId}            … { name, owner, members: [uid], names: { uid: 表示名 }, createdAt }
//   keisoolTeams/{teamId}/tasks/{id} … { text, kind, parent, done, createdBy, createdByName, createdAt, doneBy, doneByName, doneAt }
//     kind: 'project' が親件名（工事件名）、それ以外は作業。作業の parent に親のIDが入る（なしは「件名なし」）
//     date: 予定日（YYYY-MM-DD）。古いデータで無いときは createdAt の日付として扱う
// teamId は推測できない長さ。招待リンク（#/join/{teamId}）を知っている人がログインして参加できる。
import { useSyncExternalStore } from 'react';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.5';
const CONFIG = {
  apiKey: 'AIzaSyAW9ggqugQxRSuL0uMnsGqdDlCmSqXForo',
  authDomain: 'keep-app-30128.firebaseapp.com',
  projectId: 'keep-app-30128',
  messagingSenderId: '229165602365',
  appId: '1:229165602365:web:7a7ba1c091fc744797fc54',
};
const TEAMS = 'keisoolTeams';

export type User = { uid: string; name: string; email: string };
export type Team = { id: string; name: string; owner: string; members: string[]; names: Record<string, string> };
export type Task = {
  id: string;
  text: string;
  kind?: 'project' | 'task';
  parent?: string;
  order?: number; // 並び順（小さいほど上）。無いときは createdAt
  date?: string; // 予定日 YYYY-MM-DD（工事件名と件名なしの作業に付く。工事件名の中の作業は親に従う）
  done: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  doneBy?: string;
  doneByName?: string;
  doneAt?: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sdk = { auth: any; fs: any; authMod: any; fsMod: any };
let sdkPromise: Promise<Sdk> | null = null;

function sdk(): Promise<Sdk> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const appMod: any = await import(/* @vite-ignore */ `${SDK}/firebase-app.js`);
      const authMod: any = await import(/* @vite-ignore */ `${SDK}/firebase-auth.js`);
      const fsMod: any = await import(/* @vite-ignore */ `${SDK}/firebase-firestore.js`);
      const app = appMod.getApps().find((a: any) => a.name === 'keisool') ?? appMod.initializeApp(CONFIG, 'keisool');
      const auth = authMod.getAuth(app);
      let fs: any;
      try {
        fs = fsMod.initializeFirestore(app, { localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }) });
      } catch {
        fs = fsMod.getFirestore(app);
      }
      return { auth, fs, authMod, fsMod };
    })();
    sdkPromise.catch(() => {
      sdkPromise = null; // オフラインで読めなかったら次回やり直す
    });
  }
  return sdkPromise;
}

// ---------------------------------------------------------------- 状態（ログイン）
type AuthState = { status: 'loading' | 'out' | 'in' | 'error'; user: User | null; message?: string };
let authState: AuthState = { status: 'loading', user: null };
const authSubs = new Set<() => void>();
const setAuth = (s: AuthState) => {
  authState = s;
  authSubs.forEach((f) => f());
};
let authStarted = false;

function startAuth() {
  if (authStarted) return;
  authStarted = true;
  sdk()
    .then(({ auth, authMod }) => {
      authMod.getRedirectResult(auth).catch(() => {});
      authMod.onAuthStateChanged(auth, (u: any) => {
        setAuth(u ? { status: 'in', user: { uid: u.uid, name: u.displayName || u.email || '名無し', email: u.email || '' } } : { status: 'out', user: null });
      });
    })
    .catch(() => {
      authStarted = false;
      setAuth({ status: 'error', user: null, message: '通信できないため読み込めませんでした。電波のある所で開き直してね' });
    });
}

export function useAuth(): AuthState {
  startAuth();
  return useSyncExternalStore(
    (f) => {
      authSubs.add(f);
      return () => authSubs.delete(f);
    },
    () => authState,
  );
}

export async function signIn() {
  const { auth, authMod } = await sdk();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code.includes('popup-blocked') || code.includes('operation-not-supported')) {
      await authMod.signInWithRedirect(auth, provider);
      return;
    }
    if (code.includes('popup-closed') || code.includes('cancelled-popup')) return;
    throw e;
  }
}

export async function signOut() {
  const { auth, authMod } = await sdk();
  await authMod.signOut(auth);
}

const me = (): User => {
  if (!authState.user) throw new Error('ログインしてね');
  return authState.user;
};

// ---------------------------------------------------------------- チーム
export function newTeamId(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}

export async function createTeam(name: string): Promise<string> {
  const { fs, fsMod } = await sdk();
  const u = me();
  const id = newTeamId();
  await fsMod.setDoc(fsMod.doc(fs, TEAMS, id), {
    name: name.trim() || 'チーム',
    owner: u.uid,
    members: [u.uid],
    names: { [u.uid]: u.name },
    createdAt: Date.now(),
  });
  return id;
}

export async function getTeam(id: string): Promise<Team | null> {
  const { fs, fsMod } = await sdk();
  const snap = await fsMod.getDoc(fsMod.doc(fs, TEAMS, id));
  return snap.exists() ? toTeam(snap) : null;
}

export async function joinTeam(id: string) {
  const { fs, fsMod } = await sdk();
  const u = me();
  const t = await getTeam(id);
  if (!t) throw new Error('チームが見つからない（リンクが違うか、削除された）');
  if (t.members.includes(u.uid)) return;
  await fsMod.updateDoc(fsMod.doc(fs, TEAMS, id), {
    members: fsMod.arrayUnion(u.uid),
    [`names.${u.uid}`]: u.name,
  });
}

export async function leaveTeam(id: string) {
  const { fs, fsMod } = await sdk();
  const u = me();
  await fsMod.updateDoc(fsMod.doc(fs, TEAMS, id), {
    members: fsMod.arrayRemove(u.uid),
    [`names.${u.uid}`]: fsMod.deleteField(),
  });
}

export async function renameTeam(id: string, name: string) {
  const { fs, fsMod } = await sdk();
  await fsMod.updateDoc(fsMod.doc(fs, TEAMS, id), { name: name.trim() || 'チーム' });
}

function toTeam(snap: any): Team {
  const d = snap.data();
  return { id: snap.id, name: d.name ?? 'チーム', owner: d.owner, members: d.members ?? [], names: d.names ?? {} };
}

/** チーム情報をリアルタイム購読 */
export function watchTeam(id: string, cb: (t: Team | null, err?: string) => void): () => void {
  let unsub = () => {};
  let closed = false;
  sdk()
    .then(({ fs, fsMod }) => {
      if (closed) return;
      unsub = fsMod.onSnapshot(
        fsMod.doc(fs, TEAMS, id),
        (s: any) => cb(s.exists() ? toTeam(s) : null),
        (e: any) => cb(null, errText(e)),
      );
    })
    .catch(() => cb(null, '通信できません'));
  return () => {
    closed = true;
    unsub();
  };
}

// ---------------------------------------------------------------- タスク
const tasksCol = (fs: any, fsMod: any, team: string) => fsMod.collection(fs, TEAMS, team, 'tasks');

export function watchTasks(team: string, cb: (tasks: Task[], err?: string) => void): () => void {
  let unsub = () => {};
  let closed = false;
  sdk()
    .then(({ fs, fsMod }) => {
      if (closed) return;
      unsub = fsMod.onSnapshot(
        tasksCol(fs, fsMod, team),
        (qs: any) => {
          const list: Task[] = qs.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => a.createdAt - b.createdAt);
          cb(list);
        },
        (e: any) => cb([], errText(e)),
      );
    })
    .catch(() => cb([], '通信できません'));
  return () => {
    closed = true;
    unsub();
  };
}

export async function addTask(team: string, text: string, opt: { parent?: string; date?: string }) {
  await add(team, text, opt.parent ? { kind: 'task', parent: opt.parent } : { kind: 'task', date: opt.date ?? dayKey() });
}

/** 親件名（工事件名）を追加 */
export async function addProject(team: string, text: string, date: string) {
  await add(team, text, { kind: 'project', date });
}

export const orderOf = (t: Task) => t.order ?? t.createdAt;
export const byOrder = (a: Task, b: Task) => orderOf(a) - orderOf(b);

/** 並び替え：list の i 番目と j 番目を入れ替える（並び順の値を交換） */
export async function swapOrder(team: string, list: Task[], i: number, j: number) {
  if (j < 0 || j >= list.length) return;
  const { fs, fsMod } = await sdk();
  const a = list[i];
  const b = list[j];
  let oa = orderOf(a);
  let ob = orderOf(b);
  if (oa === ob) ob = oa + (j > i ? 1 : -1);
  const batch = fsMod.writeBatch(fs);
  batch.update(fsMod.doc(fs, TEAMS, team, 'tasks', a.id), { order: ob });
  batch.update(fsMod.doc(fs, TEAMS, team, 'tasks', b.id), { order: oa });
  batch.commit().catch(() => {});
}

/** 予定日を変える（明日へ送る など） */
export async function moveTask(team: string, id: string, date: string) {
  const { fs, fsMod } = await sdk();
  fsMod.updateDoc(fsMod.doc(fs, TEAMS, team, 'tasks', id), { date }).catch(() => {});
}

/** ローカル日付のキー（YYYY-MM-DD）。offset 日ずらせる */
export function dayKey(base: Date | number = new Date(), offset = 0): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const taskDate = (t: Task) => t.date ?? dayKey(t.createdAt);

async function add(team: string, text: string, extra: object) {
  const t = text.trim();
  if (!t) return;
  const { fs, fsMod } = await sdk();
  const u = me();
  // オフラインでも即反映（送信は電波が戻ったら自動）
  const now = Date.now();
  fsMod.addDoc(tasksCol(fs, fsMod, team), { text: t, ...extra, done: false, createdBy: u.uid, createdByName: u.name, createdAt: now, order: now }).catch(() => {});
}

export async function setDone(team: string, task: Task, done: boolean) {
  const { fs, fsMod } = await sdk();
  const u = me();
  fsMod
    .updateDoc(fsMod.doc(fs, TEAMS, team, 'tasks', task.id), done ? { done: true, doneBy: u.uid, doneByName: u.name, doneAt: Date.now() } : { done: false, doneBy: fsMod.deleteField(), doneByName: fsMod.deleteField(), doneAt: fsMod.deleteField() })
    .catch(() => {});
}

export async function editTask(team: string, id: string, text: string) {
  const { fs, fsMod } = await sdk();
  fsMod.updateDoc(fsMod.doc(fs, TEAMS, team, 'tasks', id), { text: text.trim() }).catch(() => {});
}

export async function deleteTask(team: string, id: string) {
  const { fs, fsMod } = await sdk();
  fsMod.deleteDoc(fsMod.doc(fs, TEAMS, team, 'tasks', id)).catch(() => {});
}

/** まとめて消す（完了だけ／全部） */
export async function clearTasks(team: string, tasks: Task[]) {
  const { fs, fsMod } = await sdk();
  for (let i = 0; i < tasks.length; i += 400) {
    const b = fsMod.writeBatch(fs);
    for (const t of tasks.slice(i, i + 400)) b.delete(fsMod.doc(fs, TEAMS, team, 'tasks', t.id));
    b.commit().catch(() => {});
  }
}

function errText(e: any): string {
  const c = String(e?.code ?? '');
  if (c.includes('permission-denied')) return 'このチームを見る権限がない（メンバーから外れたかも）';
  if (c.includes('unavailable')) return '通信できません';
  return String(e?.message ?? e);
}
