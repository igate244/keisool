import { fmt, NumField, Seg, Section, Note, parseNum } from '../components/ui';
import { TC_TYPES, tcEmf, tcName, tcRange, tcMeasuredEmf, tcTempFromMeasured, tcInverseMin, type TcType } from '../calc/thermocouple';
import type { ToolDef, ToolProps } from './types';
import { IconTc } from './icons';

type Src = 't' | 'e';
type S = { type: TcType; src: Src; val: string; cj: string };

const defaults: S = { type: 'K', src: 't', val: '500', cj: '0' };

function solve(s: S) {
  const v = parseNum(s.val);
  const cjRaw = parseNum(s.cj);
  const cj = Number.isFinite(cjRaw) ? cjRaw : 0;
  const t = s.src === 't' ? v : tcTempFromMeasured(s.type, v, cj);
  const e = s.src === 'e' ? v : tcMeasuredEmf(s.type, t, cj);
  return { t, e, cj, e0: tcEmf(s.type, t), ecj: tcEmf(s.type, cj) };
}

function TcTool({ state: s, set }: ToolProps<S>) {
  const x = solve(s);
  const [lo, hi] = tcRange(s.type);
  const seebeck = Number.isFinite(x.t) ? (tcEmf(s.type, Math.min(x.t + 0.5, hi)) - tcEmf(s.type, Math.max(x.t - 0.5, lo))) * 1000 / (Math.min(x.t + 0.5, hi) - Math.max(x.t - 0.5, lo)) : NaN;
  const bad = Number.isFinite(parseNum(s.val)) && (!Number.isFinite(x.t) || !Number.isFinite(x.e));
  return (
    <>
      <Section>
        <Seg value={s.type} options={TC_TYPES.map((v) => ({ v, label: v }))} onChange={(type) => set({ type })} />
        <Note>
          {tcName(s.type)}・範囲 {s.type === 'B' ? tcInverseMin('B') : lo}〜{hi}℃（JIS C 1602 / ITS-90）
        </Note>
      </Section>
      <Section>
        <NumField big label="測定温度" unit="℃" active={s.src === 't'} value={s.val} computed={fmt(x.t, 2)} onChange={(val) => set({ src: 't', val })} />
        <NumField big label="端子の起電力" unit="mV" active={s.src === 'e'} value={s.val} computed={fmt(x.e, 3)} onChange={(val) => set({ src: 'e', val })} />
        {bad && <Note warn>範囲外です</Note>}
        <div className="kv">
          <span>感度</span>
          <b>{fmt(seebeck, 1)} µV/℃</b>
        </div>
      </Section>
      <Section title="冷接点（基準接点）">
        <NumField label="冷接点温度" unit="℃" value={s.cj} onChange={(cj) => set({ cj })} hint="端子台・計器の温度。0なら基準起電力表そのまま" />
        {x.cj !== 0 && (
          <div className="kv-list">
            <div className="kv">
              <span>基準起電力 E(測定温度)</span>
              <b>{fmt(x.e0, 3)} mV</b>
            </div>
            <div className="kv">
              <span>冷接点ぶん E(冷接点)</span>
              <b>{fmt(x.ecj, 3)} mV</b>
            </div>
            <Note>端子の起電力 = E(測定温度) − E(冷接点)。校正器で模擬入力するときは端子の値を出す</Note>
          </div>
        )}
      </Section>
    </>
  );
}

export const tcTool: ToolDef<S> = {
  id: 'tc',
  name: '熱電対',
  desc: 'K・J・T・E・N・R・S・B 温度 ⇔ 起電力（冷接点補償）',
  group: 'temp',
  keywords: ['熱電対', 'tc', 'k', 'j', 't', 'e', 'n', 'r', 's', 'b', 'mv', '起電力', 'ミリボルト', '冷接点', '補償', 'サーモカップル'],
  icon: IconTc,
  defaults,
  Component: TcTool,
  summary: (s) => {
    const x = solve(s);
    if (!Number.isFinite(x.t) || !Number.isFinite(x.e)) return null;
    return `${s.type}熱電対：${fmt(x.t, 2)}℃ = ${fmt(x.e, 3)}mV${x.cj ? `（冷接点${s.cj}℃）` : ''}`;
  },
};
