import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  generateDailyQuiz,
  evaluateDailyQuiz,
  saveDailyQuizResult,
} from "../api/client";

import type {
  DailyQuiz,
  DailyQuizResult,
  LearningTask,
  Roadmap,
} from "../api/client";

const DAILY_QUIZ_CONTEXT_KEY =
  "novapath_daily_quiz_context";

const COMPLETED_DAYS_KEY =
  "novapath_completed_days";

function DailyQuizPage() {
  const navigate = useNavigate();

  const [quiz, setQuiz] =
    useState<DailyQuiz | null>(null);

  const [result, setResult] =
    useState<DailyQuizResult | null>(null);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // LOAD DAILY QUIZ
  // =====================================================

  useEffect(() => {
    loadQuiz();
  }, []);

  async function loadQuiz() {
    try {
      setLoading(true);
      setError("");

      const contextRaw =
        localStorage.getItem(
          DAILY_QUIZ_CONTEXT_KEY
        );

      if (!contextRaw) {
        setError(
          "No daily quiz context found."
        );
        return;
      }

      const context = JSON.parse(
        contextRaw
      );

      const roadmapRaw =
        localStorage.getItem(
          "novapath_roadmaps"
        );

      if (!roadmapRaw) {
        setError("No roadmap found.");
        return;
      }

      const roadmaps = JSON.parse(
        roadmapRaw
      );

      const roadmap: Roadmap | undefined =
        roadmaps.find(
          (item: Roadmap) =>
            item.id === context.roadmapId
        );

      if (!roadmap) {
        setError(
          "Roadmap not found."
        );
        return;
      }

      const completedTasks: LearningTask[] =
        Array.isArray(
          context.completedTasks
        )
          ? context.completedTasks
          : [];

      if (completedTasks.length === 0) {
        setError(
          "Complete today's topics before taking the Daily Quiz."
        );
        return;
      }

      const generatedQuiz =
        await generateDailyQuiz(
          roadmap,
          context.day,
          completedTasks
        );

      if (!generatedQuiz.quiz) {
        throw new Error(
          "Daily quiz was not returned by the server."
        );
      }

      setQuiz(generatedQuiz.quiz);
    } catch (err) {
      console.error(
        "Daily quiz error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate daily quiz."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // SELECT ANSWER
  // =====================================================

  function handleAnswer(
    questionId: string,
    answer: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  }

  // =====================================================
  // MARK DAY COMPLETED
  // =====================================================

  function markDayCompleted(
    dayNumber: number
  ) {
    try {
      const existingRaw =
        localStorage.getItem(
          COMPLETED_DAYS_KEY
        );

      let completedDays: number[] = [];

      if (existingRaw) {
        try {
          completedDays =
            JSON.parse(existingRaw);
        } catch {
          completedDays = [];
        }
      }

      if (
        !completedDays.includes(dayNumber)
      ) {
        completedDays.push(dayNumber);
      }

      localStorage.setItem(
        COMPLETED_DAYS_KEY,
        JSON.stringify(
          completedDays
        )
      );
    } catch (err) {
      console.error(
        "Failed to save completed day:",
        err
      );
    }
  }

  // =====================================================
  // SUBMIT QUIZ
  // =====================================================

  async function handleSubmit() {
    if (!quiz) return;

    if (
      Object.keys(answers).length !==
      quiz.questions.length
    ) {
      setError(
        "Please answer all questions before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const evaluatedResult =
        await evaluateDailyQuiz(
          quiz,
          answers
        );

      if (!evaluatedResult.result) {
        throw new Error(
          "Quiz result was not returned by the server."
        );
      }

      const finalResult =
        evaluatedResult.result;

      setResult(finalResult);

      saveDailyQuizResult(
        finalResult
      );

      // =================================================
      // IMPORTANT
      // The day is completed ONLY after
      // submitting the Daily Quiz.
      // =================================================

      markDayCompleted(
        quiz.day
      );

      // Remove the old quiz context so
      // it cannot accidentally be reused.
      localStorage.removeItem(
        DAILY_QUIZ_CONTEXT_KEY
      );
    } catch (err) {
      console.error(
        "Daily quiz evaluation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to evaluate quiz."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">
            🧠
          </div>

          <h2 className="text-xl font-semibold text-gray-800">
            Generating your Daily Quiz...
          </h2>

          <p className="text-gray-500 mt-2">
            Questions are based only on today's
            completed topics.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error && !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">
            ⚠️
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-3">
            Daily Quiz Unavailable
          </h2>

          <p className="text-gray-600 mb-6">
            {error}
          </p>

          <button
            onClick={() =>
              navigate(
                "/personalized-learning"
              )
            }
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Back to Learning Plan
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // RESULT SCREEN
  // =====================================================

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">

            <div className="text-center">
              <div className="text-6xl mb-4">
                {result.percentage >= 80
                  ? "🎉"
                  : result.percentage >= 60
                  ? "👍"
                  : "📚"}
              </div>

              <h1 className="text-3xl font-bold text-gray-900">
                Day {result.day} Complete!
              </h1>

              <p className="text-gray-500 mt-2">
                Daily Quiz Completed
              </p>

              <div className="text-5xl font-bold text-indigo-600 mt-6">
                {result.percentage}%
              </div>

              <p className="text-gray-500 mt-2">
                {result.correctAnswers} /{" "}
                {result.totalQuestions} correct
              </p>

              {result.status && (
                <div className="mt-4 inline-block px-4 py-2 rounded-full bg-gray-100 font-semibold text-gray-700">
                  {result.status}
                </div>
              )}
            </div>

            {/* Strengths / Weaknesses */}

            <div className="grid md:grid-cols-2 gap-6 mt-8">

              <div className="border rounded-xl p-5">
                <h3 className="font-bold text-green-700 mb-3">
                  ✅ Strengths
                </h3>

                {result.strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {result.strengths.map(
                      (item, index) => (
                        <li
                          key={`${item}-${index}`}
                          className="text-gray-700"
                        >
                          • {item}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="text-gray-500">
                    Keep practicing to build
                    your strengths.
                  </p>
                )}
              </div>

              <div className="border rounded-xl p-5">
                <h3 className="font-bold text-red-700 mb-3">
                  📌 Areas to Improve
                </h3>

                {result.weaknesses.length > 0 ? (
                  <ul className="space-y-2">
                    {result.weaknesses.map(
                      (item, index) => (
                        <li
                          key={`${item}-${index}`}
                          className="text-gray-700"
                        >
                          • {item}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="text-gray-500">
                    Great job! No major weak
                    areas identified.
                  </p>
                )}
              </div>
            </div>

            {/* Result */}

            {result.message && (
              <div className="mt-6 bg-indigo-50 rounded-xl p-5">
                <h3 className="font-bold text-indigo-900 mb-2">
                  📊 Result
                </h3>

                <p className="text-indigo-800">
                  {result.message}
                </p>
              </div>
            )}

            {/* Continue */}

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">

              <button
                onClick={() =>
                  navigate(
                    "/personalized-learning"
                  )
                }
                className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                🚀 Continue to Next Day
              </button>

            </div>

          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // NO QUIZ
  // =====================================================

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">
          No quiz available.
        </p>
      </div>
    );
  }

  // =====================================================
  // QUIZ SCREEN
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center">

            <div className="text-5xl mb-3">
              🧠
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Day {quiz.day} Daily Quiz
            </h1>

            <p className="text-gray-500 mt-2">
              Test what you learned today.
            </p>

            <div className="mt-4 text-sm text-gray-500">
              {quiz.questions.length} questions
            </div>

          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">

          {quiz.questions.map(
            (question, index) => (
              <div
                key={question.id}
                className="bg-white rounded-2xl shadow p-6"
              >

                <div className="flex gap-3 mb-5">
                  <span className="font-bold text-indigo-600">
                    Q{index + 1}.
                  </span>

                  <h2 className="font-semibold text-gray-900">
                    {question.question}
                  </h2>
                </div>

                <div className="space-y-3">

                  {question.options.map(
                    (
                      option,
                      optionIndex
                    ) => {

                      const selected =
                        answers[
                          question.id
                        ] === option;

                      return (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          type="button"
                          onClick={() =>
                            handleAnswer(
                              question.id,
                              option
                            )
                          }
                          className={`w-full text-left p-4 rounded-xl border transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50"
                              : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">

                            <div
                              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                                selected
                                  ? "border-indigo-600 bg-indigo-600"
                                  : "border-gray-300"
                              }`}
                            />

                            <span className="text-gray-700">
                              {option}
                            </span>

                          </div>
                        </button>
                      );
                    }
                  )}

                </div>
              </div>
            )
          )}

        </div>

        <div className="flex justify-center mt-8 pb-10">

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-10 py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting
              ? "Evaluating..."
              : "Submit Daily Quiz"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default DailyQuizPage;