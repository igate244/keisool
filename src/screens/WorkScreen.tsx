import { useEffect, useRef, useState } from 'react';
import { useAuth, signIn, signOut, createTeam, joinTeam, leaveTeam, renameTeam, watchTeam, watchTasks, addTask, addProject, moveTask, dayKey, taskDate, byOrder, swapOrder, setDone, editTask, deleteTask, clearTasks, getTeam, type Task, type Team } from '../cloud';
import { useData, setTeamId } from '../store';
import { go } from '../router';
import { toast } from '../components/ui';

const parseDay = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const shiftDay = (k: string, n: number) => dayKey(parseDay(k), n);
const dayLabel = (k: string) => {
  const d = parseDay(k);
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
};
const relLabel = (k: string) => {
  const diff = Math.round((parseDay(k).getTime() - parseDay(dayKey()).getTime()) / 864e5);
  return ({ [-2]: 'おととい', [-1]: '昨日', 0: '今日', 1: '明日', 2: 'あさって' } as Record<number, string>)[diff] ?? (diff > 0 ? `${diff}日後` : `${-diff}日前`);
};
const hm = (t?: number) => (t ? new Date(t).toTimeString().slice(0, 5) : '');
const inviteUrl = (id: string) => `${location.origin}${location.pathname}#/join/${id}`;

export function WorkScreen() {
  const auth = useAuth();
  const d = useData();

  return (
    <div className="screen work">
      <header className="page-head">
        <h1>ワーク</h1>
      </header>
      {auth.status === 'loading' && <p className="empty">読み込み中…</p>}
      {auth.status === 'error' && <p className="empty">{auth.message}</p>}
      {auth.status === 'out' && <SignIn />}
      {auth.status === 'in' && (d.teamId ? <TeamView teamId={d.teamId} uid={auth.user!.uid} /> : <NoTeam />)}
    </div>
  );
}

function SignIn({ lead }: { lead?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="card intro">
      <p>{lead ?? '仕事仲間とタスクをリアルタイムで共有できる。誰かがチェックすると、みんなのスマホにすぐ反映される。'}</p>
      <button
        className="primary-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signIn();
          } catch (e) {
            toast(`ログインできませんでした：${String((e as Error).message ?? e)}`);
          } finally {
            setBusy(false);
          }
        }}
      >
        Googleでログイン
      </button>
      <p className="note">ログインはチームのメンバー確認だけに使う。タスクはクラウド（Firebase）に保存される。</p>
    </section>
  );
}

function NoTeam() {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    try {
      const id = await createTeam(name || 'チーム');
      setTeamId(id);
    } catch (e) {
      toast(`作れませんでした：${String((e as Error).message ?? e)}`);
    } finally {
      setBusy(false);
    }
  };
  const join = () => {
    const m = link.trim().match(/([a-z0-9]{20,})\s*$/i);
    if (!m) return toast('招待リンクを貼ってね');
    go(`join/${m[1]}`);
  };
  return (
    <>
      <section className="card">
        <div className="card-head">
          <h3>チームを作る</h3>
        </div>
        <label className="field small">
          <span className="field-label">チーム名</span>
          <span className="field-box">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：計装班" />
          </span>
        </label>
        <button className="primary-btn" disabled={busy} onClick={make}>
          作る
        </button>
        <p className="note">作ったら招待リンクを仲間に送れば参加できる</p>
      </section>
      <section className="card">
        <div className="card-head">
          <h3>招待リンクで参加</h3>
        </div>
        <label className="field small">
          <span className="field-label">招待リンク</span>
          <span className="field-box">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://keisool.web.app/#/join/…" />
          </span>
        </label>
        <button className="wide-btn" onClick={join}>
          参加する
        </button>
      </section>
      <AccountRow />
    </>
  );
}

function AccountRow() {
  const auth = useAuth();
  return (
    <p className="account">
      {auth.user?.name}（{auth.user?.email}）でログイン中・
      <button className="link-btn" onClick={() => signOut()}>
        ログアウト
      </button>
    </p>
  );
}

function TeamView({ teamId, uid }: { teamId: string; uid: string }) {
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [showTeam, setShowTeam] = useState(false);
  const [day, setDay] = useState(dayKey());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => watchTeam(teamId, (t, e) => (e ? setErr(e) : setTeam(t))), [teamId]);
  useEffect(() => watchTasks(teamId, (t, e) => (e ? setErr(e) : (setErr(''), setTasks(t)))), [teamId]);

  if (team === null || (team && !team.members.includes(uid))) {
    return (
      <section className="card">
        <p>このチームにはもう入っていない（または削除された）。</p>
        <button className="wide-btn" onClick={() => setTeamId(null)}>
          チームを選び直す
        </button>
      </section>
    );
  }

  const today = dayKey();
  const all = tasks ?? [];
  const projects = all.filter((t) => t.kind === 'project').sort(byOrder);
  const projectIds = new Set(projects.map((p) => p.id));
  const childrenOf = (id: string) => all.filter((t) => t.kind !== 'project' && t.parent === id).sort(byOrder);
  const isLoose = (t: Task) => t.kind !== 'project' && !(t.parent && projectIds.has(t.parent));
  const finished = (t: Task) => {
    if (t.kind !== 'project') return t.done;
    const c = childrenOf(t.id);
    return c.length > 0 && c.every((x) => x.done);
  };
  // その日の分＋（今日を見ているときは）前の日から終わっていない分を繰り越して表示
  const visible = (t: Task) => taskDate(t) === day || (day === today && taskDate(t) < today && !finished(t));
  const shownProjects = projects.filter(visible);
  const loose = all.filter((t) => isLoose(t) && visible(t)).sort(byOrder);
  const shownTasks = [...shownProjects.flatMap((p) => childrenOf(p.id)), ...loose];
  const doneTasks = shownTasks.filter((t) => t.done);
  const finishedProjects = shownProjects.filter(finished);
  const everything = [...shownProjects, ...shownTasks];
  const submit = () => {
    if (!text.trim()) return;
    addProject(teamId, text, day);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <>
      <button className="team-bar" onClick={() => setShowTeam((v) => !v)}>
        <span className="team-dot" />
        <b>{team?.name ?? '…'}</b>
        <small>{team ? `${team.members.length}人` : ''}</small>
        <span className="team-more">{showTeam ? '閉じる' : '招待・メンバー'}</span>
      </button>
      {showTeam && team && <TeamPanel team={team} uid={uid} />}

      <div className="day-nav">
        <button onClick={() => setDay(shiftDay(day, -1))} aria-label="前の日">
          <svg viewBox="0 0 24 24">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="day-label">
          <b>{relLabel(day)}</b>
          <small>{dayLabel(day)}</small>
        </div>
        <button onClick={() => setDay(shiftDay(day, 1))} aria-label="次の日">
          <svg viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {day !== today && (
        <button className="back-today" onClick={() => setDay(today)}>
          今日に戻る
        </button>
      )}

      <form
        className="add-task"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={day === today ? '工事件名を追加' : `${relLabel(day)}の工事件名を追加`} enterKeyHint="done" />
        <button type="submit" disabled={!text.trim()} aria-label="工事件名を追加">
          ＋
        </button>
      </form>

      {err && <p className="note warn">{err}</p>}
      {tasks === null && !err && <p className="empty">読み込み中…</p>}

      {tasks && (
        <section className="task-list">
          {everything.length === 0 && <p className="empty">{all.length === 0 ? 'まず工事件名を追加して、その中に作業を入れてね' : `${relLabel(day)}の予定はまだなし`}</p>}
          {shownProjects.map((p, i) => (
            <ProjectCard
              key={p.id}
              p={p}
              items={childrenOf(p.id)}
              teamId={teamId}
              day={day}
              move={(dir) => swapOrder(teamId, shownProjects, i, i + dir)}
              canUp={i > 0}
              canDown={i < shownProjects.length - 1}
            />
          ))}
          {loose.length > 0 && <ProjectCard items={loose} teamId={teamId} day={day} />}
        </section>
      )}

      {tasks && everything.length > 0 && (
        <div className="clear-row">
          <button
            disabled={doneTasks.length === 0}
            onClick={() => {
              const extra = finishedProjects.length ? `と、作業が全部終わった工事件名${finishedProjects.length}件` : '';
              if (window.confirm(`完了した作業${doneTasks.length}件${extra}を消す？（みんなの画面からも消える）`)) clearTasks(teamId, [...doneTasks, ...finishedProjects]);
            }}
          >
            完了を消す
          </button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(`${relLabel(day)}の工事件名・作業を全部（${everything.length}件）消す？（みんなの画面からも消える）`)) clearTasks(teamId, everything);
            }}
          >
            全部クリア
          </button>
        </div>
      )}
      <AccountRow />
    </>
  );
}

/** 工事件名（親）とその作業（子）＝指示書。p がないときは件名なしの作業 */
function ProjectCard({
  p,
  items,
  teamId,
  day,
  move,
  canUp,
  canDown,
}: {
  p?: Task;
  items: Task[];
  teamId: string;
  day: string;
  move?: (dir: -1 | 1) => void;
  canUp?: boolean;
  canDown?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState('');
  const [name, setName] = useState(p?.text ?? '');
  useEffect(() => setName(p?.text ?? ''), [p?.text]);
  const doneCount = items.filter((t) => t.done).length;
  const allDone = items.length > 0 && doneCount === items.length;
  const carried = p && taskDate(p) < day;
  const add = () => {
    if (!adding.trim()) return;
    addTask(teamId, adding, { parent: p?.id, date: day });
    setAdding('');
  };
  const finishEdit = () => {
    if (p && name.trim() && name.trim() !== p.text) editTask(teamId, p.id, name);
    setEdit(false);
  };

  return (
    <div className={`project ${allDone ? 'all-done' : ''} ${p ? '' : 'loose'} ${edit ? 'editing' : ''}`}>
      <div className="project-head">
        {edit && p ? (
          <input className="project-name-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishEdit()} />
        ) : (
          <button className="project-name" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <svg viewBox="0 0 24 24" className={`chev ${open ? 'open' : ''}`}>
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span className="pn-text">
              <b>{p ? p.text : '件名なし'}</b>
              <small>
                {items.length > 0 ? (allDone ? '全部完了' : `${doneCount}/${items.length}`) : '手順なし'}
                {carried ? `・${relLabel(taskDate(p!))}から` : ''}
              </small>
            </span>
          </button>
        )}
        {edit ? (
          <button className="pill accent" onClick={finishEdit}>
            完了
          </button>
        ) : (
          <button className="icon-mini" onClick={() => (setOpen(true), setEdit(true))} aria-label="編集・並べ替え">
            <svg viewBox="0 0 24 24">
              <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
            </svg>
          </button>
        )}
        {items.length > 0 && !edit && (
          <span className="progress" aria-hidden>
            <i style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </span>
        )}
      </div>

      {open && (
        <ol className="steps">
          {items.map((t, i) => (
            <StepRow
              key={t.id}
              t={t}
              n={i + 1}
              teamId={teamId}
              edit={edit}
              onUp={i > 0 ? () => swapOrder(teamId, items, i, i - 1) : undefined}
              onDown={i < items.length - 1 ? () => swapOrder(teamId, items, i, i + 1) : undefined}
            />
          ))}
          {p && (
            <li className="step add">
              <span className="step-no">{items.length + 1}</span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
              >
                <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="手順を追加" enterKeyHint="done" />
                {adding.trim() && <button type="submit">追加</button>}
              </form>
            </li>
          )}
        </ol>
      )}

      {edit && p && (
        <div className="project-actions">
          {move && (
            <>
              <button disabled={!canUp} onClick={() => move(-1)}>
                ▲ 件名を上へ
              </button>
              <button disabled={!canDown} onClick={() => move(1)}>
                ▼ 件名を下へ
              </button>
            </>
          )}
          <button
            onClick={() => {
              moveTask(teamId, p.id, shiftDay(day, 1));
              toast(`「${p.text}」を${relLabel(shiftDay(day, 1))}へ送った`);
            }}
          >
            翌日へ
          </button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(`「${p.text}」と手順${items.length}件を消す？`)) clearTasks(teamId, [p, ...items]);
            }}
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}

/** 手順1行。普段はタップでチェック、編集中は文字を直す・▲▼で並べ替え・×で削除 */
function StepRow({ t, n, teamId, edit, onUp, onDown }: { t: Task; n: number; teamId: string; edit: boolean; onUp?: () => void; onDown?: () => void }) {
  const [val, setVal] = useState(t.text);
  useEffect(() => setVal(t.text), [t.text]);
  const save = () => {
    if (val.trim() && val.trim() !== t.text) editTask(teamId, t.id, val);
  };
  if (edit) {
    return (
      <li className="step editing">
        <span className="step-no">{n}</span>
        <input value={val} onChange={(e) => setVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
        <button className="sq" disabled={!onUp} onClick={onUp} aria-label="上へ">
          ▲
        </button>
        <button className="sq" disabled={!onDown} onClick={onDown} aria-label="下へ">
          ▼
        </button>
        <button className="sq danger" onClick={() => deleteTask(teamId, t.id)} aria-label="削除">
          ×
        </button>
      </li>
    );
  }
  return (
    <li className={`step ${t.done ? 'done' : ''}`}>
      <button className="step-main" onClick={() => setDone(teamId, t, !t.done)} aria-pressed={t.done}>
        <span className="step-no">{n}</span>
        <span className="step-text">{t.text}</span>
        {t.done && (
          <small className="step-who">
            {t.doneByName} {hm(t.doneAt)}
          </small>
        )}
      </button>
    </li>
  );
}

function TeamPanel({ team, uid }: { team: Team; uid: string }) {
  const url = inviteUrl(team.id);
  const share = async () => {
    const msg = `Keisoolの「${team.name}」に参加して：`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Keisool 招待', text: msg, url });
        return;
      } catch {
        return;
      }
    }
    navigator.clipboard?.writeText(`${msg}\n${url}`).then(() => toast('招待リンクをコピーした'));
  };
  return (
    <section className="card team-panel">
      <button className="primary-btn" onClick={share}>
        招待リンクを送る
      </button>
      <p className="note">リンクを知っている人は誰でも参加できるので、仲間にだけ送ってね</p>
      <div className="members">
        {team.members.map((m) => (
          <span key={m} className={m === uid ? 'me' : ''}>
            {team.names[m] ?? '？'}
            {m === team.owner ? '（作成者）' : ''}
          </span>
        ))}
      </div>
      <div className="clear-row">
        <button
          onClick={() => {
            const n = window.prompt('チーム名', team.name);
            if (n != null) renameTeam(team.id, n);
          }}
        >
          名前を変える
        </button>
        <button
          className="danger"
          onClick={async () => {
            if (!window.confirm(`「${team.name}」を抜ける？`)) return;
            try {
              await leaveTeam(team.id);
            } catch {
              /* 抜けた後は読めなくなる */
            }
            setTeamId(null);
          }}
        >
          チームを抜ける
        </button>
      </div>
    </section>
  );
}

/** 招待リンクから開いたとき */
export function JoinScreen({ teamId }: { teamId: string }) {
  const auth = useAuth();
  const d = useData();
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status !== 'in') return;
    getTeam(teamId)
      .then(setTeam)
      .catch(() => setTeam(null));
  }, [auth.status, teamId]);

  const member = team && auth.user && team.members.includes(auth.user.uid);

  return (
    <div className="screen">
      <header className="page-head">
        <h1>チームに参加</h1>
      </header>
      {auth.status === 'loading' && <p className="empty">読み込み中…</p>}
      {auth.status === 'error' && <p className="empty">{auth.message}</p>}
      {auth.status === 'out' && <SignIn lead="招待されたチームに参加するには、まずGoogleでログインしてね。" />}
      {auth.status === 'in' && team === undefined && <p className="empty">チームを確認中…</p>}
      {auth.status === 'in' && team === null && <p className="empty">チームが見つからない（リンクが違うか、削除された）</p>}
      {auth.status === 'in' && team && (
        <section className="card intro">
          <p>
            <b className="big-name">{team.name}</b>
            <br />
            メンバー {team.members.length}人：{team.members.map((m) => team.names[m]).filter(Boolean).join('、')}
          </p>
          {d.teamId && d.teamId !== team.id && <p className="note">いまのチームからこのチームに切り替わる</p>}
          <button
            className="primary-btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (!member) await joinTeam(team.id);
                setTeamId(team.id);
                location.replace('#/work');
              } catch (e) {
                toast(`参加できませんでした：${String((e as Error).message ?? e)}`);
              } finally {
                setBusy(false);
              }
            }}
          >
            {member ? 'このチームを開く' : '参加する'}
          </button>
        </section>
      )}
    </div>
  );
}
