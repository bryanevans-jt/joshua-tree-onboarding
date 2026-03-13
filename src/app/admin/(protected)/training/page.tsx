'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ModuleSummary {
  id: string;
  name: string;
  slug: string;
}

export default function AdminTrainingModulesPage() {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/training/modules')
      .then((r) => r.json())
      .then((data) => setModules(data.modules ?? []))
      .catch(() => setError('Failed to load modules'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Training modules</h1>
          <p className="text-sm text-gray-600">
            Manage training modules for each position. Each module has its own static link with a set of
            required videos and optional presentation PDFs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/training/settings" className="btn-secondary">
            Training settings
          </Link>
          <Link href="/admin/training/completions" className="btn-secondary">
            View completions
          </Link>
          <Link href="/admin/training/new" className="btn-primary">
            Add module
          </Link>
        </div>
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

      {!loading && !error && (
        <div className="card">
          {modules.length === 0 ? (
            <p className="text-sm text-gray-500">No training modules yet. Click &quot;Add module&quot; to create one.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {modules.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      Link: <span className="font-mono">/training/module/{m.slug}</span>
                    </p>
                  </div>
                  <Link
                    href={`/admin/training/${m.id}`}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

