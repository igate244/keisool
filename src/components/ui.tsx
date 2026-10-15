import { useEffect, useRef, useState, type ReactNode } from 'react';

/** 全角数字・全角マイナス・カンマを吸収して数値化。空や不正は NaN */
export function parseNum(s: string): number {
  const t = s.normalize('NFKC').replace(/[−ー–]/g, '-').replace(/,/g, '').trim();
  if (t === '' || t === '-' || t === '.' || t === '-.') return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** 表示用：固定小数桁。NaN は「—」 */
export function fmt(n: number, digits: number): string {
  if (!Number.isFinite(n)) return '—';
  const v = Math.abs(n) < 0.5 * 10 ** -digits ? 0 : n; // -0.000 を避ける
  return v.toFixed(digits);
}

/** レンジ幅に合わせた小数桁（幅100なら2桁、幅1なら4桁） */
export function digitsFor(span: number): number {
  if (!Number.isFinite(span) || span === 0) return 3;
  return Math.min(6, Math.max(0, 3 - Math.floor(Math.log10(Math.abs(span)))));
}

let toastTimer = 0;
export function toast(msg: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 1400);
}

export function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast(`コピー：${text}`),
    () => toast('コピーできませんでした'),
  );
}

type NumFieldProps = {
  label: string;
  unit?: string;
  value: string; // 入力中の文字列（自分が入力元のとき）
  computed?: string; // 他の欄から計算された表示値（自分が入力元でないとき）
  active?: boolean;
  onChange: (s: string) => void;
  big?: boolean;
  allowNegative?: boolean;
  hint?: ReactNode;
};

/** 数値入力欄。入力元でないときは計算値を薄く表示し、タップで入力元になる */
export function NumField({ label, unit, value, computed, active = true, onChange, big, allowNegative = true, hint }: NumFieldProps) {
  const shown = active ? value : (computed ?? '');
  const ref = useRef<HTMLInputElement>(null);
  const toggleSign = () => {
    const cur = shown === '—' ? '' : shown;
    const next = cur.startsWith('-') ? cur.slice(1) : `-${cur}`;
    onChange(next);
    ref.current?.focus();
  };
  return (
    <label className={`field ${big ? 'big' : ''} ${active ? 'active' : 'derived'}`}>
      <span className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <span className="field-box">
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={shown === '—' && active ? '' : shown}
          placeholder="0"
          onFocus={(e) => {
            if (!active) onChange(shown === '—' ? '' : shown);
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {unit && <span className="field-unit">{unit}</span>}
        {allowNegative && (
          <button type="button" className="sign" onMouseDown={(e) => e.preventDefault()} onClick={toggleSign} aria-label="符号を反転">
            ±
          </button>
        )}
      </span>
    </label>
  );
}

/** 選択肢ボタン群 */
export function Seg<T extends string>({ value, options, onChange, small }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={`seg ${small ? 'small' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 結果表示（タップでコピー） */
export function Readout({ label, value, unit, sub, accent }: { label: string; value: string; unit?: string; sub?: ReactNode; accent?: boolean }) {
  return (
    <button type="button" className={`readout ${accent ? 'accent' : ''}`} onClick={() => value !== '—' && copy(value)}>
      <span className="readout-label">{label}</span>
      <span className="readout-value">
        {value}
        {unit && value !== '—' && <small>{unit}</small>}
      </span>
      {sub && <span className="readout-sub">{sub}</span>}
    </button>
  );
}

export function Section({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card">
      {(title || aside) && (
        <div className="card-head">
          {title && <h3>{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Note({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return <p className={`note ${warn ? 'warn' : ''}`}>{children}</p>;
}

/** 文字入力（単位名など） */
export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <label className="field small">
      <span className="field-label">{label}</span>
      <span className="field-box">
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

/** 開閉トグル */
export function useToggle(init = false): [boolean, () => void] {
  const [v, set] = useState(init);
  return [v, () => set((x) => !x)];
}

/** 値が変わってから一定時間後に実行 */
export function useDebounced(fn: () => void, deps: unknown[], ms: number) {
  const f = useRef(fn);
  f.current = fn;
  useEffect(() => {
    const t = setTimeout(() => f.current(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
