'use client';

import type { TrainingQuiz, TrainingQuizQuestion } from '@/lib/training-quiz';
import { createEmptyQuestion } from '@/lib/training-quiz';

interface TrainingQuizBuilderProps {
  value: TrainingQuiz | null;
  onChange: (quiz: TrainingQuiz | null) => void;
  disabled?: boolean;
}

function cloneQuiz(quiz: TrainingQuiz | null): TrainingQuiz {
  if (!quiz) return { questions: [] };
  return {
    questions: quiz.questions.map((q) => ({
      ...q,
      choices: [...q.choices],
    })),
  };
}

export function TrainingQuizBuilder({ value, onChange, disabled }: TrainingQuizBuilderProps) {
  const quiz = value ?? { questions: [] };

  function update(next: TrainingQuiz) {
    onChange(next.questions.length === 0 ? null : next);
  }

  function setQuestion(index: number, patch: Partial<TrainingQuizQuestion>) {
    const next = cloneQuiz(quiz);
    next.questions[index] = { ...next.questions[index], ...patch };
    update(next);
  }

  function addQuestion() {
    const next = cloneQuiz(quiz);
    next.questions.push(createEmptyQuestion(next.questions.length));
    update(next);
  }

  function removeQuestion(index: number) {
    const next = cloneQuiz(quiz);
    next.questions.splice(index, 1);
    update(next);
  }

  function setChoice(qIndex: number, cIndex: number, text: string) {
    const next = cloneQuiz(quiz);
    const choices = [...next.questions[qIndex].choices];
    choices[cIndex] = text;
    next.questions[qIndex] = { ...next.questions[qIndex], choices };
    update(next);
  }

  function addChoice(qIndex: number) {
    const next = cloneQuiz(quiz);
    next.questions[qIndex] = {
      ...next.questions[qIndex],
      choices: [...next.questions[qIndex].choices, ''],
    };
    update(next);
  }

  function removeChoice(qIndex: number, cIndex: number) {
    const next = cloneQuiz(quiz);
    const q = next.questions[qIndex];
    if (q.choices.length <= 2) return;
    const choices = q.choices.filter((_, i) => i !== cIndex);
    let correctIndex = q.correctIndex;
    if (cIndex === correctIndex) correctIndex = 0;
    else if (cIndex < correctIndex) correctIndex -= 1;
    next.questions[qIndex] = { ...q, choices, correctIndex };
    update(next);
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">Quiz (optional)</p>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={disabled}
          onClick={addQuestion}
        >
          Add question
        </button>
      </div>
      {quiz.questions.length === 0 ? (
        <p className="text-xs text-gray-500">No quiz — section completes after the video or PDF.</p>
      ) : (
        <ol className="space-y-4">
          {quiz.questions.map((q, qi) => (
            <li key={q.id} className="rounded-md border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">Question {qi + 1}</span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={disabled}
                  onClick={() => removeQuestion(qi)}
                >
                  Remove
                </button>
              </div>
              <input
                className="input-field mb-3 text-sm"
                placeholder="Question prompt"
                value={q.prompt}
                disabled={disabled}
                onChange={(e) => setQuestion(qi, { prompt: e.target.value })}
              />
              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs text-gray-600">Answers (select the correct one)</legend>
                {q.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === ci}
                      disabled={disabled}
                      onChange={() => setQuestion(qi, { correctIndex: ci })}
                    />
                    <input
                      className="input-field flex-1 text-sm"
                      placeholder={`Choice ${ci + 1}`}
                      value={choice}
                      disabled={disabled}
                      onChange={(e) => setChoice(qi, ci, e.target.value)}
                    />
                    {q.choices.length > 2 && (
                      <button
                        type="button"
                        className="text-xs text-gray-500 hover:text-red-600"
                        disabled={disabled}
                        onClick={() => removeChoice(qi, ci)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-teal-700 hover:text-teal-800"
                  disabled={disabled}
                  onClick={() => addChoice(qi)}
                >
                  Add choice
                </button>
              </fieldset>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
