import { useRoute, go } from './router';
import { HomeScreen } from './screens/HomeScreen';
import { ToolScreen } from './screens/ToolScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { IconGrid, IconHistory, IconGear } from './tools/icons';

export function App() {
  const route = useRoute();
  const [page, arg] = route;
  const tab = page === 'history' ? 'history' : page === 'settings' ? 'settings' : 'tools';
  return (
    <div className="app">
      <main>
        {page === 'tool' && arg ? <ToolScreen key={arg} id={arg} /> : page === 'history' ? <HistoryScreen /> : page === 'settings' ? <SettingsScreen /> : <HomeScreen />}
      </main>
      <nav className="bottom-nav">
        <button className={tab === 'tools' ? 'on' : ''} onClick={() => go('/')}>
          <IconGrid />
          ツール
        </button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => go('history')}>
          <IconHistory />
          履歴
        </button>
        <button className={tab === 'settings' ? 'on' : ''} onClick={() => go('settings')}>
          <IconGear />
          設定
        </button>
      </nav>
    </div>
  );
}
