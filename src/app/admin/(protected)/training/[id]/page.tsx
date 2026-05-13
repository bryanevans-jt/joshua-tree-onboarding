'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SectionRow {
  id: string;
  title: string;
  kind: 'video' | 'pdf';
  orderIndex: number;
  youtubeUrl?: string | null;
  pdfKey?: string | null;
  quiz: unknown;
  contentVersion: number;
}

interface ModuleDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isCompanyWide: boolean;
  teamId: string | null;
  moduleSortOrder: number;
  sections: SectionRow[];
}

export default function AdminEditTrainingModulePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [teams, setTeams] = useState<Array<{ id: string; label: string; active?: boolean }>>([]);
  const [mod, setMod] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isCompanyWide, setIsCompanyWide] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [moduleSortOrder, setModuleSortOrder] = useState(0);
  const [quizJson, setQuizJson] = useState(
    '{"questions":[{"id":"q1","prompt":"Question text","choices":["A","B"],"correctIndex":0}]}'
  );
  const [newTitle, setNewTitle] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [deleting, setDeleting] = useState(false);

  const activeTeams = teams.filter((t) => t.active !== false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [mRes, tRes] = await Promise.all([
        fetch(`/api/admin/training/modules/${id}`),
        fetch('/api/admin/training/teams'),
      ]);
      const mData = await mRes.json();
      const tData = await tRes.json();
      if (!mRes.ok) throw new Error(mData.error || 'Failed to load module');
      setTeams(tData.teams ?? []);
      const mm = mData.module as ModuleDetail;
      setMod(mm);
      setName(mm.name);
      setSlug(mm.slug);
      setDescription(mm.description || '');
      setIsCompanyWide(mm.isCompanyWide);
      setTeamId(mm.teamId || '');
      setModuleSortOrder(mm.moduleSortOrder ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin/training/modules/${id}`, {
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
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMod(data.module);
  }

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let quiz: unknown = null;
    try {
      quiz = JSON.parse(quizJson);
    } catch {
      setError('Quiz JSON invalid');
      return;
    }
    const res = await fetch(`/api/admin/training/modules/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'video',
        title: newTitle.trim(),
        youtubeUrl: newYoutube.trim(),
        quiz,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed');
      return;
    }
    setNewTitle('');
    setNewYoutube('');
    void load();
  }

  async function addPdf(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let quiz: unknown = null;
    try {
      quiz = JSON.parse(quizJson);
    } catch {
      setError('Quiz JSON invalid');
      return;
    }
    const res = await fetch(`/api/admin/training/modules/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'pdf',
        title: newTitle.trim(),
        quiz,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed');
      return;
    }
    const sid = data.section?.id as string;
    setNewTitle('');
    void load();
    if (!sid) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.set('file', file);
      const up = await fetch(`/api/admin/training/modules/${id}/sections/${sid}/pdf`, {
        method: 'POST',
        body: fd,
      });
      const uData = await up.json();
      if (!up.ok) setError(uData.error || 'PDF upload failed');
      void load();
    };
    input.click();
  }

  async function moveSection(index: number, dir: -1 | 1) {
    if (!mod) return;
    const j = index + dir;
    if (j < 0 || j >= mod.sections.length) return;
    const next = [...mod.sections];
    const t = next[index];
    next[index] = next[j];
    next[j] = t;
    const ordered = next.map((s) => s.id);
    const res = await fetch(`/api/admin/training/modules/${id}/sections/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedSectionIds: ordered }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || 'Reorder failed');
    void load();
  }

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }
  if (error && !mod) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!mod) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">Not found</p>
      </div>
    );
  }

  return (
    <div className="training-admin-page space-y-6">
      <div className="training-admin-hero rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/80 p-5 shadow-sm">
        <Link href="/admin/training" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          ← Training hub
        </Link>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Sections are ordered steps (video or PDF). Optional quizzes gate completion. <strong>Bump version</strong>{' '}
          resets learner progress for that section when you replace material.
        </p>
      </div>
      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}

      <div className="card border-teal-100 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Edit module</h1>
        <p className="mb-4 text-xs text-gray-500">
          Company-wide modules unlock first for everyone. Team modules only appear for people on that team (or teams).
        </p>
        <form onSubmit={saveMeta} className="space-y-3">
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-field" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <textarea
            className="input-field min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isCompanyWide}
              onChange={(e) => setIsCompanyWide(e.target.checked)}
            />
            Company-wide
          </label>
          {!isCompanyWide && (
            <select className="input-field" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {activeTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            className="input-field"
            title="Sort order (lower appears first in admin lists)"
            value={moduleSortOrder}
            onChange={(e) => setModuleSortOrder(Number(e.target.value))}
          />
          <button type="submit" className="btn-primary">
            Save module
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          Trainee link: <span className="font-mono">/training/module/{slug}</span>
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Add section (video or PDF)</h2>
        <p className="text-xs text-gray-500">
          Paste valid quiz JSON (multiple choice). PDF sections prompt for a file upload after
          creation.
        </p>
        <textarea
          className="input-field min-h-[100px] font-mono text-xs"
          value={quizJson}
          onChange={(e) => setQuizJson(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Section title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="YouTube URL (video only)"
          value={newYoutube}
          onChange={(e) => setNewYoutube(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={addVideo}>
            Add video section
          </button>
          <button type="button" className="btn-secondary text-sm" onClick={addPdf}>
            Add PDF section
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold">Sections</h2>
        <ul className="space-y-2 text-sm">
          {mod.sections.map((s, index) => (
            <li key={s.id} className="rounded border border-gray-100 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {index + 1}. {s.title}{' '}
                  <span className="text-xs text-gray-500">
                    ({s.kind}) v{s.contentVersion}
                  </span>
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-secondary px-2 py-0.5 text-xs"
                    disabled={index === 0}
                    onClick={() => void moveSection(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-2 py-0.5 text-xs"
                    disabled={index === mod.sections.length - 1}
                    onClick={() => void moveSection(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-2 py-0.5 text-xs"
                    onClick={async () => {
                      if (!confirm('Bump version? This clears learner progress for this section.'))
                        return;
                      await fetch(`/api/admin/training/modules/${id}/sections/${s.id}/bump`, {
                        method: 'POST',
                      });
                      void load();
                    }}
                  >
                    Bump version
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={async () => {
                      if (!confirm('Delete section?')) return;
                      await fetch(`/api/admin/training/modules/${id}/sections/${s.id}`, {
                        method: 'DELETE',
                      });
                      void load();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {s.kind === 'pdf' && (
                <label className="mt-1 inline-block cursor-pointer text-xs text-teal-700">
                  Upload / replace PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.set('file', file);
                      const res = await fetch(
                        `/api/admin/training/modules/${id}/sections/${s.id}/pdf`,
                        { method: 'POST', body: fd }
                      );
                      const data = await res.json();
                      if (!res.ok) setError(data.error || 'Upload failed');
                      void load();
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card border-red-200 bg-red-50/40 shadow-sm">
        <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
        <p className="mt-1 text-xs text-red-800/90">
          Delete this entire module, all sections, and related learner progress. This cannot be undone.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          disabled={deleting}
          onClick={async () => {
            if (!mod) return;
            if (
              !confirm(
                `Permanently delete module "${mod.name}" and all of its sections and progress?`
              )
            ) {
              return;
            }
            setDeleting(true);
            setError(null);
            try {
              const res = await fetch(`/api/admin/training/modules/${id}`, { method: 'DELETE' });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error || 'Delete failed');
                return;
              }
              router.push('/admin/training');
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? 'Deleting…' : 'Delete this module'}
        </button>
      </div>
    </div>
  );
}
