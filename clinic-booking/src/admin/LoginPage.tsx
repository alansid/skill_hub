import { useState, type FormEvent } from 'react';
import { api } from '../data';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../data/demoApi';

export function LoginPage({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState(api.mode === 'demo' ? DEMO_EMAIL : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.signIn(email, password);
      onLogin((await api.currentUser()) ?? email);
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
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          密碼
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '登入中…' : '登入'}
        </button>
        {api.mode === 'demo' && (
          <p className="hint">
            示範模式密碼：<code>{DEMO_PASSWORD}</code>
          </p>
        )}
      </form>
    </div>
  );
}
