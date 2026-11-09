import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const SLOTS = [
  'Morning (fasting)',
  'After breakfast',
  'After lunch',
  'After dinner'
];

export function ReadingForm({ date, api, refresh, notify }) {
  const [form, setForm] = useState({
    date,
    slot: SLOTS[0],
    value: ''
  });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  function edit(reading) {
    setEditing(reading.id);
    setForm({
      date: reading.date,
      slot: reading.slot,
      value: String(reading.value)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event) {
    event.preventDefault();

    if (form.value.trim() === '') {
      notify('Please enter a glucose value.', true);
      return;
    }

    const value = Number(form.value);

    if (!Number.isInteger(value) || value < 40 || value > 600) {
      notify('Value must be between 40 and 600 mg/dl.', true);
      return;
    }

    setSaving(true);

    try {
      await api(
        editing ? `/readings/${editing}` : '/readings',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify({ ...form, value })
        }
      );

      notify(editing ? 'Reading updated.' : 'Reading added.');

      setEditing(null);
      setForm({ date, slot: SLOTS[0], value: '' });

      await refresh();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  return {
    edit,
    element: (
      <section className="card">
        <h2><Plus size={20} /> {editing ? 'Edit reading' : 'Add reading'}</h2>
        <p className="muted">Record a glucose value for one of four daily slots.</p>

        <form onSubmit={save}>
          <label>
            Reading date
            <input
              type="date"
              required
              max={dateToday()}
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </label>

          <label>
            Time slot
            <select
              value={form.slot}
              onChange={e => setForm({ ...form, slot: e.target.value })}
            >
              {SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </label>

          <label>
            Blood glucose (mg/dl)
            <input
              type="number"
              required
              min="40"
              max="600"
              step="1"
              placeholder="e.g. 110"
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
            />
          </label>

          <button className="primary" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add reading'}
          </button>

          {editing && (
            <button
              type="button"
              className="secondary full"
              onClick={() => {
                setEditing(null);
                setForm({ date, slot: SLOTS[0], value: '' });
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
      </section>
    )
  };
}

function dateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ReadingList({ readings, date, api, refresh, notify, onEdit }) {
  const daily = readings.filter(r => r.date === date);

  async function remove(id) {
    if (!window.confirm('Delete this reading?')) return;

    try {
      await api(`/readings/${id}`, { method: 'DELETE' });
      notify('Reading deleted.');
      await refresh();
    } catch (err) {
      notify(err.message, true);
    }
  }

  return (
    <section className="card">
      <h2>Daily readings</h2>
      <p className="muted">{date}</p>

      {!daily.length ? (
        <div className="empty">
          No readings yet for this date.
          <p>Use the form to add your first reading.</p>
        </div>
      ) : (
        daily.map(reading => (
          <div className="reading" key={reading.id}>
            <div>
              <strong>{reading.slot}</strong>
              <p className="muted">{reading.date}</p>
            </div>

            <div className="reading-actions">
              <strong>{reading.value} <small>mg/dl</small></strong>
              <button
                aria-label="Edit reading"
                onClick={() => onEdit(reading)}
              >
                <Pencil size={16} />
              </button>
              <button
                aria-label="Delete reading"
                onClick={() => remove(reading.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
