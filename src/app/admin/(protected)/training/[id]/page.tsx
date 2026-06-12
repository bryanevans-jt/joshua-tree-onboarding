'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TrainingSectionFields } from '@/components/admin/training/TrainingSectionFields';
import type { TrainingQuiz } from '@/lib/training-quiz';
import { parseQuizJson, validateQuizDraft } from '@/lib/training-quiz';

interface SectionRow {
  id: string;
  title: string;
  kind: 'video' | 'pdf';
  orderIndex: number;
  youtubeUrl?: string | null;
  pdfKey?: string | null;
  quiz: TrainingQuiz | null;
  contentVersion: number;
  summary?: string | null;
  estimatedMinutes?: number | null;
  isOptional: boolean;
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

function emptySectionForm() {
  return {
    title: '',
    youtubeUrl: '',
    summary: '',
    estimatedMinutes: '',
    isOptional: false,
    quiz: null as TrainingQuiz | null,
  };
}

function sectionToForm(s: SectionRow) {
  return {
    title: s.title,
    youtubeUrl: s.youtubeUrl || '',
    summary: s.summary || '',
    estimatedMinutes: s.estimatedMinutes != null ? String(s.estimatedMinutes) : '',
    isOptional: s.isOptional,
    quiz: s.quiz ? { questions: s.quiz.questions.map((q) => ({ ...q, choices: [...q.choices] })) } : null,
  };
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
  const [addKind, setAddKind] = useState<'video' | 'pdf'>('video');
  const [addForm, setAddForm] = useState(emptySectionForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptySectionForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activeTeams = teams.filter((t) => t.active !== false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [mRes, tRes] = await Promise.all([
        fetch(`/api/admin/training/modules/${id}`, { cache: 'no-store' }),
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

  function buildSectionPayload(form: ReturnType<typeof emptySectionForm>) {
    const quizErr = validateQuizDraft(form.quiz);
    if (quizErr) throw new Error(quizErr);
    const quiz = form.quiz ? parseQuizJson(form.quiz) : null;
    const est = form.estimatedMinutes.trim();
    return {
      title: form.title.trim(),
      youtubeUrl: form.youtubeUrl.trim() || null,
      summary: form.summary.trim() || null,
      estimatedMinutes: est ? Math.max(0, Math.floor(Number(est))) : null,
      isOptional: form.isOptional,
      quiz,
    };
  }

  async function addSection() {
    setError(null);
    if (!addForm.title.trim()) {
      setError('Section title is required');
      return;
    }
    try {
      const payload = buildSectionPayload(addForm);
      const res = await fetch(`/api/admin/training/modules/${id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: addKind, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add section');
      const sid = data.section?.id as string | undefined;
      setAddForm(emptySectionForm());
      await load();
      if (addKind === 'pdf' && sid) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add section');
    }
  }

  function startEdit(s: SectionRow) {
    setEditingId(s.id);
    setEditForm(sectionToForm(s));
    setError(null);
  }

  async function saveEdit(sectionId: string) {
    setError(null);
    setSavingEdit(true);
    try {
      const payload = buildSectionPayload(editForm);
      const res = await fetch(`/api/admin/training/modules/${id}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingEdit(false);
    }
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
          Edit sections in place — changes keep the same section ID and trainee links. Use{' '}
          <strong>Bump version</strong> only when you replace material and need learners to redo a
          section.
        </p>
      </div>
      {error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}

      <div className="card border-teal-100 shadow-md">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Edit module</h1>
        <p className="mb-4 text-xs text-gray-500">
          Trainee link: <span className="font-mono">/training/module/{slug}</span>
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
            title="Sort order"
            value={moduleSortOrder}
            onChange={(e) => setModuleSortOrder(Number(e.target.value))}
          />
          <button type="submit" className="btn-primary">
            Save module
          </button>
        </form>
      </div>

      <div className="card space-y-4">
        <h2 className="text-sm font-semibold">Add section</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1 ${addKind === 'video' ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setAddKind('video')}
          >
            Video
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 ${addKind === 'pdf' ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}
            onClick={() => setAddKind('pdf')}
          >
            PDF
          </button>
        </div>
        <TrainingSectionFields
          kind={addKind}
          title={addForm.title}
          onTitleChange={(v) => setAddForm((f) => ({ ...f, title: v }))}
          youtubeUrl={addForm.youtubeUrl}
          onYoutubeUrlChange={(v) => setAddForm((f) => ({ ...f, youtubeUrl: v }))}
          summary={addForm.summary}
          onSummaryChange={(v) => setAddForm((f) => ({ ...f, summary: v }))}
          estimatedMinutes={addForm.estimatedMinutes}
          onEstimatedMinutesChange={(v) => setAddForm((f) => ({ ...f, estimatedMinutes: v }))}
          isOptional={addForm.isOptional}
          onIsOptionalChange={(v) => setAddForm((f) => ({ ...f, isOptional: v }))}
          quiz={addForm.quiz}
          onQuizChange={(q) => setAddForm((f) => ({ ...f, quiz: q }))}
        />
        <button type="button" className="btn-primary text-sm" onClick={() => void addSection()}>
          Add {addKind === 'video' ? 'video' : 'PDF'} section
        </button>
      </div>

      <div className="card">
        <h2 className="mb-2 text-sm font-semibold">Sections</h2>
        <ul className="space-y-3 text-sm">
          {mod.sections.map((s, index) => (
            <li key={s.id} className="rounded border border-gray-100 p-3">
              {editingId === s.id ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500">
                    Editing: {s.kind} · v{s.contentVersion}
                  </p>
                  <TrainingSectionFields
                    kind={s.kind}
                    title={editForm.title}
                    onTitleChange={(v) => setEditForm((f) => ({ ...f, title: v }))}
                    youtubeUrl={editForm.youtubeUrl}
                    onYoutubeUrlChange={(v) => setEditForm((f) => ({ ...f, youtubeUrl: v }))}
                    summary={editForm.summary}
                    onSummaryChange={(v) => setEditForm((f) => ({ ...f, summary: v }))}
                    estimatedMinutes={editForm.estimatedMinutes}
                    onEstimatedMinutesChange={(v) => setEditForm((f) => ({ ...f, estimatedMinutes: v }))}
                    isOptional={editForm.isOptional}
                    onIsOptionalChange={(v) => setEditForm((f) => ({ ...f, isOptional: v }))}
                    quiz={editForm.quiz}
                    onQuizChange={(q) => setEditForm((f) => ({ ...f, quiz: q }))}
                    disabled={savingEdit}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={savingEdit}
                      onClick={() => void saveEdit(s.id)}
                    >
                      {savingEdit ? 'Saving…' : 'Save section'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={savingEdit}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {index + 1}. {s.title}{' '}
                      <span className="text-xs text-gray-500">
                        ({s.kind}
                        {s.isOptional ? ', optional' : ''}) v{s.contentVersion}
                        {s.quiz?.questions.length ? ` · ${s.quiz.questions.length} quiz Q` : ''}
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="btn-secondary px-2 py-0.5 text-xs"
                        onClick={() => startEdit(s)}
                      >
                        Edit
                      </button>
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
                    <label className="mt-2 inline-block cursor-pointer text-xs text-teal-700">
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
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card border-red-200 bg-red-50/40 shadow-sm">
        <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
        <p className="mt-1 text-xs text-red-800/90">
          Delete this entire module, all sections, and related learner progress.
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
