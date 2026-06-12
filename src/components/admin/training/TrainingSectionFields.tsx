'use client';

import type { TrainingQuiz } from '@/lib/training-quiz';
import { TrainingQuizBuilder } from './TrainingQuizBuilder';

interface TrainingSectionFieldsProps {
  kind: 'video' | 'pdf';
  title: string;
  onTitleChange: (v: string) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (v: string) => void;
  summary: string;
  onSummaryChange: (v: string) => void;
  estimatedMinutes: string;
  onEstimatedMinutesChange: (v: string) => void;
  isOptional: boolean;
  onIsOptionalChange: (v: boolean) => void;
  quiz: TrainingQuiz | null;
  onQuizChange: (q: TrainingQuiz | null) => void;
  disabled?: boolean;
}

export function TrainingSectionFields({
  kind,
  title,
  onTitleChange,
  youtubeUrl,
  onYoutubeUrlChange,
  summary,
  onSummaryChange,
  estimatedMinutes,
  onEstimatedMinutesChange,
  isOptional,
  onIsOptionalChange,
  quiz,
  onQuizChange,
  disabled,
}: TrainingSectionFieldsProps) {
  return (
    <div className="space-y-3">
      <input
        className="input-field"
        placeholder="Section title"
        value={title}
        disabled={disabled}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      {kind === 'video' && (
        <input
          className="input-field"
          placeholder="YouTube URL"
          value={youtubeUrl}
          disabled={disabled}
          onChange={(e) => onYoutubeUrlChange(e.target.value)}
        />
      )}
      <textarea
        className="input-field min-h-[64px] text-sm"
        placeholder="Short summary for trainees (optional)"
        value={summary}
        disabled={disabled}
        onChange={(e) => onSummaryChange(e.target.value)}
      />
      <input
        type="number"
        min={0}
        className="input-field"
        placeholder="Estimated minutes (optional)"
        value={estimatedMinutes}
        disabled={disabled}
        onChange={(e) => onEstimatedMinutesChange(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isOptional}
          disabled={disabled}
          onChange={(e) => onIsOptionalChange(e.target.checked)}
        />
        Optional section (visible but not required for completion)
      </label>
      <TrainingQuizBuilder value={quiz} onChange={onQuizChange} disabled={disabled} />
    </div>
  );
}
