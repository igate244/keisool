import { NumField, Seg, Section, Note, parseNum, copy } from '../components/ui';
import { CATEGORIES, convert } from '../calc/units';
import type { ToolDef, ToolProps } from './types';
import { IconUnit } from './icons';

type S = { cat: string; from: Record<string, string>; val: Record<string, string>; gauge: boolean };

const defaults: S = {
  cat: 'pressure',
  from: { pressure: 'kPa', flow: 'm3/h', temp: 'C', length: 'mm' },
  val: { pressure: '100', flow: '1', temp: '100', length: '25.4' },
  gauge: true,
};

/** 有効数字6桁、末尾の0は落とす。極端な値は指数表記 */
export function sig6(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const a = Math.abs(n);
  if (a >= 1e9 || a < 1e-6) return n.toExponential(4);
  const d = Math.max(0, 5 - Math.floor(Math.log10(a)));
  return n.toFixed(Math.min(d, 9)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function UnitTool({ state: s, set }: ToolProps<S>) {
  const cat = CATEGORIES.find((c) => c.id === s.cat) ?? CATEGORIES[0];
  const from = s.from[cat.id] ?? cat.units[0].id;
  const raw = s.val[cat.id] ?? '';
  const v = parseNum(raw);
  const fromUnit = cat.units.find((u) => u.id === from) ?? cat.units[0];
  return (
    <>
      <Section>
        <Seg value={cat.id} options={CATEGORIES.map((c) => ({ v: c.id, label: c.label }))} onChange={(c) => set({ cat: c })} />
      </Section>
      <Section>
        <NumField big label="入力" unit={fromUnit.label} value={raw} onChange={(x) => set({ val: { ...s.val, [cat.id]: x } })} />
        <div className="unit-grid">
          {cat.units.map((u) => {
            const out = u.id === from ? v : convert(cat.id, from, u.id, v);
            return (
              <div key={u.id} className={`unit-row ${u.id === from ? 'on' : ''}`}>
                <button type="button" className="unit-name" onClick={() => set({ from: { ...s.from, [cat.id]: u.id }, val: { ...s.val, [cat.id]: Number.isFinite(out) ? sig6(out) : raw } })}>
                  {u.label}
                  {u.hint && <small>{u.hint}</small>}
                </button>
                <button type="button" className="unit-val num" onClick={() => Number.isFinite(out) && copy(sig6(out))}>
                  {sig6(out)}
                </button>
              </div>
            );
          })}
        </div>
        <Note>単位名をタップで入力単位に切替、数値をタップでコピー</Note>
        {cat.id === 'pressure' && <Note>ゲージ圧／絶対圧の区別はしない（絶対圧 = ゲージ圧 + 大気圧 101.325kPa）</Note>}
      </Section>
    </>
  );
}

export const unitTool: ToolDef<S> = {
  id: 'unit',
  name: '単位換算',
  desc: '圧力・流量・温度・長さ',
  group: 'convert',
  keywords: ['単位', '換算', '変換', 'kpa', 'mpa', 'kgf', 'mmh2o', 'mmaq', 'mmhg', 'psi', 'bar', 'atm', 'torr', '流量', 'l/min', 'm3/h', 'gpm', '℉', '華氏', 'インチ'],
  icon: IconUnit,
  defaults,
  Component: UnitTool,
  summary: (s) => {
    const cat = CATEGORIES.find((c) => c.id === s.cat);
    if (!cat) return null;
    const from = s.from[cat.id];
    const v = parseNum(s.val[cat.id] ?? '');
    if (!Number.isFinite(v)) return null;
    const fu = cat.units.find((u) => u.id === from);
    const others = cat.units.filter((u) => u.id !== from).slice(0, 2);
    return `${sig6(v)}${fu?.label ?? ''} = ${others.map((u) => `${sig6(convert(cat.id, from, u.id, v))}${u.label}`).join(' = ')}`;
  },
};
