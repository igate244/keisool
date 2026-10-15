import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tcEmf, tcTemp, tcTempFromMeasured, tcMeasuredEmf, TC_TYPES, tcRange, tcInverseMin } from '../src/calc/thermocouple';
import { rtdResistance, rtdTemp } from '../src/calc/rtd';
import { pctToPv, pvToPct, sigToPct, pctToSig, table } from '../src/calc/signal';
import { convert } from '../src/calc/units';

const near = (a: number, b: number, tol: number, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} ≠ ${b} (±${tol})`);

test('熱電対：JIS/NIST 基準起電力表の値と一致', () => {
  // [種類, 温度℃, mV]（NIST SRD 60 / JIS C 1602 の表値）
  const ref: [any, number, number][] = [
    ['K', -200, -5.891], ['K', -100, -3.554], ['K', 100, 4.096], ['K', 200, 8.138], ['K', 500, 20.644], ['K', 1000, 41.276], ['K', 1372, 54.886],
    ['J', -100, -4.633], ['J', 100, 5.269], ['J', 500, 27.393], ['J', 1000, 57.953],
    ['T', -200, -5.603], ['T', -100, -3.379], ['T', 100, 4.279], ['T', 400, 20.872],
    ['E', -100, -5.237], ['E', 100, 6.319], ['E', 500, 37.005], ['E', 1000, 76.373],
    ['N', 100, 2.774], ['N', 500, 16.748], ['N', 1000, 36.256],
    ['R', 100, 0.647], ['R', 1000, 10.506], ['R', 1500, 17.451],
    ['S', 100, 0.646], ['S', 1000, 9.587], ['S', 1500, 15.582],
    ['B', 500, 1.242], ['B', 1000, 4.834], ['B', 1500, 10.099], ['B', 1800, 13.591],
  ];
  for (const [t, c, mv] of ref) near(tcEmf(t, c), mv, 0.0015, `${t} ${c}℃`);
});

test('熱電対：0℃で起電力0（区間境界）', () => {
  for (const t of TC_TYPES) if (t !== 'B') near(tcEmf(t, 0), 0, 1e-6, t);
  near(tcMeasuredEmf('K', 500, 0), 20.644, 0.0015);
});

test('熱電対：逆変換は往復で一致', () => {
  for (const t of TC_TYPES) {
    const [lo, hi] = tcRange(t);
    const start = Math.max(lo + 1, tcInverseMin(t));
    for (let c = start; c <= hi; c += (hi - start) / 37) {
      near(tcTemp(t, tcEmf(t, c)), c, 1e-6, `${t} ${c}`);
    }
  }
});

test('熱電対：冷接点補償', () => {
  // K、測定800℃・冷接点25℃ → 端子電圧 33.277 − 1.000 = 32.277mV
  near(tcMeasuredEmf('K', 800, 25), 33.275 - 1.0, 0.003);
  near(tcTempFromMeasured('K', tcMeasuredEmf('K', 800, 25), 25), 800, 1e-6);
});

test('熱電対：範囲外は NaN', () => {
  assert.ok(Number.isNaN(tcEmf('T', 500)));
  assert.ok(Number.isNaN(tcTemp('K', 100)));
});

test('測温抵抗体：JIS C 1604 規準抵抗値', () => {
  near(rtdResistance('Pt100', 0), 100, 1e-9);
  near(rtdResistance('Pt100', 100), 138.5055, 1e-4);
  near(rtdResistance('Pt100', -100), 60.2558, 1e-4);
  near(rtdResistance('Pt100', -200), 18.5201, 1e-4);
  near(rtdResistance('Pt100', 850), 390.4811, 1e-4);
  near(rtdResistance('Pt1000', 100), 1385.055, 1e-3);
  near(rtdResistance('JPt100', 100), 139.16, 0.02);
});

test('測温抵抗体：逆変換', () => {
  for (const t of [-200, -150.5, -40, -0.1, 0, 25, 100, 400, 850]) {
    near(rtdTemp('Pt100', rtdResistance('Pt100', t)), t, 1e-7, `${t}`);
  }
  near(rtdTemp('Pt100', 138.5055), 100, 1e-3);
});

test('mA換算：リニア', () => {
  const sc = { sig: '4-20mA' as const, lrv: 0, urv: 200, sqrt: false };
  assert.equal(pctToSig('4-20mA', 50), 12);
  assert.equal(sigToPct('4-20mA', 8), 25);
  assert.equal(pctToPv(sc, 25), 50);
  near(pvToPct(sc, 150), 75, 1e-12);
  const neg = { sig: '1-5V' as const, lrv: -50, urv: 150, sqrt: false };
  near(pctToPv(neg, sigToPct('1-5V', 2)), 0, 1e-12);
});

test('mA換算：開平', () => {
  const sc = { sig: '4-20mA' as const, lrv: 0, urv: 100, sqrt: true };
  // 流量50% → 差圧25% → 8mA
  near(pctToSig('4-20mA', pvToPct(sc, 50)), 8, 1e-12);
  near(pctToPv(sc, sigToPct('4-20mA', 8)), 50, 1e-12);
  const rows = table(sc, [0, 50, 100]);
  near(rows[1].sig, 8, 1e-12);
  assert.equal(rows[2].sig, 20);
});

test('単位換算', () => {
  near(convert('pressure', 'kgf/cm2', 'kPa', 1), 98.0665, 1e-9);
  near(convert('pressure', 'mmH2O', 'kPa', 1000), 9.80665, 1e-9);
  near(convert('pressure', 'psi', 'kPa', 14.5038), 100, 1e-3);
  near(convert('pressure', 'atm', 'mmHg', 1), 760, 1e-3);
  near(convert('flow', 'm3/h', 'L/min', 6), 100, 1e-9);
  near(convert('flow', 'GPM', 'm3/h', 1), 0.2271247, 1e-6);
  near(convert('temp', 'C', 'F', 100), 212, 1e-9);
  near(convert('temp', 'K', 'C', 0), -273.15, 1e-9);
});

import { simulate, simcTuning } from '../src/calc/pid';

test('PID：P動作だけだと残留偏差 = ΔSP/(1+K·Kc)', () => {
  const r = simulate({ k: 1, t: 10, l: 1 }, { pb: 50, ti: 0, td: 0, pvDerivative: true }, { sp0: 40, sp1: 60, tStep: 5, dist: 0, tDist: 0, duration: 200 });
  near(r.metrics.offset, 20 / (1 + 2), 0.05);
});

test('PID：積分を入れると SP に戻る・外乱も戻す', () => {
  const p = { k: 1, t: 10, l: 2 };
  const c = simcTuning(p, 'PI');
  const r = simulate(p, c, { sp0: 40, sp1: 60, tStep: 5, dist: 0, tDist: 0, duration: 200 });
  near(r.metrics.offset, 0, 0.05);
  assert.ok(r.metrics.overshoot < 15, `overshoot ${r.metrics.overshoot}`);
  assert.ok(Number.isFinite(r.metrics.settlingTime));
  const d = simulate(p, c, { sp0: 50, sp1: 50, tStep: 5, dist: -10, tDist: 10, duration: 300 });
  near(d.pv[d.pv.length - 1], 50, 0.1);
});

test('PID：ゲインを上げすぎると振動する', () => {
  const r = simulate({ k: 1, t: 10, l: 3 }, { pb: 10, ti: 5, td: 0, pvDerivative: true }, { sp0: 40, sp1: 60, tStep: 5, dist: 0, tDist: 0, duration: 200 });
  assert.ok(r.metrics.oscillating || r.metrics.overshoot > 50);
});

test('PID：微分が効く（PV微分で振動が減る）', () => {
  const p = { k: 1, t: 20, l: 4 };
  const base = { pb: 20, ti: 20, td: 0, pvDerivative: true };
  const sc = { sp0: 40, sp1: 60, tStep: 5, dist: 0, tDist: 0, duration: 300 };
  const a = simulate(p, base, sc).metrics.overshoot;
  const b = simulate(p, { ...base, td: 2 }, sc).metrics.overshoot;
  assert.ok(b < a, `${b} < ${a}`);
});
