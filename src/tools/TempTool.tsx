// 温度センサー：測温抵抗体と熱電対をひとつに。上の切替で中身が変わる（それぞれの入力は別々に覚える）
import { Seg, Section } from '../components/ui';
import { rtdTool } from './RtdTool';
import { tcTool } from './TcTool';
import type { ToolDef, ToolProps } from './types';
import { IconRtd } from './icons';

type Kind = 'rtd' | 'tc';
type S = { kind: Kind; rtd: typeof rtdTool.defaults; tc: typeof tcTool.defaults };

const defaults: S = { kind: 'rtd', rtd: rtdTool.defaults, tc: tcTool.defaults };

function TempTool({ state: s, set }: ToolProps<S>) {
  const Rtd = rtdTool.Component;
  const Tc = tcTool.Component;
  return (
    <>
      <Section>
        <Seg
          value={s.kind}
          options={[
            { v: 'rtd', label: '測温抵抗体' },
            { v: 'tc', label: '熱電対' },
          ]}
          onChange={(kind) => set({ kind })}
        />
      </Section>
      {s.kind === 'rtd' ? (
        <Rtd state={{ ...rtdTool.defaults, ...s.rtd }} set={(p) => set({ rtd: { ...rtdTool.defaults, ...s.rtd, ...p } })} />
      ) : (
        <Tc state={{ ...tcTool.defaults, ...s.tc }} set={(p) => set({ tc: { ...tcTool.defaults, ...s.tc, ...p } })} />
      )}
    </>
  );
}

export const tempTool: ToolDef<S> = {
  id: 'temp',
  name: '温度センサー',
  desc: '測温抵抗体（Pt100・JPt100・Pt1000）／熱電対（K・J・T・E・N・R・S・B）',
  group: 'temp',
  keywords: [...rtdTool.keywords, ...tcTool.keywords, '温度センサー', 'センサ'],
  icon: IconRtd,
  defaults,
  Component: TempTool,
  summary: (s) => (s.kind === 'rtd' ? rtdTool.summary({ ...rtdTool.defaults, ...s.rtd }) : tcTool.summary({ ...tcTool.defaults, ...s.tc })),
};
