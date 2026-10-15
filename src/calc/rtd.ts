// 測温抵抗体（Callendar–Van Dusen 式）
//   R(t) = R0 [1 + A t + B t² + C (t − 100) t³]   （C は t < 0 のみ）
// Pt100 / Pt1000：IEC 60751・JIS C 1604（α = 0.00385）
// JPt100：旧JIS C 1604-1989（α = 0.003916）の近似係数。参考値として使う。

export type RtdType = 'Pt100' | 'Pt1000' | 'JPt100';

const COEF: Record<RtdType, { r0: number; a: number; b: number; c: number; range: [number, number]; note: string }> = {
  Pt100: { r0: 100, a: 3.9083e-3, b: -5.775e-7, c: -4.183e-12, range: [-200, 850], note: 'JIS C 1604 / IEC 60751（α=0.00385）' },
  Pt1000: { r0: 1000, a: 3.9083e-3, b: -5.775e-7, c: -4.183e-12, range: [-200, 850], note: 'JIS C 1604 / IEC 60751（α=0.00385）' },
  JPt100: { r0: 100, a: 3.9739e-3, b: -5.870e-7, c: -4.4e-12, range: [-200, 640], note: '旧JIS（α=0.003916）・近似式のため参考値' },
};

export const RTD_TYPES = Object.keys(COEF) as RtdType[];
export const rtdRange = (t: RtdType) => COEF[t].range;
export const rtdNote = (t: RtdType) => COEF[t].note;
export const rtdR0 = (t: RtdType) => COEF[t].r0;

/** 温度[℃]→抵抗[Ω]。範囲外は NaN */
export function rtdResistance(type: RtdType, t: number): number {
  const k = COEF[type];
  if (!Number.isFinite(t) || t < k.range[0] - 1e-9 || t > k.range[1] + 1e-9) return NaN;
  return cvd(type, t);
}

function cvd(type: RtdType, t: number): number {
  const k = COEF[type];
  const c = t < 0 ? k.c : 0;
  return k.r0 * (1 + k.a * t + k.b * t * t + c * (t - 100) * t * t * t);
}

/** 抵抗[Ω]→温度[℃]。範囲外は NaN */
export function rtdTemp(type: RtdType, r: number): number {
  const k = COEF[type];
  if (!Number.isFinite(r)) return NaN;
  const rmin = rtdResistance(type, k.range[0]);
  const rmax = rtdResistance(type, k.range[1]);
  if (r < rmin - 1e-9 || r > rmax + 1e-9) return NaN;
  if (r >= k.r0) {
    // 0℃以上は2次式の解
    return (-k.a + Math.sqrt(k.a * k.a - 4 * k.b * (1 - r / k.r0))) / (2 * k.b);
  }
  // 0℃未満はニュートン法
  let t = (r / k.r0 - 1) / k.a;
  for (let i = 0; i < 50; i++) {
    const f = cvd(type, t) - r;
    const df = k.r0 * (k.a + 2 * k.b * t + k.c * (4 * t * t * t - 300 * t * t));
    const dt = f / df;
    t -= dt;
    if (Math.abs(dt) < 1e-10) break;
  }
  return t;
}
