// PIDシミュレーター：一次遅れ＋むだ時間のプロセスを PID で制御したときの応答を計算する
//
//   プロセス：T·dPV/dt = K·(MV + 外乱) − PV …（むだ時間 L だけ遅れて MV が効く）
//   調節計：位置形 PID（逆動作：PV が SP より低いと MV を上げる）
//     P = Kc·e、I = (Kc/Ti)·∫e dt、D = Kc·Td·d(e or −PV)/dt（不完全微分 η=0.1）
//     Kc = 100 / 比例帯[%]。MV は 0〜100% に制限、飽和中は積分を止める（リセットワインドアップ防止）
// 値はすべて %、時間は秒。

export type Process = { k: number; t: number; l: number }; // ゲイン、時定数[s]、むだ時間[s]
export type Tuning = { pb: number; ti: number; td: number; pvDerivative: boolean }; // 比例帯[%]、積分時間[s]（0=なし）、微分時間[s]（0=なし）
export type Scenario = { sp0: number; sp1: number; tStep: number; dist: number; tDist: number; duration: number };

export type SimResult = {
  t: number[];
  pv: number[];
  sp: number[];
  mv: number[];
  metrics: Metrics;
};

export type Metrics = {
  overshoot: number; // %（SP変化幅に対する）
  riseTime: number; // 10→90% の時間 [s]（届かなければ NaN）
  settlingTime: number; // SP変化から ±2% に収まるまで [s]（収まらなければ NaN）
  offset: number; // SP変化区間の最後の偏差（SP − PV）
  oscillating: boolean; // 終わりまで振れ続けている
  saturated: boolean; // MV が 0% か 100% に張り付いた時間がある
};

export const kcFromPb = (pb: number) => 100 / pb;
export const pbFromKc = (kc: number) => 100 / kc;

export function simulate(p: Process, c: Tuning, s: Scenario, points = 600): SimResult {
  const dt = Math.min(s.duration / 4000, Math.max(p.t, 0.05) / 20, 0.05 + p.l / 50);
  const steps = Math.ceil(s.duration / dt);
  const kc = kcFromPb(Math.max(c.pb, 0.1));
  const delaySteps = Math.round(p.l / dt);
  const mv0 = Math.min(100, Math.max(0, s.sp0 / p.k)); // 定常状態から開始
  const buf: number[] = new Array(delaySteps + 1).fill(mv0); // むだ時間の待ち行列
  let head = 0;
  let pv = s.sp0;
  let integ = mv0; // 積分項（バイアス込み）で釣り合いを取る
  let dState = 0;
  let prevErr = 0;
  let prevPv = pv;
  const eta = 0.1;
  const every = Math.max(1, Math.floor(steps / points));
  const out: SimResult = { t: [], pv: [], sp: [], mv: [], metrics: null as unknown as Metrics };
  let saturated = false;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const sp = t >= s.tStep ? s.sp1 : s.sp0;
    const e = sp - pv;

    // 微分（PV微分なら SP を変えても蹴らない）
    const dIn = c.pvDerivative ? -(pv - prevPv) / dt : (e - prevErr) / dt;
    let d = 0;
    if (c.td > 0) {
      const tf = eta * c.td;
      dState += ((kc * c.td * dIn - dState) * dt) / (tf + dt);
      d = dState;
    }
    const pTerm = kc * e;
    let u = pTerm + integ + d;
    const uc = Math.min(100, Math.max(0, u));
    if (uc !== u) saturated = true;
    // 積分：Ti=0 なら P 動作のみ（バイアス固定）。飽和の方向へは積まない
    if (c.ti > 0) {
      const di = (kc / c.ti) * e * dt;
      if (!((u > 100 && di > 0) || (u < 0 && di < 0))) integ += di;
    }
    u = uc;

    if (i % every === 0) {
      out.t.push(t);
      out.pv.push(pv);
      out.sp.push(sp);
      out.mv.push(u);
    }

    // プロセスを1ステップ進める
    buf[head] = u;
    head = (head + 1) % buf.length;
    const delayed = buf[head]; // L 秒前の MV
    const dist = t >= s.tDist ? s.dist : 0;
    prevErr = e;
    prevPv = pv;
    pv += ((p.k * (delayed + dist) - pv) * dt) / Math.max(p.t, 1e-6);
  }
  out.metrics = metrics(out, s, saturated);
  return out;
}

function metrics(r: SimResult, s: Scenario, saturated: boolean): Metrics {
  const delta = s.sp1 - s.sp0;
  const end = s.dist !== 0 && s.tDist > s.tStep ? s.tDist : Infinity;
  const idx = r.t.map((t, i) => i).filter((i) => r.t[i] >= s.tStep && r.t[i] < end);
  const nan = { overshoot: NaN, riseTime: NaN, settlingTime: NaN, offset: NaN, oscillating: false, saturated };
  if (!idx.length || delta === 0) return nan;
  const frac = (i: number) => (r.pv[i] - s.sp0) / delta;
  let peak = -Infinity;
  for (const i of idx) peak = Math.max(peak, frac(i));
  const overshoot = Math.max(0, (peak - 1) * 100);
  const t10 = idx.find((i) => frac(i) >= 0.1);
  const t90 = idx.find((i) => frac(i) >= 0.9);
  const riseTime = t10 != null && t90 != null ? r.t[t90] - r.t[t10] : NaN;
  const band = 0.02 * Math.abs(delta);
  let lastOut = -1;
  for (const i of idx) if (Math.abs(r.pv[i] - s.sp1) > band) lastOut = i;
  const lastIdx = idx[idx.length - 1];
  const settlingTime = lastOut === lastIdx ? NaN : lastOut < 0 ? 0 : r.t[lastOut + 1] - s.tStep;
  const offset = s.sp1 - r.pv[lastIdx];
  // 最後の1/4区間で、偏差の符号が何度も入れ替わっていて振幅もある → 振れ続けている
  const tail = idx.slice(Math.floor(idx.length * 0.75));
  let flips = 0;
  let amp = 0;
  for (let k = 1; k < tail.length; k++) {
    const a = r.pv[tail[k - 1]] - s.sp1;
    const b = r.pv[tail[k]] - s.sp1;
    if (Math.sign(a) !== Math.sign(b)) flips++;
    amp = Math.max(amp, Math.abs(b));
  }
  return { overshoot, riseTime, settlingTime, offset, oscillating: flips >= 3 && amp > band, saturated };
}

/** SIMC 法（Skogestad）のおすすめ値。τc = L（バランス重視） */
export function simcTuning(p: Process, mode: 'PI' | 'PID'): Tuning {
  const l = Math.max(p.l, 0.01);
  const tc = l;
  if (mode === 'PI') {
    const kc = p.t / (p.k * (tc + l));
    return { pb: round(pbFromKc(kc)), ti: round(Math.min(p.t, 4 * (tc + l))), td: 0, pvDerivative: true };
  }
  // 一次遅れ＋むだ時間に D を足す近似：むだ時間の半分を微分で補償
  const t1 = p.t + l / 2;
  const kc = t1 / (p.k * (tc + l / 2));
  return { pb: round(pbFromKc(kc)), ti: round(Math.min(t1, 4 * (tc + l / 2))), td: round((p.t * l) / (2 * p.t + l)), pvDerivative: true };
}

const round = (x: number) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);
