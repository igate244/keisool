// PIDシミュレーター：比例帯・積分・微分をいじると応答がどう変わるかを感覚でつかむ
import { useMemo } from 'react';
import { fmt, NumField, Seg, Section, Note, parseNum } from '../components/ui';
import { simulate, simcTuning, kcFromPb, type Process, type Tuning, type Scenario, type SimResult, type Metrics } from '../calc/pid';
import type { ToolDef, ToolProps } from './types';
import { IconPid } from './icons';

type PresetId = 'flow' | 'press' | 'temp' | 'level' | 'custom';
const PRESETS: Record<Exclude<PresetId, 'custom'>, { label: string; k: number; t: number; l: number; hint: string }> = {
  flow: { label: '流量', k: 1, t: 2, l: 0.5, hint: '速くてむだ時間が小さい。PI が基本' },
  press: { label: '圧力', k: 1, t: 8, l: 1, hint: '中くらい。PI が基本' },
  temp: { label: '温度', k: 1, t: 120, l: 20, hint: '遅くてむだ時間が大きい。D が効く' },
  level: { label: '液位', k: 1, t: 60, l: 3, hint: '遅いがむだ時間は小さい' },
};

type S = {
  preset: PresetId;
  k: string;
  t: string;
  l: string;
  pb: number;
  ti: number; // 0 = 積分なし
  td: number; // 0 = 微分なし
  pvD: boolean;
  gainView: 'pb' | 'kc';
  scenario: 'sp' | 'dist';
  pin: { pb: number; ti: number; td: number; pvD: boolean } | null;
};

const defaults: S = { preset: 'press', k: '1', t: '8', l: '1', pb: 100, ti: 10, td: 0, pvD: true, gainView: 'pb', scenario: 'sp', pin: null };

function procOf(s: S): Process | null {
  const k = parseNum(s.k);
  const t = parseNum(s.t);
  const l = parseNum(s.l);
  if (!(k > 0 && t > 0 && l >= 0)) return null;
  return { k, t, l };
}

function scenarioOf(p: Process, kind: S['scenario']): Scenario {
  const duration = Math.max(10 * (p.t + p.l), 20);
  return kind === 'sp'
    ? { sp0: 40, sp1: 60, tStep: duration * 0.05, dist: 0, tDist: Infinity, duration }
    : { sp0: 50, sp1: 50, tStep: 0, dist: -10, tDist: duration * 0.08, duration };
}

/** 対数スライダー（0〜1000）⇔ 値 */
const toPos = (v: number, min: number, max: number) => Math.round((Math.log(v / min) / Math.log(max / min)) * 1000);
const fromPos = (x: number, min: number, max: number) => min * (max / min) ** (x / 1000);
const nice = (x: number) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);

const tfmt = (sec: number) => (!Number.isFinite(sec) ? '—' : sec >= 600 ? `${fmt(sec / 60, 1)}分` : `${fmt(sec, sec >= 100 ? 0 : 1)}秒`);

function PidTool({ state: s, set }: ToolProps<S>) {
  const proc = procOf(s);
  const tuning: Tuning = { pb: s.pb, ti: s.ti, td: s.td, pvDerivative: s.pvD };
  const sc = proc ? scenarioOf(proc, s.scenario) : null;
  const res = useMemo(() => (proc && sc ? simulate(proc, tuning, sc) : null), [proc?.k, proc?.t, proc?.l, s.pb, s.ti, s.td, s.pvD, s.scenario]); // eslint-disable-line react-hooks/exhaustive-deps
  const ghost = useMemo(
    () => (proc && sc && s.pin ? simulate(proc, { pb: s.pin.pb, ti: s.pin.ti, td: s.pin.td, pvDerivative: s.pin.pvD }, sc) : null),
    [proc?.k, proc?.t, proc?.l, s.pin, s.scenario], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const scale = proc ? proc.t + proc.l : 10;
  const tiMin = Math.max(0.2, scale / 30);
  const tiMax = scale * 10;
  const tdMin = Math.max(0.05, scale / 100);
  const tdMax = scale * 1.5;
  const kc = kcFromPb(s.pb);

  const setPreset = (id: PresetId) => {
    if (id === 'custom') return set({ preset: id });
    const p = PRESETS[id];
    const pr = { k: p.k, t: p.t, l: p.l };
    const tu = simcTuning(pr, 'PI');
    set({ preset: id, k: String(p.k), t: String(p.t), l: String(p.l), pb: tu.pb, ti: tu.ti, td: 0, pin: null });
  };

  return (
    <>
      <div className="card pid-sticky">
        {res && sc ? <Chart r={res} ghost={ghost} sc={sc} /> : <Note warn>プロセスの値を入れてね</Note>}
        {res && <MetricsRow m={res.metrics} scenario={s.scenario} />}
      </div>
      <Seg
        small
        value={s.scenario}
        options={[
          { v: 'sp', label: 'SPを変える（40→60%）' },
          { v: 'dist', label: '外乱が入る（−10%）' },
        ]}
        onChange={(scenario) => set({ scenario })}
      />

      <Section
        title="チューニング"
        aside={
          <Seg
            small
            value={s.gainView}
            options={[
              { v: 'pb', label: '比例帯' },
              { v: 'kc', label: 'ゲイン' },
            ]}
            onChange={(gainView) => set({ gainView })}
          />
        }
      >
        <Slider
          label="P"
          name={s.gainView === 'pb' ? '比例帯' : '比例ゲイン'}
          value={s.gainView === 'pb' ? `${nice(s.pb)} %` : `${nice(kc)}`}
          sub={s.gainView === 'pb' ? `ゲイン ${nice(kc)}` : `比例帯 ${nice(s.pb)}%`}
          pos={1000 - toPos(s.pb, 5, 1000)}
          onPos={(x) => set({ pb: nice(fromPos(1000 - x, 5, 1000)) })}
          left="弱い（ゆっくり）"
          right="強い（キビキビ・振れやすい）"
        />
        <Slider
          label="I"
          name="積分時間"
          value={s.ti > 0 ? tfmt(s.ti) : 'なし'}
          sub={s.ti > 0 ? '短いほど偏差を早く消す' : 'P だけ → 残留偏差が残る'}
          pos={s.ti > 0 ? 1000 - toPos(Math.min(Math.max(s.ti, tiMin), tiMax), tiMin, tiMax) : 0}
          onPos={(x) => set({ ti: x < 15 ? 0 : nice(fromPos(1000 - x, tiMin, tiMax)) })}
          left="なし・長い"
          right="短い（強い）"
        />
        <Slider
          label="D"
          name="微分時間"
          value={s.td > 0 ? tfmt(s.td) : 'なし'}
          sub={s.td > 0 ? '変化にブレーキ。入れすぎるとMVが暴れる' : '遅いプロセスで効く'}
          pos={s.td > 0 ? toPos(Math.min(Math.max(s.td, tdMin), tdMax), tdMin, tdMax) : 0}
          onPos={(x) => set({ td: x < 15 ? 0 : nice(fromPos(x, tdMin, tdMax)) })}
          left="なし"
          right="長い（強い）"
        />
        <div className="grid3 pid-nums">
          <NumField label={s.gainView === 'pb' ? '比例帯 %' : 'ゲイン'} value={String(s.gainView === 'pb' ? s.pb : nice(kc))} onChange={(v) => {
            const n = parseNum(v);
            if (n > 0) set({ pb: s.gainView === 'pb' ? n : nice(100 / n) });
          }} allowNegative={false} />
          <NumField label="積分 秒" value={String(s.ti)} onChange={(v) => {
            const n = parseNum(v);
            if (n >= 0) set({ ti: n });
          }} allowNegative={false} />
          <NumField label="微分 秒" value={String(s.td)} onChange={(v) => {
            const n = parseNum(v);
            if (n >= 0) set({ td: n });
          }} allowNegative={false} />
        </div>
        <label className="switch-row">
          <span>
            <b>微分先行（PV微分）</b>
            <small>SPを変えたときにMVが跳ねない。調節計の多くはこれ</small>
          </span>
          <input type="checkbox" checked={s.pvD} onChange={(e) => set({ pvD: e.target.checked })} />
        </label>
        <div className="pid-actions">
          <button onClick={() => set({ pin: s.pin ? null : { pb: s.pb, ti: s.ti, td: s.td, pvD: s.pvD } })}>{s.pin ? '比較を消す' : '今の波形を比較用に残す'}</button>
          {proc && (
            <>
              <button onClick={() => set({ ...pick(simcTuning(proc, 'PI')) })}>おすすめ PI</button>
              <button onClick={() => set({ ...pick(simcTuning(proc, 'PID')) })}>おすすめ PID</button>
            </>
          )}
        </div>
        {s.pin && (
          <Note>
            灰色の点線：比例帯 {nice(s.pin.pb)}%・積分 {s.pin.ti || 'なし'}・微分 {s.pin.td || 'なし'}
          </Note>
        )}
      </Section>

      {res && proc && <Advice m={res.metrics} s={s} p={proc} />}

      <Section title="プロセス（制御対象）">
        <Seg
          small
          value={s.preset}
          options={[...Object.entries(PRESETS).map(([v, p]) => ({ v: v as PresetId, label: p.label })), { v: 'custom', label: '自由' }]}
          onChange={setPreset}
        />
        {s.preset !== 'custom' && <Note>{PRESETS[s.preset].hint}</Note>}
        <div className="grid3">
          <NumField label="ゲイン K" value={s.k} onChange={(k) => set({ k, preset: 'custom' })} allowNegative={false} />
          <NumField label="時定数 秒" value={s.t} onChange={(t) => set({ t, preset: 'custom' })} allowNegative={false} />
          <NumField label="むだ時間 秒" value={s.l} onChange={(l) => set({ l, preset: 'custom' })} allowNegative={false} />
        </div>
        <Note>一次遅れ＋むだ時間のモデル。むだ時間 ÷ 時定数 が大きいほど制御は難しい（今 {proc ? fmt(proc.l / proc.t, 2) : '—'}）</Note>
      </Section>

      <Section title="覚え書き">
        <ul className="pid-guide">
          <li>
            <b>比例帯 ＝ 100 ÷ ゲイン</b>。比例帯を<b>狭く</b>＝ゲインを<b>上げる</b>と速くなるが振れやすい
          </li>
          <li>
            <b>積分</b>は残った偏差を消す。積分時間が<b>短い</b>ほど強い。短すぎるとうねる
          </li>
          <li>
            <b>微分</b>は変化にブレーキをかける。むだ時間の大きい温度などで効く。ノイズの多い流量では使わない
          </li>
          <li>横河 UT35A・azbil SDC 系とも P＝比例帯[%]、I＝積分時間[秒]、D＝微分時間[秒] の設定</li>
          <li>調整の順番：I・Dを切ってPで振れない所を探す → Iを入れる → 必要ならD</li>
        </ul>
      </Section>
    </>
  );
}

const pick = (t: Tuning) => ({ pb: t.pb, ti: t.ti, td: t.td, pvD: t.pvDerivative });

function Slider({ label, name, value, sub, pos, onPos, left, right }: { label: string; name: string; value: string; sub: string; pos: number; onPos: (x: number) => void; left: string; right: string }) {
  return (
    <div className="pid-slider">
      <div className="ps-head">
        <span className="ps-badge">{label}</span>
        <span className="ps-name">{name}</span>
        <b className="num">{value}</b>
      </div>
      <input type="range" min={0} max={1000} step={1} value={pos} onChange={(e) => onPos(Number(e.target.value))} aria-label={name} />
      <div className="ps-foot">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <small className="ps-sub">{sub}</small>
    </div>
  );
}

function MetricsRow({ m, scenario }: { m: Metrics; scenario: S['scenario'] }) {
  if (scenario === 'dist') {
    return (
      <div className="pid-metrics">
        <span>外乱に対して、PV がどれだけ下がってどう戻るかを見る</span>
      </div>
    );
  }
  return (
    <div className="pid-metrics">
      <div className={m.overshoot > 20 ? 'bad' : ''}>
        <small>行き過ぎ</small>
        <b>{fmt(m.overshoot, 1)}%</b>
      </div>
      <div>
        <small>整定</small>
        <b>{tfmt(m.settlingTime)}</b>
      </div>
      <div className={Math.abs(m.offset) > 0.3 ? 'bad' : ''}>
        <small>残留偏差</small>
        <b>{fmt(m.offset, 2)}%</b>
      </div>
    </div>
  );
}

function Advice({ m, s, p }: { m: Metrics; s: S; p: Process }) {
  const tips: string[] = [];
  if (m.oscillating) tips.push('振れ続けてる → 比例帯を広げる（ゲインを下げる）か、積分時間を長くする');
  else if (s.scenario === 'sp' && m.overshoot > 20) tips.push('行き過ぎが大きい → 比例帯を少し広げるか、積分時間を長くする。微分を少し足すのも手');
  if (s.ti === 0 && s.scenario === 'sp' && Math.abs(m.offset) > 0.3) tips.push('P だけなので残留偏差が残る → 積分を入れる');
  if (s.scenario === 'sp' && !m.oscillating && m.overshoot < 1 && Number.isFinite(m.settlingTime) && m.settlingTime > 6 * (p.t + p.l)) tips.push('安定だけど遅い → 比例帯を狭める（ゲインを上げる）か、積分時間を短くする');
  if (m.saturated) tips.push('MV が 0% か 100% に張り付いてる時間がある（実機ならバルブ全開・全閉）');
  if (s.td > 0 && !s.pvD && s.scenario === 'sp') tips.push('偏差微分なので SP を変えた瞬間に MV が跳ねる → 微分先行にすると跳ねない');
  if (!tips.length) tips.push('いい感じ。ここから比例帯や積分時間を動かすと、波形がどう変わるか比べてみて');
  return (
    <Section title="診断">
      <ul className="pid-tips">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Section>
  );
}

/** 応答のグラフ（PV・SP・MV、比較用の PV） */
function Chart({ r, ghost, sc }: { r: SimResult; ghost: SimResult | null; sc: Scenario }) {
  const W = 340;
  const H = 210;
  const pad = { l: 30, r: 30, t: 10, b: 22 };
  const pvs = [...r.pv, ...r.sp, ...(ghost?.pv ?? [])];
  let lo = Math.min(...pvs);
  let hi = Math.max(...pvs);
  const span = Math.max(hi - lo, 10);
  lo = Math.floor((lo - span * 0.12) / 5) * 5;
  hi = Math.ceil((hi + span * 0.12) / 5) * 5;
  const x = (t: number) => pad.l + (t / sc.duration) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ym = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const path = (vals: number[], yy: (v: number) => number) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(r.t[i]).toFixed(1)},${yy(v).toFixed(1)}`).join('');
  const ticks = [lo, (lo + hi) / 2, hi];
  const tEnd = sc.duration;
  return (
    <div className="pid-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="応答グラフ">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="pc-grid" />
            <text x={pad.l - 4} y={y(v) + 3} className="pc-ax" textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {[0, 50, 100].map((v) => (
          <text key={v} x={W - pad.r + 4} y={ym(v) + 3} className="pc-ax mv">
            {v}
          </text>
        ))}
        <text x={pad.l} y={H - 6} className="pc-ax">
          0
        </text>
        <text x={W - pad.r} y={H - 6} className="pc-ax" textAnchor="end">
          {tfmt(tEnd)}
        </text>
        <path d={path(r.mv, ym)} className="pc-mv" />
        {ghost && <path d={path(ghost.pv, y)} className="pc-ghost" />}
        <path d={path(r.sp, y)} className="pc-sp" />
        <path d={path(r.pv, y)} className="pc-pv" />
      </svg>
      <div className="pc-legend">
        <span className="l-pv">PV</span>
        <span className="l-sp">SP</span>
        <span className="l-mv">MV（右目盛）</span>
        {ghost && <span className="l-ghost">比較</span>}
      </div>
    </div>
  );
}

export const pidTool: ToolDef<S> = {
  id: 'pid',
  name: 'PIDシミュレーター',
  desc: '比例帯・積分・微分を動かして応答の変化を見る',
  group: 'control',
  keywords: ['pid', 'ピーアイディー', '比例帯', 'ゲイン', '積分', '微分', 'チューニング', '調節計', 'オーバーシュート', 'ハンチング', 'ut35a', 'azbil', 'sdc', '制御'],
  icon: IconPid,
  defaults,
  Component: PidTool,
  summary: (s) => {
    const p = procOf(s);
    if (!p) return null;
    const r = simulate(p, { pb: s.pb, ti: s.ti, td: s.td, pvDerivative: s.pvD }, scenarioOf(p, 'sp'));
    return `PID P${nice(s.pb)}% I${s.ti || '-'} D${s.td || '-'}（K${p.k} T${p.t} L${p.l}）：OS ${fmt(r.metrics.overshoot, 1)}% 整定 ${tfmt(r.metrics.settlingTime)}`;
  },
};
