'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsPage() {
  const [hrEmail, setHrEmail] = useState('');
  const [commEmail, setCommEmail] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(async (r) => {
        const text = await r.text();
        if (!text) return {};
        try {
          return JSON.parse(text);
        } catch {
          return {};
        }
      })
      .then((data) => {
        setHrEmail(data.hrDirectorEmail ?? '');
        setCommEmail(data.communicationsDirectorEmail ?? '');
        setFromEmail(data.fromEmail ?? '');
        setCompanyName(data.companyName ?? '');
      })
      .catch(() => setError('Failed to load settings'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hrDirectorEmail: hrEmail,
          communicationsDirectorEmail: commEmail,
          fromEmail: fromEmail || undefined,
          companyName: companyName,
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text || `Server error (${res.status})` };
        }
      }
      if (!res.ok) throw new Error(data?.error || `Failed to save (${res.status})`);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    }
  }

  return (
    <div className="card max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            HR Director email
          </label>
          <input
            type="email"
            value={hrEmail}
            onChange={(e) => setHrEmail(e.target.value)}
            className="input-field"
            placeholder="hr@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Communications Director email
          </label>
          <input
            type="email"
            value={commEmail}
            onChange={(e) => setCommEmail(e.target.value)}
            className="input-field"
            placeholder="communications@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            From email (optional)
          </label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className="input-field"
            placeholder="Uses GMAIL_USER from .env if blank"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Company name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input-field"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-teal-600" role="status">
            Settings saved.
          </p>
        )}
        <button type="submit" className="btn-primary">
          Save settings
        </button>
      </form>
    </div>
  );
}
