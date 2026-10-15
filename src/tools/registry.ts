// ツール一覧。新しいツールはファイルを作ってここに1行足すだけでホームに並ぶ。
import type { ToolDef } from './types';
import { signalTool } from './SignalTool';
import { tempTool } from './TempTool';
import { unitTool } from './UnitTool';

export const TOOLS: ToolDef[] = [signalTool, tempTool, unitTool];

// 統合・廃止したツールの旧ID（履歴・最近・前回のツールから開いたとき用）
const ALIASES: Record<string, string> = { rtd: 'temp', tc: 'temp' };

export const toolById = (id: string) => TOOLS.find((t) => t.id === (ALIASES[id] ?? id));
