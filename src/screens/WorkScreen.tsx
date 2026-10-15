import { useEffect, useRef, useState } from 'react';
import { useAuth, signIn, signOut, createTeam, joinTeam, leaveTeam, renameTeam, watchTeam, watchTasks, addTask, setDone, editTask, deleteTask, clearTasks, getTeam, type Task, type Team } from '../cloud';
import { useData, setTeamId } from '../store';
import { go } from '../router';
import { toast } from '../components/ui';

const today = () => {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
};
const hm = (t?: number) => (t ? new Date(t).toTimeString().slice(0, 5) : '');
const dayOf = (t: number) => new Date(t).toDateString();
const inviteUrl = (id: string) => `${location.origin}${location.pathname}#/join/${id}`;

export function WorkScreen() {
  const auth = useAuth();
  const d = useData();

  return (
    <div className="screen work">
      <header className="page-head">
        <h1>
          今日のワーク<small className="head-date">{today()}</small>
        </h1>
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

  const todo = (tasks ?? []).filter((t) => !t.done);
  const done = (tasks ?? []).filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const submit = () => {
    if (!text.trim()) return;
    addTask(teamId, text);
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

      <form
        className="add-task"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="タスクを追加" enterKeyHint="done" />
        <button type="submit" disabled={!text.trim()} aria-label="追加">
          ＋
        </button>
      </form>

      {err && <p className="note warn">{err}</p>}
      {tasks === null && !err && <p className="empty">読み込み中…</p>}

      {tasks && (
        <section className="task-list">
          {todo.length === 0 && done.length === 0 && <p className="empty">まだタスクなし。上から追加してね</p>}
          {todo.map((t) => (
            <TaskRow key={t.id} t={t} teamId={teamId} />
          ))}
          {done.length > 0 && (
            <>
              <h2 className="done-head">
                完了 {done.length}
              </h2>
              {done.map((t) => (
                <TaskRow key={t.id} t={t} teamId={teamId} />
              ))}
            </>
          )}
        </section>
      )}

      {tasks && tasks.length > 0 && (
        <div className="clear-row">
          <button
            disabled={done.length === 0}
            onClick={() => {
              if (window.confirm(`完了した${done.length}件を消す？（みんなの画面からも消える）`)) clearTasks(teamId, done);
            }}
          >
            完了を消す
          </button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(`タスクを全部（${tasks.length}件）消す？（みんなの画面からも消える）`)) clearTasks(teamId, tasks);
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

function TaskRow({ t, teamId }: { t: Task; teamId: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(t.text);
  const old = dayOf(t.createdAt) !== new Date().toDateString();
  if (editing) {
    return (
      <div className="task editing">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (val.trim()) editTask(teamId, t.id, val);
              setEditing(false);
            }
          }}
        />
        <div className="task-edit-actions">
          <button
            onClick={() => {
              if (val.trim()) editTask(teamId, t.id, val);
              setEditing(false);
            }}
          >
            保存
          </button>
          <button className="danger" onClick={() => deleteTask(teamId, t.id)}>
            削除
          </button>
          <button onClick={() => (setVal(t.text), setEditing(false))}>やめる</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`task ${t.done ? 'done' : ''}`}>
      <button className="check" onClick={() => setDone(teamId, t, !t.done)} aria-label={t.done ? '未完了に戻す' : '完了にする'}>
        <svg viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
      <button className="task-text" onClick={() => (setVal(t.text), setEditing(true))}>
        <span>{t.text}</span>
        <small>
          {t.done ? `✓ ${t.doneByName ?? ''} ${hm(t.doneAt)}` : `${t.createdByName}${old ? '・前日から' : ''}`}
        </small>
      </button>
    </div>
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
