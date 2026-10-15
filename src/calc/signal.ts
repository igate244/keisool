// 統一信号 ⇔ % ⇔ 物理量（リニア／開平）

export type SignalType = '4-20mA' | '1-5V' | '0-10V' | '0-20mA';

export const SIGNALS: Record<SignalType, { lo: number; hi: number; unit: string }> = {
  '4-20mA': { lo: 4, hi: 20, unit: 'mA' },
  '1-5V': { lo: 1, hi: 5, unit: 'V' },
  '0-10V': { lo: 0, hi: 10, unit: 'V' },
  '0-20mA': { lo: 0, hi: 20, unit: 'mA' },
};
export const SIGNAL_TYPES = Object.keys(SIGNALS) as SignalType[];

export type Scale = { sig: SignalType; lrv: number; urv: number; sqrt: boolean };

/** 信号 → 信号%（出力%） */
export const sigToPct = (s: SignalType, v: number) => ((v - SIGNALS[s].lo) / (SIGNALS[s].hi - SIGNALS[s].lo)) * 100;
/** 信号% → 信号 */
export const pctToSig = (s: SignalType, p: number) => SIGNALS[s].lo + ((SIGNALS[s].hi - SIGNALS[s].lo) * p) / 100;

/**
 * 信号%（伝送器出力）→ 物理量
 * 開平：信号は差圧に比例、物理量（流量）は √差圧 に比例。負の信号%は0扱い。
 */
export function pctToPv(sc: Scale, p: number): number {
  const q = sc.sqrt ? Math.sqrt(Math.max(p, 0) / 100) * 100 : p;
  return sc.lrv + ((sc.urv - sc.lrv) * q) / 100;
}

/** 物理量 → 信号% */
export function pvToPct(sc: Scale, pv: number): number {
  const q = ((pv - sc.lrv) / (sc.urv - sc.lrv)) * 100;
  if (!sc.sqrt) return q;
  return q < 0 ? NaN : (q * q) / 100;
}

/** 物理量の %（開平では流量%＝信号%とは別） */
export const pvPct = (sc: Scale, pv: number) => ((pv - sc.lrv) / (sc.urv - sc.lrv)) * 100;

export type Row = { pct: number; sig: number; pv: number };

/** 点検表。開平は流量%刻み、リニアは信号%刻み */
export function table(sc: Scale, steps: number[]): Row[] {
  return steps.map((s) => {
    const pv = sc.lrv + ((sc.urv - sc.lrv) * s) / 100;
    const pct = sc.sqrt ? (s * s) / 100 : s;
    return { pct: s, sig: pctToSig(sc.sig, pct), pv };
  });
}
