'use client';

import { useEffect, useState } from 'react';

export default function TrainingSettingsPage() {
  const [communicationsContactName, setCommunicationsContactName] = useState('');
  const [communicationsContactEmail, setCommunicationsContactEmail] = useState('');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testModuleName, setTestModuleName] = useState('Sample training module');
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/training/settings')
      .then((r) => r.json())
      .then((data) => {
        setAllowedDomains(data.allowedDomains ?? []);
        setNotificationEmails(data.notificationEmails ?? []);
        setCommunicationsContactName(data.communicationsContactName ?? '');
        setCommunicationsContactEmail(data.communicationsContactEmail ?? '');
      })
      .catch(() => setError('Failed to load settings'));
  }, []);

  async function sendTestCompletionEmail() {
    setTestBusy(true);
    setTestMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/training/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testTo.trim() || undefined,
          moduleName: testModuleName.trim() || 'Sample training module',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test email');
      setTestMessage(`Sent test email to ${data.sentTo}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send test email');
    } finally {
      setTestBusy(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/training/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedDomains,
          notificationEmails,
          communicationsContactName: communicationsContactName.trim() || null,
          communicationsContactEmail: communicationsContactEmail.trim().toLowerCase() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setAllowedDomains(data.allowedDomains ?? []);
      setNotificationEmails(data.notificationEmails ?? []);
      setCommunicationsContactName(data.communicationsContactName ?? '');
      setCommunicationsContactEmail(data.communicationsContactEmail ?? '');
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
          Training sign-in is limited to <span className="font-mono">@thejoshuatree.org</span>{' '}
          accounts. When someone is not yet on the roster, they see instructions to contact the
          communications contact below. When training is fully complete, the trainee and the
          Administration Director email from main Settings receive a summary (including quiz
          attempts).
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
            <h2 className="mb-1 text-sm font-semibold text-gray-800">
              Director of Communication & Creative (roster help)
            </h2>
            <p className="mb-3 text-xs text-gray-500">
              Shown to employees who can sign in but are not yet assigned on the training roster.
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">Display name</label>
              <input
                className="input-field"
                value={communicationsContactName}
                onChange={(e) => setCommunicationsContactName(e.target.value)}
                placeholder="Director of Communication & Creative"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Contact email</label>
              <input
                type="email"
                className="input-field"
                value={communicationsContactEmail}
                onChange={(e) => setCommunicationsContactEmail(e.target.value)}
                placeholder="name@thejoshuatree.org"
              />
            </div>
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

      <div className="card max-w-2xl">
        <h2 className="mb-1 text-sm font-semibold text-gray-800">Test completion email</h2>
        <p className="mb-3 text-xs text-gray-500">
          Sends a sample &quot;[TEST] Training complete&quot; message. Leave Send to blank to use your
          signed-in admin email.
        </p>
        {testMessage && (
          <p className="mb-3 text-sm text-teal-700" role="status">
            {testMessage}
          </p>
        )}
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Send to (optional)
            </label>
            <input
              type="email"
              className="input-field"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@thejoshuatree.org"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Sample module name
            </label>
            <input
              type="text"
              className="input-field"
              value={testModuleName}
              onChange={(e) => setTestModuleName(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={testBusy}
          onClick={() => void sendTestCompletionEmail()}
        >
          {testBusy ? 'Sending…' : 'Send test email'}
        </button>
      </div>
    </div>
  );
}
