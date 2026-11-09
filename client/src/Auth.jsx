import React, { useState } from 'react';
import { HeartPulse } from 'lucide-react';

export default function Auth({ onLogin, api }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const path = isLogin ? '/auth/login' : '/auth/register';

      const result = await api(path, {
        method: 'POST',
        body: JSON.stringify(form)
      });

      onLogin(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <HeartPulse size={30} />
          <span>Sweety</span>
        </div>

        <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>

        <p className="muted">
          Your daily glucose companion.
        </p>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={submit}>
          {!isLogin && (
            <label>
              Full name
              <input
                required
                value={form.name}
                onChange={e => setForm({
                  ...form,
                  name: e.target.value
                })}
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({
                ...form,
                email: e.target.value
              })}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={e => setForm({
                ...form,
                password: e.target.value
              })}
              placeholder="At least 8 characters"
            />
          </label>

          <button className="primary" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          className="text-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
        >
          {isLogin
            ? 'New here? Create an account'
            : 'Already have an account? Log in'}
        </button>
      </section>
    </main>
  );
}
