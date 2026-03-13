'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function AdminNewTrainingModulePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: (slug || slugify(name)).trim(),
        description: description.trim() || undefined,
      };
      const res = await fetch('/api/admin/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create module');
      router.push('/admin/training');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create module');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card max-w-lg">
      <h1 className="mb-4 text-xl font-semibold">Add training module</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Position / module name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            className="input-field"
            placeholder="e.g. Employment Specialist"
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
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="input-field"
            placeholder="employment-specialist"
          />
          <p className="mt-1 text-xs text-gray-500">
            Final link will be <span className="font-mono">/training/module/{slug || slugify(name) || 'your-slug'}</span>
          </p>
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Create module'}
        </button>
      </form>
    </div>
  );
}

