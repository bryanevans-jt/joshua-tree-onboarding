'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Team {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

export default function AdminTrainingTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/training/teams');
    const data = await res.json();
    setTeams(data.teams ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <Link href="/admin/training" className="text-sm text-teal-600 hover:text-teal-700">
        ← Training modules
      </Link>
      <h1 className="text-xl font-semibold">Teams</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="card divide-y text-sm">
          {teams.map((t) => (
            <li key={t.id} className="flex justify-between py-2">
              <span>
                {t.label} <span className="text-xs text-gray-500">({t.slug})</span>
              </span>
              <span className="text-xs text-gray-500">{t.active ? 'Active' : 'Inactive'}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="card max-w-md space-y-2">
        <h2 className="text-sm font-semibold">Add team</h2>
        <input className="input-field" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <input className="input-field" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input
          type="number"
          className="input-field"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={async () => {
            setError(null);
            const res = await fetch('/api/admin/training/teams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug, label, sortOrder, active: true }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || 'Failed');
              return;
            }
            setSlug('');
            setLabel('');
            void load();
          }}
        >
          Create team
        </button>
      </div>
    </div>
  );
}
