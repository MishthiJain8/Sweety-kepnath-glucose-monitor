import React, { useCallback, useEffect, useState } from 'react';
import { HeartPulse, LogOut, Activity, CalendarDays } from 'lucide-react';
import Auth from './Auth.jsx';
import { ReadingForm, ReadingList } from './Readings.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

async function api(path, options = {}) {
  const token = localStorage.getItem('sweety_token');

  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

function ReportCard({ title, report }) {
  return (
    <section className="card report">
      <div className="report-title">
        <Activity size={17} />
        {title}
      </div>

      <div className="big-number">
        {report?.average ?? '—'}
        {report?.average != null && <small> mg/dl</small>}
      </div>

      <p className="muted">Average glucose</p>

      <div className="report-stats">
        <div>
          <strong>{report?.highest ?? '—'}</strong>
          <span>Highest</span>
        </div>

        <div>
          <strong>{report?.lowest ?? '—'}</strong>
          <span>Lowest</span>
        </div>

        <div>
          <strong>{report?.count ?? 0}</strong>
          <span>Readings</span>
        </div>
      </div>

      {report && !report.count && (
        <p className="muted">No readings in this period.</p>
      )}
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sweety_user') || 'null');
    } catch {
      return null;
    }
  });

  const [date, setDate] = useState(today());
  const [readings, setReadings] = useState([]);
  const [reports, setReports] = useState({});
  const [notice, setNotice] = useState(null);

  const notify = (text, isError = false) => {
    setNotice({ text, isError });
  };

  const refresh = useCallback(async () => {
    if (!user) return;

    try {
      const [items, daily, mtd, monthly] = await Promise.all([
        api('/readings'),
        api(`/reports?type=daily&date=${date}`),
        api(`/reports?type=mtd&date=${date}`),
        api(`/reports?type=monthly&date=${date}`)
      ]);

      setReadings(items);
      setReports({ daily, mtd, monthly });
    } catch (err) {
      notify(err.message, true);
    }
  }, [user, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const readingForm = ReadingForm({
    date, api, refresh, notify
  });

  function login(result) {
    localStorage.setItem('sweety_token', result.token);
    localStorage.setItem('sweety_user', JSON.stringify(result.user));
    setUser(result.user);
    notify('Welcome to Sweety!');
  }

  function logout() {
    localStorage.removeItem('sweety_token');
    localStorage.removeItem('sweety_user');
    setUser(null);
    setReadings([]);
    setReports({});
    setNotice(null);
  }

  if (!user) {
    return <Auth onLogin={login} api={api} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <HeartPulse size={28} />
          Sweety
        </div>

        <div className="header-actions">
          <span>Hello, {user.name}</span>
          <button className="secondary" onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR HEALTH, ONE DAY AT A TIME</p>
            <h1>Glucose dashboard</h1>
            <p className="muted">
              Track readings and understand your glucose patterns.
            </p>
          </div>

          <label className="date-picker">
            <CalendarDays size={18} />
            Select date
            <input
              type="date"
              max={today()}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </label>
        </div>

        {notice && (
          <div className={notice.isError ? 'alert' : 'success'}>
            {notice.text}
          </div>
        )}

        <div className="report-grid">
          <ReportCard title="Daily" report={reports.daily} />
          <ReportCard title="Month to date" report={reports.mtd} />
          <ReportCard title="Previous month" report={reports.monthly} />
        </div>

        <div className="content-grid">
          {readingForm.element}

          <ReadingList
            readings={readings}
            date={date}
            api={api}
            refresh={refresh}
            notify={notify}
            onEdit={readingForm.edit}
          />
        </div>

        <section className="card history">
          <h2>Reading history</h2>
          <p className="muted">All your saved glucose readings.</p>

          {readings.length === 0 ? (
            <div className="empty">No readings saved yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time slot</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.slot}</td>
                      <td><strong>{r.value}</strong> mg/dl</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>
          Sweety is a glucose tracking tool, not medical advice.
        </footer>
      </main>
    </div>
  );
}
