'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminNewTrainingModulePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Array<{ id: string; label: string }>>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isCompanyWide, setIsCompanyWide] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [moduleSortOrder, setModuleSortOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/training/teams')
      .then((r) => r.json())
      .then((d) => {
        const t = d.teams ?? [];
        setTeams(t);
        if (t[0]?.id) setTeamId(t[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          isCompanyWide,
          teamId: isCompanyWide ? null : teamId,
          moduleSortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      router.push(`/admin/training/${data.module.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/admin/training" className="text-sm text-teal-600 hover:text-teal-700">
        ← Training modules
      </Link>
      <div className="card">
        <h1 className="mb-4 text-xl font-semibold">New training module</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Slug (URL)</span>
            <input className="input-field" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Description</span>
            <textarea className="input-field min-h-[72px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isCompanyWide}
              onChange={(e) => setIsCompanyWide(e.target.checked)}
            />
            Company-wide module
          </label>
          {!isCompanyWide && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Team</span>
              <select className="input-field" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Sort order</span>
            <input
              type="number"
              className="input-field"
              value={moduleSortOrder}
              onChange={(e) => setModuleSortOrder(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create module'}
          </button>
        </form>
      </div>
    </div>
  );
}
