import { useEffect, useState } from 'react';
import { api } from '../data';
import type { ClinicSettings } from '../data/types';
import { todayInTaipei } from '../lib/dates';
import { DEFAULT_SETTINGS } from '../lib/schedule';
import { DayPage } from './DayPage';
import { LoginPage } from './LoginPage';
import { SearchPage } from './SearchPage';
import { askConfirm, showMessage } from '../lib/askConfirm';
import { exportCsv } from './exportCsv';

type View = 'day' | 'search';

export function AdminApp() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<View>('day');
  const [date, setDate] = useState(todayInTaipei());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.currentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (user) api.getSettings().then(setSettings).catch(() => undefined);
  }, [user]);

  if (user === undefined) return <div className="loading">載入中…</div>;
  if (user === null) return <LoginPage onLogin={setUser} />;

  async function handleExport() {
    setExporting(true);
    try {
      await exportCsv(await api.exportAll());
    } catch (e) {
      void showMessage((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function handleLogout() {
    if (!(await askConfirm('確定要登出嗎？', '登出'))) return;
    await api.signOut();
    setUser(null);
  }

  return (
    <div className="app">
      {api.mode === 'demo' && (
        <div className="demo-banner">示範模式：資料只存在這台裝置的瀏覽器，不會上網。</div>
      )}
      <header className="topbar">
        <button className="brand" onClick={() => setView('day')}>
          {settings.clinicName}
          <small>預約登記本</small>
        </button>
        <nav>
          <button
            className={view === 'day' ? 'active' : ''}
            onClick={() => setView('day')}
          >
            登記本
          </button>
          <button
            className={view === 'search' ? 'active' : ''}
            onClick={() => setView('search')}
          >
            搜尋
          </button>
          <button onClick={handleExport} disabled={exporting}>
            {exporting ? '匯出中…' : '備份'}
          </button>
          <button onClick={handleLogout}>登出</button>
        </nav>
      </header>
      <main>
        {view === 'day' ? (
          <DayPage date={date} setDate={setDate} settings={settings} />
        ) : (
          <SearchPage
            onOpenDate={(d) => {
              setDate(d);
              setView('day');
            }}
          />
        )}
      </main>
    </div>
  );
}
