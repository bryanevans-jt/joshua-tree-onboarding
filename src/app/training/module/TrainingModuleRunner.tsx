'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { YouTubeEvent, YouTubeProps } from 'react-youtube';
import { youtubeIdFromUrl } from '@/lib/training-youtube';

const YouTube = dynamic(
  () =>
    import('react-youtube').then(
      (m) => m.default as unknown as ComponentType<YouTubeProps>
    ),
  { ssr: false, loading: () => <div className="absolute inset-0 animate-pulse bg-gray-900/90" /> }
);

type LearnerQuiz = { questions: { id: string; prompt: string; choices: string[] }[] } | null;

export interface TrainingModuleRunnerProps {
  initial: {
    module: {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      isCompanyWide: boolean;
      teamId: string | null;
    };
    sections: Array<{
      id: string;
      title: string;
      kind: 'video' | 'pdf';
      orderIndex: number;
      youtubeUrl: string | null;
      hasPdf: boolean;
      summary?: string | null;
      estimatedMinutes?: number | null;
      contentVersion: number;
      quiz: LearnerQuiz;
    }>;
    progress: Array<{
      sectionId: string;
      satisfied: boolean;
      videoCompletedAt: string | null;
      quizPassedAt: string | null;
      quizAttempts: number;
      contentVersion: number | null;
    }>;
    lockedTeamContent: boolean;
    companyWideProgramComplete: boolean;
  };
}

export function TrainingModuleRunner({ initial }: TrainingModuleRunnerProps) {
  const [sections] = useState(initial.sections);
  const [progress, setProgress] = useState(initial.progress);
  const [selectedId, setSelectedId] = useState(initial.sections[0]?.id ?? '');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizMessage, setQuizMessage] = useState<string | null>(null);
  const [player, setPlayer] = useState<import('react-youtube').YouTubePlayer | null>(null);
  const [watched, setWatched] = useState(0);
  const [duration, setDuration] = useState(0);
  const markingRef = useRef(false);

  const lockedInteraction =
    !initial.module.isCompanyWide && initial.lockedTeamContent;

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? sections[0] ?? null,
    [sections, selectedId]
  );

  const progMap = useMemo(() => {
    const m = new Map<string, (typeof progress)[0]>();
    for (const p of progress) m.set(p.sectionId, p);
    return m;
  }, [progress]);

  async function refreshProgress() {
    const slug = initial.module.slug;
    const res = await fetch(`/api/training/dashboard?slug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (data.progress) setProgress(data.progress);
  }

  useEffect(() => {
    if (!player || !selected || selected.kind !== 'video') return;
    let last = 0;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const t = await player.getCurrentTime();
        const d = await player.getDuration();
        if (!Number.isNaN(d) && d > 0) setDuration(d);
        if (!Number.isNaN(t) && t >= last) {
          setWatched((w) => w + (t - last));
          last = t;
        } else last = t;
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearInterval(id);
  }, [player, selected?.id, selected?.kind]);

  useEffect(() => {
    setPlayer(null);
    setWatched(0);
    setDuration(0);
    setQuizMessage(null);
    setAnswers({});
  }, [selected?.id]);

  const isSatisfied = (sid: string) => progress.find((p) => p.sectionId === sid)?.satisfied;

  async function markVideo() {
    if (!selected || selected.kind !== 'video' || lockedInteraction) return;
    if (markingRef.current) return;
    markingRef.current = true;
    try {
      const res = await fetch('/api/training/section/video-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: selected.id }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setQuizMessage(e.error || 'Could not save video progress.');
        return;
      }
      await refreshProgress();
    } finally {
      markingRef.current = false;
    }
  }

  function onStateChange() {
    if (!selected || selected.kind !== 'video' || lockedInteraction) return;
    const pv = progMap.get(selected.id);
    if (pv?.videoCompletedAt && pv.contentVersion === selected.contentVersion) return;
    if (duration > 0 && watched / duration >= 0.9) {
      void markVideo();
    }
  }

  async function submitQuiz() {
    if (!selected || lockedInteraction) return;
    if (!selected.quiz?.questions.length) return;
    const p = progMap.get(selected.id);
    if (selected.kind === 'video' && selected.quiz) {
      if (!p?.videoCompletedAt) {
        setQuizMessage('Watch at least 90% of the video before submitting the quiz.');
        return;
      }
    }
    setQuizMessage(null);
    const res = await fetch('/api/training/section/quiz-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionId: selected.id, answers }),
    });
    const data = await res.json();
    if (!res.ok) {
      setQuizMessage(data.error || 'Submit failed.');
      return;
    }
    if (!data.allCorrect) {
      setQuizMessage('Some answers are incorrect. Fix the missed questions and try again.');
      const wrong = new Set(data.wrongQuestionIds as string[]);
      setAnswers((prev) => {
        const n = { ...prev };
        for (const q of selected.quiz!.questions) {
          if (wrong.has(q.id)) delete n[q.id];
        }
        return n;
      });
    } else {
      setQuizMessage('Perfect — section complete.');
      await refreshProgress();
    }
  }

  if (!selected) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">This module has no sections yet.</p>
      </div>
    );
  }

  const yid = selected.kind === 'video' ? youtubeIdFromUrl(selected.youtubeUrl || '') : undefined;

  return (
    <div className="space-y-4">
      {lockedInteraction && (
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
          Complete all company-wide training to unlock progress on this team module. You can still
          review materials when unlocked.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="card h-fit lg:sticky lg:top-24">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Sections</h2>
          <ol className="space-y-2 text-sm">
            {sections.map((s, i) => {
              const done = !!isSatisfied(s.id);
              const active = s.id === selected.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-1.5 text-left ${
                      active ? 'bg-teal-50 font-medium text-teal-800' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <span className="text-xs text-gray-400">{i + 1}. </span>
                    {s.title}
                    <span className="mt-0.5 block text-xs">
                      {done ? (
                        <span className="font-medium text-emerald-600">✓ Cleared</span>
                      ) : (
                        <span className="text-gray-500">○ Up next</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{selected.title}</h2>
            {selected.summary && (
              <p className="mt-2 text-sm text-gray-600">{selected.summary}</p>
            )}
          </div>

          {selected.kind === 'video' && yid && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <div className="absolute inset-0">
                <YouTube
                  key={selected.id}
                  videoId={yid}
                  className="h-full w-full"
                  iframeClassName="absolute left-0 top-0 h-full w-full min-h-full min-w-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: { modestbranding: 1, rel: 0 },
                  }}
                  onReady={(e) => {
                    setPlayer(e.target);
                    setWatched(0);
                    setDuration(0);
                  }}
                  onStateChange={onStateChange}
                />
              </div>
            </div>
          )}

          {selected.kind === 'video' && !yid && (
            <p className="text-sm text-red-600">Invalid or missing YouTube URL.</p>
          )}

          {selected.kind === 'pdf' && selected.hasPdf && (
            <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <iframe
                title={selected.title}
                className="h-full w-full"
                src={`/api/training/section-pdf?sectionId=${encodeURIComponent(selected.id)}`}
              />
            </div>
          )}

          {selected.quiz && selected.quiz.questions.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-800">Quiz</h3>
              {quizMessage && (
                <p className="text-sm text-gray-700" role="status">
                  {quizMessage}
                </p>
              )}
              {selected.quiz.questions.map((q) => (
                <fieldset key={q.id} className="space-y-2">
                  <legend className="text-sm font-medium text-gray-800">{q.prompt}</legend>
                  {q.choices.map((c, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                        disabled={lockedInteraction || !!progMap.get(selected.id)?.quizPassedAt}
                      />
                      {c}
                    </label>
                  ))}
                </fieldset>
              ))}
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={
                  lockedInteraction ||
                  !!progMap.get(selected.id)?.quizPassedAt ||
                  !selected.quiz?.questions.every((q) => answers[q.id] !== undefined)
                }
                onClick={() => void submitQuiz()}
              >
                Submit quiz
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
