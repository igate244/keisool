// 単位換算。各単位を基準単位への倍率で持つ（温度だけ式で換算）。

export type Unit = { id: string; label: string; factor?: number; hint?: string };
export type Category = { id: string; label: string; base: string; units: Unit[] };

const G = 9.80665; // 標準重力加速度

export const CATEGORIES: Category[] = [
  {
    id: 'pressure',
    label: '圧力',
    base: 'Pa',
    units: [
      { id: 'kPa', label: 'kPa', factor: 1e3 },
      { id: 'MPa', label: 'MPa', factor: 1e6 },
      { id: 'Pa', label: 'Pa', factor: 1 },
      { id: 'kgf/cm2', label: 'kgf/cm²', factor: G * 1e4 },
      { id: 'mmH2O', label: 'mmH₂O', factor: G, hint: '= mmAq（4℃水）' },
      { id: 'mH2O', label: 'mH₂O', factor: G * 1e3, hint: '= mAq' },
      { id: 'bar', label: 'bar', factor: 1e5 },
      { id: 'mbar', label: 'mbar', factor: 1e2 },
      { id: 'mmHg', label: 'mmHg', factor: 133.322387415, hint: '≒ Torr' },
      { id: 'Torr', label: 'Torr', factor: 101325 / 760 },
      { id: 'psi', label: 'psi', factor: 6894.757293168 },
      { id: 'inH2O', label: 'inH₂O', factor: 25.4 * G, hint: '4℃水' },
      { id: 'atm', label: 'atm', factor: 101325 },
    ],
  },
  {
    id: 'flow',
    label: '流量',
    base: 'm³/h',
    units: [
      { id: 'm3/h', label: 'm³/h', factor: 1 },
      { id: 'm3/min', label: 'm³/min', factor: 60 },
      { id: 'L/min', label: 'L/min', factor: 0.06 },
      { id: 'L/h', label: 'L/h', factor: 1e-3 },
      { id: 'L/s', label: 'L/s', factor: 3.6 },
      { id: 'kL/h', label: 'kL/h', factor: 1 },
      { id: 'GPM', label: 'US gal/min', factor: 3.785411784e-3 * 60 },
      { id: 'CFM', label: 'ft³/min', factor: 0.028316846592 * 60 },
    ],
  },
  {
    id: 'temp',
    label: '温度',
    base: '℃',
    units: [
      { id: 'C', label: '℃' },
      { id: 'F', label: '℉' },
      { id: 'K', label: 'K' },
    ],
  },
  {
    id: 'length',
    label: '長さ',
    base: 'mm',
    units: [
      { id: 'mm', label: 'mm', factor: 1 },
      { id: 'm', label: 'm', factor: 1000 },
      { id: 'in', label: 'inch', factor: 25.4 },
      { id: 'ft', label: 'ft', factor: 304.8 },
    ],
  },
];

function toBase(cat: Category, unit: string, v: number): number {
  if (cat.id === 'temp') {
    if (unit === 'F') return ((v - 32) * 5) / 9;
    if (unit === 'K') return v - 273.15;
    return v;
  }
  const u = cat.units.find((x) => x.id === unit);
  return u?.factor ? v * u.factor : NaN;
}

function fromBase(cat: Category, unit: string, v: number): number {
  if (cat.id === 'temp') {
    if (unit === 'F') return (v * 9) / 5 + 32;
    if (unit === 'K') return v + 273.15;
    return v;
  }
  const u = cat.units.find((x) => x.id === unit);
  return u?.factor ? v / u.factor : NaN;
}

export function convert(catId: string, from: string, to: string, v: number): number {
  const cat = CATEGORIES.find((c) => c.id === catId);
  if (!cat) return NaN;
  return fromBase(cat, to, toBase(cat, from, v));
}
