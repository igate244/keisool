import { fmt, NumField, Seg, Section, Note, parseNum } from '../components/ui';
import { RTD_TYPES, rtdResistance, rtdTemp, rtdRange, rtdNote, rtdR0, type RtdType } from '../calc/rtd';
import type { ToolDef, ToolProps } from './types';
import { IconRtd } from './icons';

type Src = 't' | 'r';
type S = { type: RtdType; src: Src; val: string; lead: string };

const defaults: S = { type: 'Pt100', src: 't', val: '100', lead: '0' };

function solve(s: S) {
  const v = parseNum(s.val);
  const lead = parseNum(s.lead);
  const leadOk = Number.isFinite(lead) ? lead : 0;
  // 2線式の導線抵抗：測定値 = 素子抵抗 + 導線往復分
  const t = s.src === 't' ? v : rtdTemp(s.type, v - leadOk);
  const r = s.src === 'r' ? v : rtdResistance(s.type, t) + leadOk;
  return { t, r, element: r - leadOk, leadOk };
}

function RtdTool({ state: s, set }: ToolProps<S>) {
  const x = solve(s);
  const [lo, hi] = rtdRange(s.type);
  const r0 = rtdR0(s.type);
  const sens = Number.isFinite(x.t) ? (rtdResistance(s.type, Math.min(x.t + 0.5, hi)) - rtdResistance(s.type, Math.max(x.t - 0.5, lo))) / (Math.min(x.t + 0.5, hi) - Math.max(x.t - 0.5, lo)) : NaN;
  const bad = Number.isFinite(parseNum(s.val)) && (!Number.isFinite(x.t) || !Number.isFinite(x.r));
  return (
    <>
      <Section>
        <Seg value={s.type} options={RTD_TYPES.map((v) => ({ v, label: v }))} onChange={(type) => set({ type })} />
        <Note>{rtdNote(s.type)}・範囲 {lo}〜{hi}℃</Note>
      </Section>
      <Section>
        <NumField big label="温度" unit="℃" active={s.src === 't'} value={s.val} computed={fmt(x.t, 2)} onChange={(val) => set({ src: 't', val })} />
        <NumField big label="抵抗" unit="Ω" active={s.src === 'r'} value={s.val} computed={fmt(x.r, r0 >= 1000 ? 2 : 3)} onChange={(val) => set({ src: 'r', val })} allowNegative={false} />
        {bad && <Note warn>範囲外です</Note>}
        <div className="kv">
          <span>感度</span>
          <b>{fmt(sens, r0 >= 1000 ? 3 : 4)} Ω/℃</b>
        </div>
      </Section>
      <Section title="2線式の導線抵抗">
        <NumField label="導線抵抗（往復合計）" unit="Ω" value={s.lead} onChange={(lead) => set({ lead })} allowNegative={false} hint="3線・4線式は0のまま" />
        {x.leadOk > 0 && Number.isFinite(sens) && (
          <Note>
            素子 {fmt(x.element, 3)}Ω ／ 導線ぶんの誤差 約 {fmt(x.leadOk / sens, 2)}℃
          </Note>
        )}
      </Section>
    </>
  );
}

export const rtdTool: ToolDef<S> = {
  id: 'rtd',
  name: '測温抵抗体',
  desc: 'Pt100・JPt100・Pt1000 温度 ⇔ 抵抗',
  group: 'temp',
  keywords: ['pt100', 'jpt100', 'pt1000', 'rtd', '白金', '抵抗', 'オーム', 'ω', '温度'],
  icon: IconRtd,
  defaults,
  Component: RtdTool,
  summary: (s) => {
    const x = solve(s);
    if (!Number.isFinite(x.t) || !Number.isFinite(x.r)) return null;
    return `${s.type}：${fmt(x.t, 2)}℃ = ${fmt(x.r, 3)}Ω${x.leadOk ? `（導線${s.lead}Ω込み）` : ''}`;
  },
};
