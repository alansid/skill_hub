import { useState, type FormEvent } from 'react';
import { api } from '../data';
import { DEMO_PASSWORD } from '../data/demoApi';

export function LoginPage({ onLogin }: { onLogin: (user: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.signIn(password);
      onLogin((await api.currentUser()) ?? '診所');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>任老師中醫</h1>
        <p className="login-sub">預約登記本・診所人員登入</p>
        {/* 隱藏的帳號欄位，讓瀏覽器可以記住密碼 */}
        <input type="text" name="username" autoComplete="username" value="任老師中醫" readOnly hidden />
        <label>
          診所密碼
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '登入中…' : '登入'}
        </button>
        <p className="hint">
          {api.mode === 'demo' ? (
            <>
              示範模式密碼：<code>{DEMO_PASSWORD}</code>
            </>
          ) : (
            '登入後，這台裝置 30 天內不用再輸入密碼。'
          )}
        </p>
      </form>
    </div>
  );
}
