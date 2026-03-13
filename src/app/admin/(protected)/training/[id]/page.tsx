'use client';

import { useEffect, useState } from 'react';

interface VideoRow {
  id: string;
  title: string;
  youtubeUrl: string;
  presentationPdfKey?: string | null;
  version?: number;
}

interface ModuleDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  videos: VideoRow[];
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function AdminEditTrainingModulePage({ params }: PageProps) {
  const { id } = params;
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [uploadingPdfFor, setUploadingPdfFor] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/training/modules/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.module) {
          setError('Module not found');
          return;
        }
        setModule(data.module);
        setName(data.module.name);
        setSlug(data.module.slug);
        setDescription(data.module.description || '');
      })
      .catch(() => setError('Failed to load module'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!module) return;
    setSavingMeta(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/training/modules/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save module');
      setModule(data.module);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save module');
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleAddVideo() {
    setAddingVideo(true);
    setError(null);
    try {
      const title = prompt('Video title (for checklist):')?.trim();
      if (!title) return;
      const youtubeUrl = prompt('YouTube URL:')?.trim();
      if (!youtubeUrl) return;
      const res = await fetch(`/api/admin/training/modules/${id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, youtubeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add video');
      setModule((prev) =>
        prev ? { ...prev, videos: [...prev.videos, data.video] } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add video');
    } finally {
      setAddingVideo(false);
    }
  }

  async function handleUploadPdf(videoId: string, file: File) {
    setUploadingPdfFor(videoId);
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch(
        `/api/admin/training/modules/${id}/videos/${videoId}/pdf`,
        {
          method: 'POST',
          body: form,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload PDF');
      setModule((prev) =>
        prev
          ? {
              ...prev,
              videos: prev.videos.map((v) =>
                v.id === videoId ? { ...v, presentationPdfKey: data.video.presentationPdfKey } : v
              ),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload PDF');
    } finally {
      setUploadingPdfFor(null);
    }
  }

  async function handleRemovePdf(videoId: string) {
    setUploadingPdfFor(videoId);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/training/modules/${id}/videos/${videoId}/pdf`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove PDF');
      setModule((prev) =>
        prev
          ? {
              ...prev,
              videos: prev.videos.map((v) =>
                v.id === videoId ? { ...v, presentationPdfKey: null } : v
              ),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove PDF');
    } finally {
      setUploadingPdfFor(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">Module not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="mb-4 text-xl font-semibold">Edit training module</h1>
        <form onSubmit={handleSaveMeta} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Position / module name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Short description of what this training covers."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              URL slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input-field"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Link: <span className="font-mono">/training/module/{slug}</span>
            </p>
          </div>
          <button type="submit" className="btn-primary" disabled={savingMeta}>
            {savingMeta ? 'Saving…' : 'Save module'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Videos</h2>
          <button
            type="button"
            onClick={handleAddVideo}
            className="btn-secondary text-sm"
            disabled={addingVideo}
          >
            {addingVideo ? 'Adding…' : 'Add video'}
          </button>
        </div>
        {module.videos.length === 0 ? (
          <p className="text-sm text-gray-500">
            No videos yet. Click &quot;Add video&quot; to add the first one.
          </p>
        ) : (
          <ul className="space-y-3">
            {module.videos.map((v, index) => (
              <li
                key={v.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
              >
                <p className="font-medium text-gray-900">
                  {index + 1}. {v.title}
                </p>
                <p className="mt-1 text-xs text-gray-500 break-all">
                  {v.youtubeUrl}
                </p>
                {typeof v.version === 'number' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Version: {v.version}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {v.presentationPdfKey ? (
                    <span className="text-xs text-teal-700">
                      PDF uploaded
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      No presentation PDF uploaded yet.
                    </span>
                  )}
                  <label className="text-xs text-teal-700 cursor-pointer hover:text-teal-800">
                    {uploadingPdfFor === v.id ? 'Uploading…' : 'Upload / replace PDF'}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleUploadPdf(v.id, file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {v.presentationPdfKey && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700"
                      disabled={uploadingPdfFor === v.id}
                      onClick={() => void handleRemovePdf(v.id)}
                    >
                      Remove PDF
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-gray-600 hover:text-gray-800"
                    onClick={async () => {
                      setError(null);
                      const newTitle = prompt('Edit video title:', v.title)?.trim();
                      if (!newTitle) return;
                      const newUrl = prompt('Edit YouTube URL:', v.youtubeUrl)?.trim();
                      if (!newUrl) return;
                      try {
                        const res = await fetch(
                          `/api/admin/training/modules/${id}/videos/${v.id}`,
                          {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: newTitle, youtubeUrl: newUrl }),
                          }
                        );
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to update video');
                        setModule((prev) =>
                          prev
                            ? {
                                ...prev,
                                videos: prev.videos.map((vv) =>
                                  vv.id === v.id
                                    ? {
                                        ...vv,
                                        title: data.video.title,
                                        youtubeUrl: data.video.youtubeUrl,
                                      }
                                    : vv
                                ),
                              }
                            : prev
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : 'Failed to update video'
                        );
                      }
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={async () => {
                      if (!confirm('Delete this video from the module?')) return;
                      setError(null);
                      try {
                        const res = await fetch(
                          `/api/admin/training/modules/${id}/videos/${v.id}`,
                          { method: 'DELETE' }
                        );
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to delete video');
                        setModule((prev) =>
                          prev
                            ? {
                                ...prev,
                                videos: prev.videos.filter((vv) => vv.id !== v.id),
                              }
                            : prev
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : 'Failed to delete video'
                        );
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-600 hover:text-gray-800"
                    onClick={async () => {
                      setError(null);
                      try {
                        const res = await fetch(
                          `/api/admin/training/modules/${id}/videos/${v.id}/version`,
                          { method: 'POST' }
                        );
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to bump version');
                        setModule((prev) =>
                          prev
                            ? {
                                ...prev,
                                videos: prev.videos.map((vv) =>
                                  vv.id === v.id ? { ...vv, version: data.video.version } : vv
                                ),
                              }
                            : prev
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : 'Failed to bump video version'
                        );
                      }
                    }}
                  >
                    Require rewatch (new version)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

