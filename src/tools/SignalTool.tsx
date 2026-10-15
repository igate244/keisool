import { fmt, digitsFor, NumField, Seg, Section, TextField, Note, parseNum, copy } from '../components/ui';
import { SIGNALS, SIGNAL_TYPES, sigToPct, pctToSig, pctToPv, pvToPct, pvPct, table, type SignalType, type Scale } from '../calc/signal';
import type { ToolDef, ToolProps } from './types';
import { IconSignal } from './icons';

type Src = 'sig' | 'pct' | 'pv';
type S = { sig: SignalType; lrv: string; urv: string; unit: string; sqrt: boolean; src: Src; val: string; steps: 5 | 11 };

const defaults: S = { sig: '4-20mA', lrv: '0', urv: '100', unit: '', sqrt: false, src: 'sig', val: '12', steps: 5 };

function solve(s: S) {
  const sc: Scale = { sig: s.sig, lrv: parseNum(s.lrv), urv: parseNum(s.urv), sqrt: s.sqrt };
  const okRange = Number.isFinite(sc.lrv) && Number.isFinite(sc.urv) && sc.lrv !== sc.urv;
  const v = parseNum(s.val);
  let pct = NaN; // 信号%（出力%）
  if (okRange && Number.isFinite(v)) {
    if (s.src === 'sig') pct = sigToPct(s.sig, v);
    else if (s.src === 'pct') pct = v;
    else pct = pvToPct(sc, v);
  }
  const sig = pctToSig(s.sig, pct);
  const pv = s.src === 'pv' ? v : pctToPv(sc, pct);
  return { sc, okRange, pct, sig, pv, flowPct: pvPct(sc, pv) };
}

function SignalTool({ state: s, set }: ToolProps<S>) {
  const r = solve(s);
  const sigUnit = SIGNALS[s.sig].unit;
  const pvDigits = digitsFor(r.sc.urv - r.sc.lrv);
  const sigDigits = sigUnit === 'mA' ? 3 : 4;
  const input = (src: Src) => (val: string) => set({ src, val });
  const unit = s.unit.trim();
  const steps = s.steps === 5 ? [0, 25, 50, 75, 100] : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const rows = r.okRange ? table(r.sc, steps) : [];
  const out = r.pct < -0.0001 || r.pct > 100.0001;
  const burnout = s.sig === '4-20mA' && Number.isFinite(r.sig) && (r.sig < 3.8 || r.sig > 20.5);

  return (
    <>
      <Section>
        <Seg value={s.sig} options={SIGNAL_TYPES.map((v) => ({ v, label: v }))} onChange={(sig) => set({ sig })} small />
        <div className="grid3">
          <NumField label="LRV（0%）" value={s.lrv} onChange={(lrv) => set({ lrv })} />
          <NumField label="URV（100%）" value={s.urv} onChange={(urv) => set({ urv })} />
          <TextField label="単位" value={s.unit} placeholder="℃ / kPa…" onChange={(u) => set({ unit: u })} />
        </div>
        <Seg value={s.sqrt ? 'sqrt' : 'lin'} options={[{ v: 'lin', label: 'リニア' }, { v: 'sqrt', label: '開平（流量）' }]} onChange={(v) => set({ sqrt: v === 'sqrt' })} />
      </Section>

      <Section>
        <NumField big label="信号" unit={sigUnit} active={s.src === 'sig'} value={s.val} computed={fmt(r.sig, sigDigits)} onChange={input('sig')} />
        <NumField big label={s.sqrt ? '出力%（差圧%）' : '%'} unit="%" active={s.src === 'pct'} value={s.val} computed={fmt(r.pct, 2)} onChange={input('pct')} />
        <NumField big label={s.sqrt ? '流量' : '物理量'} unit={unit || undefined} active={s.src === 'pv'} value={s.val} computed={fmt(r.pv, pvDigits)} onChange={input('pv')} hint={s.sqrt && Number.isFinite(r.flowPct) ? `流量 ${fmt(r.flowPct, 2)}%` : undefined} />
        {!r.okRange && <Note warn>LRV と URV を入れてね（同じ値は不可）</Note>}
        {r.okRange && out && <Note warn>レンジ外（{fmt(r.pct, 2)}%）</Note>}
        {burnout && <Note warn>{r.sig <= 3.6 || r.sig >= 21 ? 'NAMUR NE43 の故障信号（3.6mA以下／21mA以上）' : 'NAMUR NE43 の測定範囲（3.8〜20.5mA）外'}</Note>}
        {s.sqrt && <Note>開平：信号は差圧に比例、流量 = √(出力%) 。低流量カット点の設定に注意</Note>}
      </Section>

      <Section
        title="点検表"
        aside={<Seg small value={String(s.steps) as '5' | '11'} options={[{ v: '5', label: '5点' }, { v: '11', label: '11点' }]} onChange={(v) => set({ steps: v === '5' ? 5 : 11 })} />}
      >
        {r.okRange ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>{s.sqrt ? '流量%' : '%'}</th>
                <th>{sigUnit}</th>
                <th>{unit || '物理量'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pct} onClick={() => copy(fmt(row.sig, sigDigits))}>
                  <td>{row.pct}</td>
                  <td className="num">{fmt(row.sig, sigDigits)}</td>
                  <td className="num">{fmt(row.pv, pvDigits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Note>レンジを入れると表が出る</Note>
        )}
      </Section>
    </>
  );
}

export const signalTool: ToolDef<S> = {
  id: 'signal',
  name: 'mA換算',
  desc: '4-20mA・1-5V ⇔ % ⇔ 物理量（リニア／開平）',
  group: 'signal',
  keywords: ['4-20', '4-20mA', 'ma', 'ミリアンペア', '1-5v', '電流', '電圧', '開平', 'ルート', 'スケーリング', 'レンジ', 'lrv', 'urv', '点検'],
  icon: IconSignal,
  defaults,
  Component: SignalTool,
  summary: (s) => {
    const r = solve(s);
    if (!r.okRange || !Number.isFinite(r.sig) || !Number.isFinite(r.pv)) return null;
    const u = SIGNALS[s.sig].unit;
    return `${s.lrv}〜${s.urv}${s.unit}${s.sqrt ? '（開平）' : ''}：${fmt(r.sig, u === 'mA' ? 3 : 4)}${u} = ${fmt(r.pct, 2)}% = ${fmt(r.pv, digitsFor(r.sc.urv - r.sc.lrv))}${s.unit}`;
  },
};
