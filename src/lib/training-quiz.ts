export interface TrainingQuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

export interface TrainingQuiz {
  questions: TrainingQuizQuestion[];
}

export function parseQuizJson(raw: unknown): TrainingQuiz | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(q) || q.length === 0) return null;
  const questions: TrainingQuizQuestion[] = [];
  for (let i = 0; i < q.length; i++) {
    const row = q[i] as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : `q${i}`;
    const prompt = typeof row.prompt === 'string' ? row.prompt.trim() : '';
    const choices = Array.isArray(row.choices)
      ? (row.choices as unknown[]).map((c) => String(c)).filter(Boolean)
      : [];
    const ci =
      typeof row.correctIndex === 'number' && !Number.isNaN(row.correctIndex)
        ? Math.floor(row.correctIndex)
        : -1;
    if (!prompt || choices.length < 2 || ci < 0 || ci >= choices.length) {
      return null;
    }
    questions.push({ id, prompt, choices, correctIndex: ci });
  }
  return questions.length ? { questions } : null;
}

/** answers: questionId -> selected choice index */
export function gradeQuiz(
  quiz: TrainingQuiz,
  answers: Record<string, number | undefined>
): { allCorrect: boolean; wrongQuestionIds: string[] } {
  const wrong: string[] = [];
  for (const question of quiz.questions) {
    const sel = answers[question.id];
    if (sel === undefined || sel !== question.correctIndex) {
      wrong.push(question.id);
    }
  }
  return { allCorrect: wrong.length === 0, wrongQuestionIds: wrong };
}
