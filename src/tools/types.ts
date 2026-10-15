import type { ComponentType } from 'react';

export type GroupId = 'signal' | 'temp' | 'control' | 'convert';

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'signal', label: '信号' },
  { id: 'temp', label: '温度' },
  { id: 'control', label: '制御' },
  { id: 'convert', label: '換算' },
];

export type ToolProps<S> = { state: S; set: (patch: Partial<S>) => void };

export type ToolDef<S = any> = {
  id: string;
  name: string;
  desc: string;
  group: GroupId;
  keywords: string[]; // 検索用の別名
  icon: ComponentType;
  defaults: S;
  Component: ComponentType<ToolProps<S>>;
  /** 計算履歴に残す一行。計算できていないときは null */
  summary: (s: S) => string | null;
};
