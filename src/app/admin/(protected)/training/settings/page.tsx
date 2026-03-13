'use client';

import { useEffect, useState } from 'react';

export default function TrainingSettingsPage() {
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/training/settings')
      .then((r) => r.json())
      .then((data) => {
        setAllowedDomains(data.allowedDomains ?? []);
        setNotificationEmails(data.notificationEmails ?? []);
      })
      .catch(() => setError('Failed to load settings'));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/training/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedDomains, notificationEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setAllowedDomains(data.allowedDomains ?? []);
      setNotificationEmails(data.notificationEmails ?? []);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card max-w-2xl">
        <h1 className="mb-2 text-xl font-semibold">Training settings</h1>
        <p className="mb-4 text-sm text-gray-600">
          Control which email domains can access training modules and who receives completion
          notification emails.
        </p>

        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="mb-3 text-sm text-teal-600" role="status">
            Settings saved.
          </p>
        )}

        <div className="space-y-4">
          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-800">Allowed domains</h2>
            <p className="mb-3 text-xs text-gray-500">
              Users must sign in with a Google account from one of these domains to access
              training modules (in addition to your primary Workspace domain).
            </p>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.org"
                className="input-field flex-1"
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap"
                onClick={() => {
                  const d = newDomain.trim().toLowerCase();
                  if (!d) return;
                  if (allowedDomains.includes(d)) return;
                  setAllowedDomains((prev) => [...prev, d]);
                  setNewDomain('');
                  setSaved(false);
                }}
              >
                Add domain
              </button>
            </div>
            <ul className="space-y-1">
              {allowedDomains.map((d) => (
                <li
                  key={d}
                  className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-1 text-xs"
                >
                  <span className="text-gray-800">{d}</span>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setAllowedDomains((prev) => prev.filter((x) => x !== d));
                      setSaved(false);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {allowedDomains.length === 0 && (
                <li className="text-xs text-gray-500">
                  No extra domains configured. Only your primary Workspace domain is allowed.
                </li>
              )}
            </ul>
          </section>

          <section className="pt-4 border-t border-gray-200">
            <h2 className="mb-1 text-sm font-semibold text-gray-800">
              Completion notification recipients
            </h2>
            <p className="mb-3 text-xs text-gray-500">
              When a new hire completes all videos in a module, an email is sent to these
              addresses (and the HR Director email, if configured in main Settings).
            </p>
            <div className="mb-3 flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                className="input-field flex-1"
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap"
                onClick={() => {
                  const e = newEmail.trim().toLowerCase();
                  if (!e) return;
                  if (notificationEmails.includes(e)) return;
                  setNotificationEmails((prev) => [e, ...prev]);
                  setNewEmail('');
                  setSaved(false);
                }}
              >
                Add recipient
              </button>
            </div>
            <ul className="space-y-1">
              {notificationEmails.map((e) => (
                <li
                  key={e}
                  className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-1 text-xs"
                >
                  <span className="text-gray-800">{e}</span>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setNotificationEmails((prev) => prev.filter((x) => x !== e));
                      setSaved(false);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {notificationEmails.length === 0 && (
                <li className="text-xs text-gray-500">
                  No additional recipients configured yet.
                </li>
              )}
            </ul>
          </section>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save training settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

