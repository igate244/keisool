import { useRoute, go } from './router';
import { HomeScreen } from './screens/HomeScreen';
import { ToolScreen } from './screens/ToolScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WorkScreen, JoinScreen } from './screens/WorkScreen';
import { MemoListScreen, MemoEditScreen } from './screens/MemoScreen';
import { IconGrid, IconHistory, IconGear, IconWork, IconMemo } from './tools/icons';

const TABS = [
  { id: 'tools', path: '/', label: 'ツール', Icon: IconGrid },
  { id: 'work', path: 'work', label: 'ワーク', Icon: IconWork },
  { id: 'memo', path: 'memo', label: 'メモ', Icon: IconMemo },
  { id: 'history', path: 'history', label: '履歴', Icon: IconHistory },
  { id: 'settings', path: 'settings', label: '設定', Icon: IconGear },
];

function Page({ page, arg }: { page?: string; arg?: string }) {
  if (page === 'tool' && arg) return <ToolScreen key={arg} id={arg} />;
  if (page === 'work') return <WorkScreen />;
  if (page === 'join' && arg) return <JoinScreen teamId={arg} />;
  if (page === 'memo' && arg) return <MemoEditScreen key={arg} id={arg} />;
  if (page === 'memo') return <MemoListScreen />;
  if (page === 'history') return <HistoryScreen />;
  if (page === 'settings') return <SettingsScreen />;
  return <HomeScreen />;
}

export function App() {
  const [page, arg] = useRoute();
  const tab = page === 'join' ? 'work' : TABS.find((t) => t.id === page)?.id ?? 'tools';
  return (
    <div className="app">
      <main>
        <Page page={page} arg={arg} />
      </main>
      <nav className="bottom-nav">
        {TABS.map(({ id, path, label, Icon }) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(path)}>
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
