'use client';

import { useEffect, useState } from 'react';

interface ModuleRow {
  id: string;
  name: string;
  slug: string;
  users: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    completedCount: number;
    totalVideos: number;
    lastCompletedAt: string | null;
  }>;
}

export default function TrainingCompletionsPage() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/training/completions')
      .then((r) => r.json())
      .then((data) => setModules(data.modules ?? []))
      .catch(() => setError('Failed to load training completions'))
      .finally(() => setLoading(false));
  }, []);

  function escapeCsvCell(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    const header = [
      'moduleName',
      'moduleSlug',
      'userName',
      'userEmail',
      'completedCount',
      'totalVideos',
      'lastCompletedAt',
    ];
    const lines = [header.join(',')];
    for (const m of modules) {
      for (const u of m.users) {
        lines.push(
          [
            escapeCsvCell(m.name),
            escapeCsvCell(m.slug),
            escapeCsvCell(u.userName || ''),
            escapeCsvCell(u.userEmail || ''),
            escapeCsvCell(String(u.completedCount)),
            escapeCsvCell(String(u.totalVideos)),
            escapeCsvCell(u.lastCompletedAt || ''),
          ].join(',')
        );
      }
    }
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-completions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleReset(moduleId: string, userId: string) {
    if (!confirm('Reset progress for this user in this module?')) return;
    try {
      const res = await fetch(
        `/api/admin/training/modules/${moduleId}/reset-progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset progress');
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                users: m.users.filter((u) => u.userId !== userId),
              }
            : m
        )
      );
    } catch (e) {
      alert(
        e instanceof Error
          ? e.message
          : 'Failed to reset progress. See console for details.'
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Training completions</h1>
          <p className="text-sm text-gray-600">
            View who has started or completed each training module and reset progress if needed.
          </p>
        </div>
        {!loading && !error && modules.length > 0 && (
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => downloadCsv()}
          >
            Download CSV
          </button>
        )}
      </div>

      {loading && (
        <div className="card">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      )}

      {error && !loading && (
        <div className="card">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && modules.length === 0 && (
        <div className="card">
          <p className="text-sm text-gray-500">No training modules found yet.</p>
        </div>
      )}

      {!loading &&
        !error &&
        modules.map((m) => (
          <div key={m.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{m.name}</h2>
                <p className="text-xs text-gray-500">
                  Link: <span className="font-mono">/training/module/{m.slug}</span>
                </p>
              </div>
            </div>
            {m.users.length === 0 ? (
              <p className="text-xs text-gray-500">
                No users have progress recorded for this module yet.
              </p>
            ) : (
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      User
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Email
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Progress
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">
                      Last activity
                    </th>
                    <th className="px-2 py-2 text-right font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {m.users.map((u) => (
                    <tr key={u.userId} className="border-b border-gray-100">
                      <td className="px-2 py-1.5 text-gray-800">
                        {u.userName || '(Unknown)'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">
                        {u.userEmail || '—'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-700">
                        {u.totalVideos === 0
                          ? '0 videos'
                          : `${u.completedCount} / ${u.totalVideos} completed`}
                      </td>
                      <td className="px-2 py-1.5 text-gray-600">
                        {u.lastCompletedAt
                          ? new Date(u.lastCompletedAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700"
                          onClick={() => void handleReset(m.id, u.userId)}
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
    </div>
  );
}

