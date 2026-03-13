'use client';

import { useEffect, useMemo, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';

interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
  version: number;
  presentationPdfKey?: string | null;
}

interface Props {
  moduleId: string;
  moduleName: string;
  videos: Video[];
}

interface Completion {
  videoId: string;
  videoVersion: number;
}

export function TrainingModuleClient({ moduleId, moduleName, videos }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    videos[0]?.id ?? null
  );
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [watchedSeconds, setWatchedSeconds] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const selected = useMemo(
    () => videos.find((v) => v.id === selectedId) ?? videos[0] ?? null,
    [videos, selectedId]
  );

  useEffect(() => {
    if (!moduleId) return;
    fetch(`/api/training/progress?moduleId=${encodeURIComponent(moduleId)}`)
      .then((r) => r.json())
      .then((data) => setCompletions(data.completions ?? []))
      .catch(() => {});
  }, [moduleId]);

  useEffect(() => {
    if (!player) return;
    let lastTime = 0;
    const interval = setInterval(async () => {
      try {
        const t = await player.getCurrentTime();
        const d = await player.getDuration();
        if (!Number.isNaN(d) && d > 0) {
          setDuration(d);
        }
        if (!Number.isNaN(t) && t >= lastTime) {
          setWatchedSeconds((prev) => prev + (t - lastTime));
          lastTime = t;
        } else {
          lastTime = t;
        }
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player]);

  function isVideoComplete(video: Video): boolean {
    return completions.some(
      (c) => c.videoId === video.id && c.videoVersion === video.version
    );
  }

  async function markComplete(video: Video) {
    if (!video) return;
    try {
      const res = await fetch('/api/training/complete-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, videoId: video.id }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setCompletions((prev) => {
        const existing = prev.filter((c) => c.videoId !== video.id);
        return [...existing, { videoId: video.id, videoVersion: video.version }];
      });
    } catch {
      // swallow, user can rewatch
    }
  }

  function handleReady(e: YouTubeEvent) {
    setPlayer(e.target);
    setWatchedSeconds(0);
    setDuration(0);
  }

  function handleStateChange(e: YouTubeEvent) {
    const state = e.data;
    if (!selected || isVideoComplete(selected)) return;
    if (state === 0 /* ended */ || state === 2 /* paused */ || state === 1) {
      if (duration > 0 && watchedSeconds / duration >= 0.9) {
        void markComplete(selected);
      }
    }
  }

  function youtubeIdFromUrl(url: string): string | undefined {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1);
      }
      if (u.searchParams.get('v')) {
        return u.searchParams.get('v') ?? undefined;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  if (!selected) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">
          No videos have been added to this module yet.
        </p>
      </div>
    );
  }

  const videoId = youtubeIdFromUrl(selected.youtubeUrl);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
      <aside className="card h-fit">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">
          Training checklist
        </h2>
        {videos.length === 0 ? (
          <p className="text-sm text-gray-500">
            No videos have been added to this module yet.
          </p>
        ) : (
          <ol className="space-y-2 text-sm">
            {videos.map((video, index) => {
              const done = isVideoComplete(video);
              const isActive = video.id === selected.id;
              return (
                <li
                  key={video.id}
                  className="flex items-start gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedId(video.id);
                    setWatchedSeconds(0);
                    setDuration(0);
                  }}
                >
                  <span className="mt-0.5 text-xs text-gray-400">
                    {index + 1}.
                  </span>
                  <div>
                    <p
                      className={`${
                        isActive ? 'text-teal-700' : 'text-gray-800'
                      }`}
                    >
                      {video.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {done ? 'Completed' : 'Not yet completed'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </aside>

      <main className="card space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {selected.title}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            All videos in this module must be completed as part of onboarding. You
            can revisit them anytime as a reference.
          </p>
        </div>

        {videoId ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <div className="absolute inset-0">
              <YouTube
                videoId={videoId}
                className="h-full w-full"
                iframeClassName="absolute left-0 top-0 h-full w-full min-h-full min-w-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    modestbranding: 1,
                    rel: 0,
                  },
                }}
                onReady={handleReady}
                onStateChange={handleStateChange}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-600">
            Unable to load this video. Please contact your administrator.
          </p>
        )}

        {selected.presentationPdfKey && (
          <a
            href={`/api/training/presentation?moduleId=${encodeURIComponent(
              moduleId
            )}&videoId=${encodeURIComponent(selected.id)}`}
            className="inline-flex text-sm font-medium text-teal-600 hover:text-teal-700 underline"
          >
            Download presentation (PDF)
          </a>
        )}
      </main>
    </div>
  );
}

