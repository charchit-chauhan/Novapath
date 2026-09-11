import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  evaluateSkillAssessment,
  generateSkillAssessment,
  getAssessmentResult,
  saveAssessmentResult,
} from "../api/client";

import type {
  Roadmap,
  SkillAssessmentQuestion,
  SkillAssessmentResult,
} from "../api/client";

const ROADMAPS_KEY = "novapath_roadmaps";
const SELECTED_ROADMAP_KEY = "novapath_selected_roadmap";

function SkillAssessment() {
  const navigate = useNavigate();

  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [questions, setQuestions] = useState<SkillAssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SkillAssessmentResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD ROADMAPS
  // =====================================================

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(ROADMAPS_KEY) || "[]"
      );

      if (Array.isArray(stored)) {
        setRoadmaps(stored);

        const selectedId = localStorage.getItem(
          SELECTED_ROADMAP_KEY
        );

        if (selectedId) {
          const exists = stored.some(
            (roadmap: Roadmap) =>
              String(roadmap.id) === String(selectedId)
          );

          if (exists) {
            setSelectedRoadmapId(String(selectedId));
          } else if (stored.length > 0) {
            setSelectedRoadmapId(String(stored[0].id));
          }
        } else if (stored.length > 0) {
          setSelectedRoadmapId(String(stored[0].id));
        }
      } else {
        setRoadmaps([]);
      }
    } catch (err) {
      console.error("Failed to load roadmaps:", err);
      setRoadmaps([]);
      setError("Failed to load your roadmaps.");
    }
  }, []);

  // =====================================================
  // LOAD PREVIOUS ASSESSMENT RESULT
  // =====================================================

  useEffect(() => {
    if (!selectedRoadmapId) return;

    try {
      const savedResult = getAssessmentResult(selectedRoadmapId);

      if (savedResult) {
        setResult(savedResult);
      }
    } catch (err) {
      console.error("Failed to load assessment result:", err);
    }
  }, [selectedRoadmapId]);

  // =====================================================
  // SELECTED ROADMAP
  // =====================================================

  const selectedRoadmap = roadmaps.find(
    (roadmap) =>
      String(roadmap.id) === String(selectedRoadmapId)
  );

  // =====================================================
  // START ASSESSMENT
  // =====================================================

  const startAssessment = async () => {
    if (!selectedRoadmap) {
      setError("Please select a roadmap first.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setResult(null);

    try {
      /*
       * skillLevel is optional in the updated client.ts.
       * Passing Beginner here keeps this compatible with
       * the existing assessment flow.
       */
      const generatedQuestions =
        await generateSkillAssessment(
          selectedRoadmap,
          "Beginner"
        );

      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length === 0
      ) {
        throw new Error(
          "No assessment questions were generated."
        );
      }

      setQuestions(generatedQuestions);
    } catch (err) {
      console.error("Assessment generation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate assessment."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SELECT ANSWER
  // =====================================================

  const selectAnswer = (
    questionId: string,
    answer: string
  ) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));

    setError("");
  };

  // =====================================================
  // SUBMIT ASSESSMENT
  // =====================================================

  const submitAssessment = async () => {
    if (!selectedRoadmap) {
      setError("Please select a roadmap first.");
      return;
    }

    if (questions.length === 0) {
      setError("No assessment questions available.");
      return;
    }

    if (Object.keys(answers).length < questions.length) {
      setError(
        "Please answer all questions before submitting."
      );
      return;
    }

    setEvaluating(true);
    setError("");

    try {
      const assessmentResult =
        await evaluateSkillAssessment(
          selectedRoadmap,
          questions,
          answers
        );

      setResult(assessmentResult);

      saveAssessmentResult(
        selectedRoadmapId,
        assessmentResult
      );
    } catch (err) {
      console.error("Assessment evaluation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to evaluate assessment."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // =====================================================
  // GO TO PERSONALIZED PLAN
  // =====================================================

  const goToPersonalizedPlan = () => {
    if (!selectedRoadmapId) {
      setError("Please select a roadmap first.");
      return;
    }

    localStorage.setItem(
      SELECTED_ROADMAP_KEY,
      selectedRoadmapId
    );

    navigate("/personalized-learning");
  };

  // =====================================================
  // RESET / RETAKE
  // =====================================================

  const resetAssessment = () => {
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError("");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="max-w-5xl mx-auto">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white mb-5 transition"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-4xl font-bold">
            🧠 AI Skill Assessment
          </h1>

          <p className="text-slate-400 mt-2">
            Test your current knowledge and let NovaPath
            determine the best starting point for your roadmap.
          </p>
        </div>

        {/* =================================================
            ROADMAP SELECTION
        ================================================= */}

        {!questions.length && !result && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-semibold mb-4">
              Select a Roadmap
            </h2>

            {roadmaps.length === 0 ? (
              <div>
                <p className="text-slate-400 mb-5">
                  You don't have any roadmaps yet.
                </p>

                <button
                  onClick={() => navigate("/add-roadmap")}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  + Add Roadmap
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedRoadmapId}
                  onChange={(e) => {
                    setSelectedRoadmapId(e.target.value);
                    setQuestions([]);
                    setAnswers({});
                    setResult(null);
                    setError("");
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500"
                >
                  {roadmaps.map((roadmap) => (
                    <option
                      key={roadmap.id}
                      value={roadmap.id}
                    >
                      {roadmap.roadmap}
                    </option>
                  ))}
                </select>

                {/* SELECTED ROADMAP INFO */}

                {selectedRoadmap && (
                  <div className="mt-5 p-4 bg-slate-800/60 rounded-xl">

                    <p className="text-sm text-slate-400">
                      Selected Roadmap
                    </p>

                    <p className="text-lg font-semibold mt-1">
                      {selectedRoadmap.roadmap}
                    </p>

                    {Array.isArray(
                      selectedRoadmap.topics
                    ) && (
                      <p className="text-sm text-slate-400 mt-2">
                        {selectedRoadmap.topics.length} topics
                        available for assessment
                      </p>
                    )}

                  </div>
                )}

                {/* START BUTTON */}

                <button
                  onClick={startAssessment}
                  disabled={loading}
                  className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
                >
                  {loading
                    ? "🤖 Generating AI Assessment..."
                    : "🚀 Start Skill Assessment"}
                </button>
              </>
            )}
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
            {error}
          </div>
        )}

        {/* =================================================
            QUESTIONS
        ================================================= */}

        {questions.length > 0 && !result && (
          <div className="space-y-6">

            {/* ASSESSMENT HEADER */}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">

                <div>
                  <h2 className="text-xl font-semibold">
                    Skill Assessment
                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    {Object.keys(answers).length} /{" "}
                    {questions.length} answered
                  </p>
                </div>

                <span className="text-sm text-slate-400">
                  {selectedRoadmap?.roadmap}
                </span>

              </div>
            </div>

            {/* QUESTIONS */}

            {questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
              >

                {/* QUESTION */}

                <div className="flex gap-3 mb-5">

                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>

                  <div className="flex-1">

                    <p className="font-semibold text-lg">
                      {question.question}
                    </p>

                    {question.topicTitle && (
                      <p className="text-xs text-slate-500 mt-1">
                        Topic: {question.topicTitle}
                      </p>
                    )}

                  </div>

                </div>

                {/* OPTIONS */}

                <div className="space-y-3">

                  {Array.isArray(question.options) &&
                    question.options.map((option) => {

                      const selected =
                        answers[question.id] === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            selectAnswer(
                              question.id,
                              option
                            )
                          }
                          className={`w-full text-left p-4 rounded-xl border transition ${
                            selected
                              ? "border-indigo-500 bg-indigo-500/10"
                              : "border-slate-700 bg-slate-800 hover:border-slate-600"
                          }`}
                        >

                          <div className="flex items-center gap-3">

                            <div
                              className={`w-4 h-4 rounded-full border ${
                                selected
                                  ? "border-indigo-400 bg-indigo-500"
                                  : "border-slate-500"
                              }`}
                            />

                            <span>
                              {option}
                            </span>

                          </div>

                        </button>
                      );
                    })}

                </div>
              </div>
            ))}

            {/* SUBMIT */}

            <button
              onClick={submitAssessment}
              disabled={evaluating}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition"
            >
              {evaluating
                ? "🧠 AI Evaluating Your Skills..."
                : "✅ Submit Assessment"}
            </button>

          </div>
        )}

        {/* =================================================
            RESULT
        ================================================= */}

        {result && (
          <div className="space-y-6">

            {/* MAIN RESULT */}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">

              <p className="text-slate-400">
                Your assessed skill level
              </p>

              <h2 className="text-5xl font-bold mt-3">
                {result.skillLevel}
              </h2>

              <p className="text-2xl mt-3">
                Score: {result.score}%
              </p>

              <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
                {result.summary}
              </p>

            </div>

            {/* STRENGTHS + WEAKNESSES */}

            <div className="grid md:grid-cols-2 gap-6">

              {/* STRENGTHS */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <h3 className="text-xl font-semibold mb-4">
                  💪 Strengths
                </h3>

                <div className="space-y-3">

                  {Array.isArray(result.strengths) &&
                  result.strengths.length > 0 ? (
                    result.strengths.map(
                      (strength, index) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-800 rounded-lg"
                        >
                          {strength}
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-slate-400">
                      No specific strengths identified.
                    </p>
                  )}

                </div>
              </div>

              {/* WEAKNESSES */}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

                <h3 className="text-xl font-semibold mb-4">
                  🎯 Areas to Improve
                </h3>

                <div className="space-y-3">

                  {Array.isArray(result.weaknesses) &&
                  result.weaknesses.length > 0 ? (
                    result.weaknesses.map(
                      (weakness, index) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-800 rounded-lg"
                        >
                          {weakness}
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-slate-400">
                      No major weaknesses identified.
                    </p>
                  )}

                </div>
              </div>

            </div>

            {/* RECOMMENDED START */}

            <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6">

              <p className="text-slate-400 text-sm">
                Recommended starting point
              </p>

              <h3 className="text-2xl font-semibold mt-2">
                {result.recommendedStartTopicTitle}
              </h3>

              <p className="text-slate-400 mt-2">
                NovaPath will use this assessment when
                generating your personalized learning plan.
              </p>

            </div>

            {/* ACTION BUTTONS */}

            <div className="flex flex-col sm:flex-row gap-4">

              <button
                onClick={goToPersonalizedPlan}
                className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition"
              >
                🎯 Generate Personalized Plan
              </button>

              <button
                onClick={resetAssessment}
                className="flex-1 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition"
              >
                🔄 Retake Assessment
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default SkillAssessment;