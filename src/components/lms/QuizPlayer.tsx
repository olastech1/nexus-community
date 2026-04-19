'use client';

import { useState, useEffect, useCallback } from 'react';

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'text';
  options: string[];
  points: number;
  position: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimitMinutes: number | null;
  totalPoints: number;
  questions: QuizQuestion[];
}

interface GradedAnswer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
}

interface AttemptResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
}

interface BestAttempt {
  percentage: number;
  passed: boolean;
  score: number;
  maxScore: number;
}

export default function QuizPlayer({ lessonId }: { lessonId: string }) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [bestAttempt, setBestAttempt] = useState<BestAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [gradedAnswers, setGradedAnswers] = useState<GradedAnswer[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/quizzes?lessonId=${lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data.quiz);
        setBestAttempt(data.bestAttempt);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);

    const answerPayload = quiz.questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || '',
    }));

    try {
      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, answers: answerPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.attempt);
        setGradedAnswers(data.gradedAnswers);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const resetQuiz = () => {
    setAnswers({});
    setResult(null);
    setGradedAnswers([]);
    setShowQuiz(true);
  };

  if (loading) {
    return <div className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-4)' }} />;
  }

  if (!quiz) return null;

  // Compact preview when quiz exists but not started
  if (!showQuiz && !result) {
    return (
      <div className="quiz-card">
        <div className="quiz-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '28px' }}>📝</span>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{quiz.title}</h4>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                {quiz.questions.length} questions • {quiz.totalPoints} points • Pass: {quiz.passingScore}%
                {quiz.timeLimitMinutes && ` • ${quiz.timeLimitMinutes} min`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {bestAttempt && (
              <span className={`badge ${bestAttempt.passed ? 'badge-success' : 'badge-warning'}`}>
                Best: {bestAttempt.percentage}%
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowQuiz(true)}>
              {bestAttempt ? 'Retake Quiz' : 'Start Quiz'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="quiz-card">
        <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
          <div style={{ fontSize: '56px', marginBottom: 'var(--space-3)' }}>
            {result.passed ? '🎉' : '😔'}
          </div>
          <h3 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            {result.passed ? 'Congratulations!' : 'Keep Trying!'}
          </h3>
          <div className={`quiz-score ${result.passed ? 'passed' : 'failed'}`}>
            {result.percentage}%
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            {result.score} / {result.maxScore} points
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
            Passing score: {result.passingScore}%
          </p>
        </div>

        {/* Graded answers review */}
        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)' }}>
          <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>Review Answers</h4>
          {gradedAnswers.map((ga, idx) => {
            const question = quiz.questions.find(q => q.id === ga.questionId);
            return (
              <div key={ga.questionId} className={`quiz-review-item ${ga.isCorrect ? 'correct' : 'incorrect'}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: '14px' }}>{ga.isCorrect ? '✅' : '❌'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)', marginBottom: '4px' }}>
                      {idx + 1}. {question?.questionText}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Your answer: <strong>{ga.userAnswer || '(blank)'}</strong>
                    </p>
                    {!ga.isCorrect && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--success)' }}>
                        Correct: <strong>{ga.correctAnswer}</strong>
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {ga.points}/{ga.maxPoints}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button className="btn btn-ghost" onClick={() => { setResult(null); setShowQuiz(false); }}>Close</button>
          <button className="btn btn-primary" onClick={resetQuiz}>Retake Quiz</button>
        </div>
      </div>
    );
  }

  // Active quiz
  return (
    <div className="quiz-card">
      <div className="quiz-header" style={{ marginBottom: 'var(--space-4)' }}>
        <h4 style={{ fontWeight: 700 }}>📝 {quiz.title}</h4>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          {quiz.questions.length} questions • Pass: {quiz.passingScore}%
        </span>
      </div>

      {quiz.description && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
          {quiz.description}
        </p>
      )}

      <div className="quiz-questions">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="quiz-question">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {idx + 1}. {q.questionText}
              </p>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: 'var(--space-2)' }}>
                {q.points} pt{q.points !== 1 ? 's' : ''}
              </span>
            </div>

            {q.questionType === 'multiple_choice' && (
              <div className="quiz-options">
                {(q.options as string[]).map((opt, optIdx) => (
                  <label key={optIdx} className={`quiz-option-label ${answers[q.id] === opt ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.questionType === 'true_false' && (
              <div className="quiz-options">
                {['True', 'False'].map(opt => (
                  <label key={opt} className={`quiz-option-label ${answers[q.id] === opt.toLowerCase() ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.toLowerCase()}
                      checked={answers[q.id] === opt.toLowerCase()}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt.toLowerCase() })}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.questionType === 'text' && (
              <input
                className="input"
                placeholder="Type your answer..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                style={{ fontSize: 'var(--text-sm)' }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
        <button className="btn btn-ghost" onClick={() => setShowQuiz(false)}>Cancel</button>
        <button className="btn btn-gradient" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner spinner-sm" /> : '✓ Submit Quiz'}
        </button>
      </div>
    </div>
  );
}
