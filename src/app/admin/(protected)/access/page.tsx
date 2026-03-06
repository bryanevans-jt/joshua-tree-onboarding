'use client';

import { useState, useEffect } from 'react';
import { SUPERADMIN_EMAIL } from '@/lib/auth';

export default function AdminAccessPage() {
  const [approved, setApproved] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/access')
      .then((r) => {
        if (r.status === 403) {
          window.location.href = '/admin';
          return;
        }
        return r.json();
      })
      .then((data) => data && setApproved(data.approved ?? []))
      .catch(() => setMessage({ type: 'error', text: 'Failed to load' }))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/admin/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', email: newEmail }),
    });
    const data = await res.json();
    if (data.ok) {
      setApproved((prev) => [data.email || newEmail.trim(), ...prev]);
      setNewEmail('');
      setMessage({ type: 'success', text: 'Added.' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to add' });
    }
  }

  async function handleRemove(email: string) {
    setMessage(null);
    const res = await fetch('/api/admin/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', email }),
    });
    const data = await res.json();
    if (data.ok) {
      setApproved((prev) => prev.filter((e) => e !== email));
      setMessage({ type: 'success', text: 'Removed.' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to remove' });
    }
  }

  if (loading) {
    return (
      <div className="card max-w-lg">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="card max-w-lg">
      <h1 className="mb-2 text-xl font-semibold">Approved admin logins</h1>
      <p className="mb-6 text-sm text-gray-600">
        Only these email addresses can sign in to the admin portal. You (superadmin) are always allowed.
      </p>

      <div className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Superadmin (always allowed):</strong> {SUPERADMIN_EMAIL}
      </div>

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Add approved email"
          className="input-field flex-1"
          required
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Add
        </button>
      </form>

      {message && (
        <p
          className={`mb-4 text-sm ${message.type === 'success' ? 'text-teal-600' : 'text-red-600'}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      <ul className="space-y-2">
        {approved.map((email) => (
          <li
            key={email}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <span className="text-sm text-gray-800">{email}</span>
            <button
              type="button"
              onClick={() => handleRemove(email)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
        {approved.length === 0 && (
          <li className="text-sm text-gray-500">No other approved admins yet.</li>
        )}
      </ul>
    </div>
  );
}
