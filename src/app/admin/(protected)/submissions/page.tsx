'use client';

import { useEffect, useState } from 'react';

interface SubmissionFile {
  stepId: string;
  label: string;
  filename: string;
  available: boolean;
}

interface Submission {
  linkId: string;
  applicantName: string;
  position: string;
  state: string;
  completedAt: string;
  fileCount: number;
  availableFileCount: number;
  files: SubmissionFile[];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/onboarding/submissions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (!cancelled) setSubmissions(data.submissions ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="card max-w-4xl border-teal-100 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Submitted onboarding packets</h1>
        <p className="text-sm text-gray-600">
          Each row is a completed onboarding. Download everything for one applicant as a ZIP, or open
          individual files. Files remain in storage for about 30 days, then the cleanup cron removes them.
        </p>
      </div>

      {error && (
        <div className="card max-w-4xl border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      )}
      {loading && (
        <div className="card max-w-4xl text-sm text-gray-500">Loading submissions…</div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="card max-w-4xl text-sm text-gray-600">
          No completed submissions yet. When a new hire finishes onboarding, their documents will appear here.
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="max-w-4xl space-y-4">
          {submissions.map((s) => {
            const expanded = expandedId === s.linkId;
            const canDownloadZip = s.availableFileCount > 0;
            return (
              <div
                key={s.linkId}
                className="card overflow-hidden border-slate-200 p-0 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-teal-50/40 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{s.applicantName}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {s.position} · {s.state}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Submitted {formatDate(s.completedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => setExpandedId(expanded ? null : s.linkId)}
                    >
                      {expanded ? 'Hide files' : `View files (${s.fileCount})`}
                    </button>
                    <a
                      href={`/api/admin/onboarding/submissions/${encodeURIComponent(s.linkId)}/download`}
                      className={`btn-primary text-sm ${!canDownloadZip ? 'pointer-events-none opacity-50' : ''}`}
                      aria-disabled={!canDownloadZip}
                      onClick={(e) => {
                        if (!canDownloadZip) e.preventDefault();
                      }}
                    >
                      Download all (ZIP)
                    </a>
                  </div>
                </div>

                {expanded && (
                  <ul className="divide-y divide-gray-100 px-5 py-2">
                    {s.files.map((f) => (
                      <li
                        key={f.stepId}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{f.label}</p>
                          <p className="font-mono text-xs text-gray-500">{f.filename}</p>
                        </div>
                        {f.available ? (
                          <a
                            href={`/api/admin/onboarding/submissions/${encodeURIComponent(s.linkId)}/file?stepId=${encodeURIComponent(f.stepId)}`}
                            className="text-teal-700 hover:text-teal-800 font-medium"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-amber-700">Expired or removed</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {!expanded && s.availableFileCount < s.fileCount && (
                  <p className="border-t border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-900">
                    {s.fileCount - s.availableFileCount} file(s) no longer in storage (likely past the 30-day
                    cleanup).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
