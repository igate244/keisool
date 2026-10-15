// ツール一覧。新しいツールはファイルを作ってここに1行足すだけでホームに並ぶ。
import type { ToolDef } from './types';
import { signalTool } from './SignalTool';
import { rtdTool } from './RtdTool';
import { tcTool } from './TcTool';
import { unitTool } from './UnitTool';
import { levelTool } from './LevelTool';

export const TOOLS: ToolDef[] = [signalTool, rtdTool, tcTool, unitTool, levelTool];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);
