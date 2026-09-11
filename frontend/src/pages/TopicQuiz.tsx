import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  generateTopicQuiz,
  evaluateTopicQuiz,
  saveTopicQuizResult,
} from "../api/client";

import type {
  Roadmap,
  LearningTask,
  TopicQuiz as TopicQuizType,
  TopicQuizResult,
} from "../api/client";

const TOPIC_QUIZ_CONTEXT_KEY = "novapath_topic_quiz_context";

type TopicQuizContext = {
  roadmapId: string;
  roadmapTitle: string;
  day: number;
  topicId: string;
  topicTitle: string;
  completedTasks: LearningTask[];
};

function TopicQuiz() {
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<TopicQuizType | null>(null);
  const [result, setResult] = useState<TopicQuizResult | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [context, setContext] = useState<TopicQuizContext | null>(null);

  useEffect(() => {
    loadQuiz();
  }, []);

  async function loadQuiz() {
    try {
      setLoading(true);
      setError("");

      const savedContext = localStorage.getItem(TOPIC_QUIZ_CONTEXT_KEY);

      if (!savedContext) {
        throw new Error(
          "Topic quiz information was not found. Please start the quiz from your learning plan."
        );
      }

      const quizContext: TopicQuizContext = JSON.parse(savedContext);

      setContext(quizContext);

      const savedRoadmaps = localStorage.getItem("novapath_roadmaps");

      if (!savedRoadmaps) {
        throw new Error("Roadmap not found.");
      }

      const roadmaps: Roadmap[] = JSON.parse(savedRoadmaps);

      const roadmap = roadmaps.find(
        (item) => item.id === quizContext.roadmapId
      );

      if (!roadmap) {
        throw new Error("The selected roadmap could not be found.");
      }

      const generatedQuiz = await generateTopicQuiz(
        roadmap,
        {
          id: quizContext.topicId,
          title: quizContext.topicTitle,
        },
        quizContext.completedTasks
      );

      if (!generatedQuiz) {
        throw new Error("Topic quiz was not generated.");
      }

      setQuiz(generatedQuiz);
    } catch (err) {
      console.error("Topic quiz error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate topic quiz."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(questionId: string, answer: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  }

  async function handleSubmit() {
    if (!quiz) return;

    const unanswered = quiz.questions.filter(
      (question) => !answers[question.id]
    );

    if (unanswered.length > 0) {
      alert(
        `Please answer all questions before submitting.\n\n${unanswered.length} question(s) are unanswered.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const evaluatedResult = await evaluateTopicQuiz(quiz, answers);

      if (!evaluatedResult) {
        throw new Error("Quiz result was not returned by the server.");
      }

      setResult(evaluatedResult);

      saveTopicQuizResult(evaluatedResult);

      /*
       * Save the result again inside personalization data
       * so future AI learning plans can use the weak topics.
       */
      try {
        const existingPreferences = localStorage.getItem(
          "novapath_personalization"
        );

        if (existingPreferences) {
          const preferences = JSON.parse(existingPreferences);

          const previousResults = Array.isArray(
            preferences.topicQuizResults
          )
            ? preferences.topicQuizResults
            : [];

          const updatedResults = [
            ...previousResults.filter(
              (item: TopicQuizResult) =>
                item.quizId !== evaluatedResult.quizId
            ),
            evaluatedResult,
          ];

          preferences.topicQuizResults = updatedResults;

          localStorage.setItem(
            "novapath_personalization",
            JSON.stringify(preferences)
          );
        }
      } catch (storageError) {
        console.warn(
          "Could not update personalization results:",
          storageError
        );
      }
    } catch (err) {
      console.error("Quiz evaluation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to evaluate quiz."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackToLearningPlan() {
    localStorage.removeItem(TOPIC_QUIZ_CONTEXT_KEY);
    navigate("/personalized-learning");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🧠</div>

          <h1 className="text-2xl font-bold mb-2">
            Generating Topic Quiz...
          </h1>

          <p className="text-slate-400">
            AI is preparing questions based on what you just learned.
          </p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-2xl mx-auto pt-20">
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>

            <h1 className="text-2xl font-bold mb-3">
              Unable to Load Quiz
            </h1>

            <p className="text-red-200 mb-6">
              {error}
            </p>

            <button
              onClick={handleBackToLearningPlan}
              className="px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-200 transition"
            >
              ← Back to Learning Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result && quiz && context) {
    const percentage = result.percentage;

    const statusEmoji =
      result.status === "Mastered"
        ? "🎉"
        : result.status === "Revise"
        ? "📚"
        : "💪";

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-4xl mx-auto py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{statusEmoji}</div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Topic Quiz Completed!
            </h1>

            <p className="text-slate-400">
              {context.topicTitle}
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-6">
            <div className="text-center">
              <p className="text-slate-400 mb-2">
                Your Score
              </p>

              <div className="text-6xl font-bold mb-3">
                {percentage}%
              </div>

              <p className="text-lg font-semibold mb-2">
                {result.correctAnswers} / {result.totalQuestions} correct
              </p>

              <div className="inline-block px-4 py-2 rounded-full bg-slate-800">
                {result.status}
              </div>

              <p className="text-slate-300 mt-5">
                {result.message}
              </p>
            </div>
          </div>

          {/* Result Summary */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">
                ✅ Correct Answers
              </h2>

              <p className="text-3xl font-bold">
                {result.correctAnswers}
              </p>

              <p className="text-slate-400 mt-1">
                Questions answered correctly
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">
                ❌ Wrong Answers
              </h2>

              <p className="text-3xl font-bold">
                {result.wrongAnswers}
              </p>

              <p className="text-slate-400 mt-1">
                Questions that need more practice
              </p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-3">
              🤖 AI Recommendation
            </h2>

            {percentage >= 80 ? (
              <p className="text-slate-300">
                Excellent! You have demonstrated strong understanding of{" "}
                <span className="font-semibold text-white">
                  {context.topicTitle}
                </span>
                . You can continue to the next topic.
              </p>
            ) : percentage >= 60 ? (
              <p className="text-slate-300">
                Good progress! Review the important concepts of{" "}
                <span className="font-semibold text-white">
                  {context.topicTitle}
                </span>{" "}
                before moving forward.
              </p>
            ) : (
              <p className="text-slate-300">
                You need some more practice with{" "}
                <span className="font-semibold text-white">
                  {context.topicTitle}
                </span>
                . Revise the learning material and practice the topic
                again before moving ahead.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBackToLearningPlan}
              className="px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-200 transition"
            >
              ← Back to Learning Plan
            </button>

            {percentage < 80 && (
              <button
                onClick={() => {
                  localStorage.removeItem(TOPIC_QUIZ_CONTEXT_KEY);
                  navigate("/personalized-learning");
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 font-semibold hover:bg-slate-700 transition"
              >
                📚 Review Topic
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToLearningPlan}
            className="text-slate-400 hover:text-white mb-6 transition"
          >
            ← Back to Learning Plan
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">
                  Day {context?.day ?? ""}
                </p>

                <h1 className="text-3xl font-bold">
                  📝 Topic Quiz
                </h1>

                <p className="text-lg text-slate-300 mt-2">
                  {quiz.topicTitle}
                </p>
              </div>

              <div className="bg-slate-800 rounded-xl px-5 py-3 text-center">
                <p className="text-sm text-slate-400">
                  Questions
                </p>

                <p className="text-2xl font-bold">
                  {quiz.questions.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <p className="text-slate-300">
            🧠 Answer all questions based on the{" "}
            <span className="font-semibold text-white">
              {quiz.topicTitle}
            </span>{" "}
            topic you just completed.
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {quiz.questions.map((question, index) => {
            const selectedAnswer = answers[question.id];

            return (
              <div
                key={question.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
              >
                <div className="flex gap-3 mb-5">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <h2 className="text-lg md:text-xl font-semibold leading-relaxed">
                    {question.question}
                  </h2>
                </div>

                <div className="space-y-3 ml-0 md:ml-12">
                  {question.options.map((option, optionIndex) => {
                    const isSelected =
                      selectedAnswer === option;

                    return (
                      <button
                        key={`${question.id}-${optionIndex}`}
                        type="button"
                        onClick={() =>
                          handleAnswer(question.id, option)
                        }
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          isSelected
                            ? "border-white bg-slate-700"
                            : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isSelected
                                ? "bg-white text-slate-900"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {String.fromCharCode(
                              65 + optionIndex
                            )}
                          </div>

                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-950/40 border border-red-500/40 rounded-xl p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-8 pb-10">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? "⏳ Evaluating Quiz..."
              : "✅ Submit Topic Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopicQuiz;