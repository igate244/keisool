import { fmt, NumField, Seg, Section, Note, parseNum, copy } from '../components/ui';
import { levelRange, dpAt, MMH2O_TO_KPA, type LevelMode, type LevelInput } from '../calc/dplevel';
import { pctToSig } from '../calc/signal';
import type { ToolDef, ToolProps } from './types';
import { IconLevel } from './icons';

type S = {
  mode: LevelMode;
  sg: string;
  l0: string;
  l1: string;
  h: string;
  hpSame: boolean; // 高圧側導圧管は測定液と同じ（直結）
  sgHP: string;
  d: string;
  sgLP: string;
  unit: 'mmH2O' | 'kPa';
  lvl: string; // 液位から信号を見る
};

const defaults: S = { mode: 'open', sg: '1.0', l0: '0', l1: '2000', h: '0', hpSame: true, sgHP: '0.93', d: '2000', sgLP: '0.93', unit: 'mmH2O', lvl: '' };

function toInput(s: S): LevelInput | null {
  const sg = parseNum(s.sg);
  const l0 = parseNum(s.l0);
  const l1 = parseNum(s.l1);
  const h = parseNum(s.h) || 0;
  const sgHP = s.hpSame ? sg : parseNum(s.sgHP);
  const d = parseNum(s.d);
  const sgLP = parseNum(s.sgLP);
  if (![sg, l0, l1, sgHP].every(Number.isFinite) || l0 === l1 || sg <= 0) return null;
  if (s.mode === 'wet' && ![d, sgLP].every(Number.isFinite)) return null;
  return { mode: s.mode, sg, l0, l1, h, sgHP, d: Number.isFinite(d) ? d : 0, sgLP: Number.isFinite(sgLP) ? sgLP : 0 };
}

const KIND_LABEL = { none: 'ゼロ移調なし', suppression: 'ゼロサプレッション（＋）', elevation: 'ゼロエレベーション（−）' };

function LevelTool({ state: s, set }: ToolProps<S>) {
  const p = toInput(s);
  const r = p ? levelRange(p) : null;
  const k = s.unit === 'kPa' ? MMH2O_TO_KPA : 1;
  const dg = s.unit === 'kPa' ? 3 : 1;
  const show = (mm: number) => fmt(mm * k, dg);
  const lvl = parseNum(s.lvl);
  const pct = p && Number.isFinite(lvl) ? ((lvl - p.l0) / (p.l1 - p.l0)) * 100 : NaN;
  const lvlDp = p && Number.isFinite(lvl) ? dpAt(p, lvl) : NaN;

  return (
    <>
      <Section>
        <Seg
          value={s.mode}
          options={[
            { v: 'open', label: '開放タンク' },
            { v: 'dry', label: '密閉・ドライ' },
            { v: 'wet', label: '密閉・ウェット' },
          ]}
          onChange={(mode) => set({ mode })}
          small
        />
        <LevelDiagram mode={s.mode} />
      </Section>

      <Section title="条件">
        <NumField label="測定液の比重" value={s.sg} onChange={(sg) => set({ sg })} allowNegative={false} />
        <div className="grid2">
          <NumField label="レベル 0%" unit="mm" value={s.l0} onChange={(l0) => set({ l0 })} hint="下側タップから" />
          <NumField label="レベル 100%" unit="mm" value={s.l1} onChange={(l1) => set({ l1 })} />
        </div>
        <NumField label="伝送器の取付高さ" unit="mm" value={s.h} onChange={(h) => set({ h })} hint="下側タップより下なら＋、上なら−" />
        <Seg
          small
          value={s.hpSame ? 'same' : 'seal'}
          options={[
            { v: 'same', label: '高圧側：測定液で満液' },
            { v: 'seal', label: '高圧側：封入液' },
          ]}
          onChange={(v) => set({ hpSame: v === 'same' })}
        />
        {!s.hpSame && <NumField label="高圧側 封入液の比重" value={s.sgHP} onChange={(sgHP) => set({ sgHP })} allowNegative={false} />}
        {s.mode === 'wet' && (
          <div className="grid2">
            <NumField label="タップ間の高さ" unit="mm" value={s.d} onChange={(d) => set({ d })} allowNegative={false} />
            <NumField label="低圧側の比重" value={s.sgLP} onChange={(sgLP) => set({ sgLP })} allowNegative={false} hint="ウェットレグ/封入液" />
          </div>
        )}
      </Section>

      <Section title="レンジ" aside={<Seg small value={s.unit} options={[{ v: 'mmH2O', label: 'mmH₂O' }, { v: 'kPa', label: 'kPa' }]} onChange={(unit) => set({ unit })} />}>
        {r ? (
          <>
            <div className="range-out">
              <button type="button" onClick={() => copy(show(r.lrv))}>
                <span>LRV</span>
                <b className="num">{show(r.lrv)}</b>
              </button>
              <button type="button" onClick={() => copy(show(r.urv))}>
                <span>URV</span>
                <b className="num">{show(r.urv)}</b>
              </button>
              <button type="button" onClick={() => copy(show(r.span))}>
                <span>スパン</span>
                <b className="num">{show(r.span)}</b>
              </button>
            </div>
            <Note>
              {s.unit} ・{KIND_LABEL[r.kind]}
            </Note>
          </>
        ) : (
          <Note warn>比重とレベル範囲を入れてね</Note>
        )}
      </Section>

      {r && p && (
        <Section title="液位 → 差圧・信号">
          <NumField label="液位" unit="mm" value={s.lvl} onChange={(lvl) => set({ lvl })} />
          <div className="kv-list">
            <div className="kv">
              <span>レベル</span>
              <b>{fmt(pct, 2)} %</b>
            </div>
            <div className="kv">
              <span>差圧</span>
              <b>
                {show(lvlDp)} {s.unit}
              </b>
            </div>
            <div className="kv">
              <span>出力</span>
              <b>{fmt(pctToSig('4-20mA', pct), 3)} mA</b>
            </div>
          </div>
          {Number.isFinite(pct) && (pct < 0 || pct > 100) && <Note warn>レンジ外</Note>}
          <Note>レベル {s.l0}〜{s.l1}mm を 4〜20mA として計算</Note>
        </Section>
      )}

      <Section>
        <Note>差圧 = 比重 × 液位 + 高圧側の液柱 − 低圧側の液柱（すべて mm × 比重 = mmH₂O）。ドライレグ・開放タンクは低圧側 0 として計算</Note>
      </Section>
    </>
  );
}

function LevelDiagram({ mode }: { mode: LevelMode }) {
  const closed = mode !== 'open';
  const wet = mode === 'wet';
  return (
    <svg className="diagram" viewBox="0 0 320 170" role="img" aria-label="取付図">
      {/* タンク */}
      <path d={closed ? 'M40 20 H140 V150 H40 Z' : 'M40 20 V150 H140 V20'} className="d-line" />
      <rect x="42" y="70" width="96" height="78" className="d-liquid" />
      <text x="90" y="112" className="d-text" textAnchor="middle">測定液</text>
      {/* 下側タップ（HP） */}
      <path d="M140 140 H200 V160" className="d-pipe hp" />
      {/* 上側タップ（LP） */}
      {closed && <path d="M140 30 H240 V160" className={`d-pipe ${wet ? 'lp-wet' : 'lp'}`} />}
      {/* 伝送器 */}
      <rect x="188" y="150" width="64" height="16" rx="4" className="d-tx" />
      <text x="220" y="162" className="d-text small" textAnchor="middle">DP</text>
      <text x="196" y="146" className="d-text small">H</text>
      <text x="246" y="146" className="d-text small">L</text>
      {closed && <text x="250" y="80" className="d-text small">{wet ? 'ウェットレグ／シール' : 'ドライ（気相）'}</text>}
      {!closed && <text x="210" y="80" className="d-text small">L側は大気開放</text>}
      <text x="20" y="144" className="d-text small">0%</text>
    </svg>
  );
}

export const levelTool: ToolDef<S> = {
  id: 'level',
  name: '差圧レベル計',
  desc: 'LRV/URV 計算（ゼロ移調・封入液・ウェットレグ）',
  group: 'process',
  keywords: ['差圧', 'レベル', '液位', 'dp', 'ゼロ移調', 'サプレッション', 'エレベーション', '封入液', 'シール', 'キャピラリ', 'ウェットレグ', '比重', 'lrv', 'urv'],
  icon: IconLevel,
  defaults,
  Component: LevelTool,
  summary: (s) => {
    const p = toInput(s);
    if (!p) return null;
    const r = levelRange(p);
    return `差圧レベル ${s.l0}〜${s.l1}mm 比重${s.sg}：LRV ${fmt(r.lrv, 1)} / URV ${fmt(r.urv, 1)} mmH₂O`;
  },
};
