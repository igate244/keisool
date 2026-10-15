// 差圧式レベル計のレンジ計算（ゼロ移調・封入液/ウェットレグ）
// 高さは mm、圧力は mmH₂O（= 高さmm × 比重）で計算する。
//
//   DP(L) = ρ·L + ρHP·h − [ウェット時] ρLP·(D + h)
//     L   : 下側タップからの液位 [mm]
//     h   : 下側タップから伝送器までの高さ（伝送器が下なら＋）[mm]
//     ρHP : 高圧側導圧管（キャピラリ）内の液の比重
//     D   : 上下タップ間の高さ [mm]
//     ρLP : 低圧側ウェットレグ／封入液の比重

export type LevelMode = 'open' | 'dry' | 'wet';

export type LevelInput = {
  mode: LevelMode;
  sg: number; // 測定液の比重
  l0: number; // レンジ下限の液位 [mm]
  l1: number; // レンジ上限の液位 [mm]
  h: number; // 伝送器の取付高さ（下側タップより下が＋）[mm]
  sgHP: number; // 高圧側導圧管内の比重
  d: number; // タップ間距離 [mm]（ウェットのみ）
  sgLP: number; // 低圧側の比重（ウェットのみ）
};

export const MMH2O_TO_KPA = 9.80665 / 1000;

export function dpAt(p: LevelInput, level: number): number {
  const wet = p.mode === 'wet' ? p.sgLP * (p.d + p.h) : 0;
  return p.sg * level + p.sgHP * p.h - wet;
}

export type LevelResult = { lrv: number; urv: number; span: number; kind: 'none' | 'suppression' | 'elevation' };

export function levelRange(p: LevelInput): LevelResult {
  const lrv = dpAt(p, p.l0);
  const urv = dpAt(p, p.l1);
  const eps = 1e-9;
  const kind = Math.abs(lrv) < eps ? 'none' : lrv > 0 ? 'suppression' : 'elevation';
  return { lrv, urv, span: urv - lrv, kind };
}
