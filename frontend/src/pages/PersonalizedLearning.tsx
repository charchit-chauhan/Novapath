import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  generateLearningPlan,
  getPreferences,
  savePreferences,
} from "../api/client";

import type {
  LearningDay,
  LearningTask,
  PersonalizationPreferences,
  Roadmap,
  TopicQuizResult,
} from "../api/client";

// =====================================================
// STORAGE KEYS
// =====================================================

const DAILY_QUIZ_CONTEXT_KEY =
  "novapath_daily_quiz_context";

const TOPIC_QUIZ_CONTEXT_KEY =
  "novapath_topic_quiz_context";

const ROADMAPS_KEY =
  "novapath_roadmaps";

const SELECTED_ROADMAP_KEY =
  "novapath_selected_roadmap";

// Roadmap-specific storage
const PLANS_KEY =
  "novapath_learning_plans_by_roadmap";

const COMPLETED_TASKS_KEY =
  "novapath_completed_tasks_by_roadmap";

const MISSED_TASKS_KEY =
  "novapath_missed_tasks_by_roadmap";

const COMPLETED_TOPICS_KEY =
  "novapath_completed_topics_by_roadmap";

const CURRENT_DAY_KEY =
  "novapath_current_learning_day_by_roadmap";

const COMPLETED_DAYS_KEY =
  "novapath_completed_days_by_roadmap";

const TOPIC_COMPLETION_HISTORY_KEY =
  "novapath_topic_completion_history_by_roadmap";

// =====================================================
// COMPONENT
// =====================================================

function PersonalizedLearning() {
  const navigate = useNavigate();

  // ===================================================
  // STATE
  // ===================================================

  const [roadmaps, setRoadmaps] =
    useState<Roadmap[]>([]);

  const [selectedRoadmapId, setSelectedRoadmapId] =
    useState("");

  const [learningGoal, setLearningGoal] =
    useState("");

  const [hoursPerDay, setHoursPerDay] =
    useState(2);

  const [targetDate, setTargetDate] =
    useState("");

  const [availableDays, setAvailableDays] =
    useState<string[]>([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]);

  const [skillLevel, setSkillLevel] =
    useState("Beginner");

  const [knownTopics, setKnownTopics] =
    useState("");

  const [plan, setPlan] =
    useState<LearningDay[]>([]);

  const [completedTasks, setCompletedTasks] =
    useState<Record<string, boolean>>({});

  const [missedTasks, setMissedTasks] =
    useState<Record<string, boolean>>({});

  const [completedTopics, setCompletedTopics] =
    useState<Record<string, boolean>>({});

  const [topicQuizResults, setTopicQuizResults] =
    useState<TopicQuizResult[]>([]);

  const [currentDayNumber, setCurrentDayNumber] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===================================================
  // SELECTED ROADMAP
  // ===================================================

  const selectedRoadmap = useMemo(() => {
    return roadmaps.find(
      (roadmap) =>
        roadmap.id === selectedRoadmapId
    );
  }, [
    roadmaps,
    selectedRoadmapId,
  ]);

  // ===================================================
  // ROADMAP STORAGE HELPERS
  // ===================================================

  function readRoadmapMap<T>(
    key: string
  ): Record<string, T> {
    try {
      const raw =
        localStorage.getItem(key);

      if (!raw) {
        return {};
      }

      const parsed =
        JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }

      return {};
    } catch {
      return {};
    }
  }

  function getRoadmapValue<T>(
    key: string,
    roadmapId: string,
    fallback: T
  ): T {
    const map =
      readRoadmapMap<T>(key);

    return (
      map[roadmapId] ??
      fallback
    );
  }

  function saveRoadmapValue<T>(
    key: string,
    roadmapId: string,
    value: T
  ) {
    const map =
      readRoadmapMap<T>(key);

    map[roadmapId] =
      value;

    localStorage.setItem(
      key,
      JSON.stringify(map)
    );
  }

  // ===================================================
  // PLAN HELPERS
  // ===================================================

  function getPlan(
    roadmapId: string
  ): LearningDay[] {
    return getRoadmapValue(
      PLANS_KEY,
      roadmapId,
      []
    );
  }

  function savePlan(
    roadmapId: string,
    learningPlan: LearningDay[]
  ) {
    saveRoadmapValue(
      PLANS_KEY,
      roadmapId,
      learningPlan
    );
  }

  // ===================================================
  // TASK HELPERS
  // ===================================================

  function getCompletedTasks(
    roadmapId: string
  ): Record<string, boolean> {
    return getRoadmapValue(
      COMPLETED_TASKS_KEY,
      roadmapId,
      {}
    );
  }

  function getMissedTasks(
    roadmapId: string
  ): Record<string, boolean> {
    return getRoadmapValue(
      MISSED_TASKS_KEY,
      roadmapId,
      {}
    );
  }

  // ===================================================
  // TOPIC HELPERS
  // ===================================================

  function getCompletedTopics(
    roadmapId: string
  ): Record<string, boolean> {
    return getRoadmapValue(
      COMPLETED_TOPICS_KEY,
      roadmapId,
      {}
    );
  }

  // ===================================================
  // DAY HELPERS
  // ===================================================

  function getCompletedDays(
    roadmapId: string
  ): number[] {
    return getRoadmapValue(
      COMPLETED_DAYS_KEY,
      roadmapId,
      []
    );
  }

  function getStoredCurrentDay(
    roadmapId: string
  ): number | null {
    return getRoadmapValue<number | null>(
      CURRENT_DAY_KEY,
      roadmapId,
      null
    );
  }

  function saveCurrentDay(
    roadmapId: string,
    day: number
  ) {
    saveRoadmapValue(
      CURRENT_DAY_KEY,
      roadmapId,
      day
    );
  }

  function isDayCompleted(
    roadmapId: string,
    day: number
  ): boolean {
    return getCompletedDays(
      roadmapId
    ).includes(day);
  }

  // ===================================================
  // TOPIC QUIZ STATUS
  // ===================================================

  function isTopicQuizCompleted(
    topicId: string
  ): boolean {
    return topicQuizResults.some(
      (result) =>
        result.topicId === topicId
    );
  }

  // ===================================================
  // DETERMINE CURRENT DAY
  // ===================================================

  function determineCurrentDay(
    roadmapId: string,
    learningPlan: LearningDay[],
    completedTaskMap: Record<string, boolean>,
    completedTopicMap: Record<string, boolean>
  ): number | null {
    if (
      learningPlan.length === 0
    ) {
      return null;
    }

    const sortedPlan =
      [...learningPlan].sort(
        (a, b) =>
          a.day - b.day
      );

    const storedDay =
      getStoredCurrentDay(
        roadmapId
      );

    // -----------------------------------------------
    // Existing current day
    // -----------------------------------------------

    if (
      storedDay !== null &&
      sortedPlan.some(
        (day) =>
          day.day === storedDay
      )
    ) {
      let currentDay =
        storedDay;

      while (
        isDayCompleted(
          roadmapId,
          currentDay
        )
      ) {
        const currentIndex =
          sortedPlan.findIndex(
            (day) =>
              day.day === currentDay
          );

        const nextDay =
          sortedPlan[
            currentIndex + 1
          ];

        if (!nextDay) {
          break;
        }

        currentDay =
          nextDay.day;
      }

      saveCurrentDay(
        roadmapId,
        currentDay
      );

      return currentDay;
    }

    // -----------------------------------------------
    // First-time / migration
    // -----------------------------------------------

    let progressDay:
      number | null = null;

    for (const day of sortedPlan) {
      const hasTaskProgress =
        day.tasks.some(
          (task) =>
            completedTaskMap[
              task.id
            ]
        );

      const hasTopicProgress =
        day.tasks.some(
          (task) =>
            completedTopicMap[
              task.topicId
            ]
        );

      if (
        hasTaskProgress ||
        hasTopicProgress
      ) {
        progressDay =
          day.day;
      }
    }

    let currentDay =
      progressDay ??
      sortedPlan[0].day;

    while (
      isDayCompleted(
        roadmapId,
        currentDay
      )
    ) {
      const currentIndex =
        sortedPlan.findIndex(
          (day) =>
            day.day === currentDay
        );

      const nextDay =
        sortedPlan[
          currentIndex + 1
        ];

      if (!nextDay) {
        break;
      }

      currentDay =
        nextDay.day;
    }

    saveCurrentDay(
      roadmapId,
      currentDay
    );

    return currentDay;
  }

  // ===================================================
  // LOAD INITIAL DATA
  // ===================================================

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    try {
      setError("");

      // -----------------------------------------------
      // Load roadmaps
      // -----------------------------------------------

      const roadmapRaw =
        localStorage.getItem(
          ROADMAPS_KEY
        );

      const parsedRoadmaps: Roadmap[] =
        roadmapRaw
          ? JSON.parse(roadmapRaw)
          : [];

      const validRoadmaps =
        Array.isArray(
          parsedRoadmaps
        )
          ? parsedRoadmaps
          : [];

      setRoadmaps(
        validRoadmaps
      );

      // -----------------------------------------------
      // Preferences
      // -----------------------------------------------

      const preferences =
        getPreferences();

      if (preferences) {
        setLearningGoal(
          preferences.learningGoal ||
            ""
        );

        setHoursPerDay(
          Number(
            preferences.hoursPerDay
          ) || 2
        );

        setTargetDate(
          preferences.targetDate ||
            ""
        );

        setAvailableDays(
          Array.isArray(
            preferences.availableDays
          )
            ? preferences.availableDays
            : []
        );

        setSkillLevel(
          preferences.skillLevel ||
            "Beginner"
        );

        setKnownTopics(
          Array.isArray(
            preferences.knownTopics
          )
            ? preferences.knownTopics.join(
                ", "
              )
            : ""
        );
      }

      // -----------------------------------------------
      // Selected roadmap
      // -----------------------------------------------

      const preferredRoadmapId =
        localStorage.getItem(
          SELECTED_ROADMAP_KEY
        );

      const firstRoadmap =
        validRoadmaps.length > 0
          ? validRoadmaps[0]
          : undefined;

      const initialRoadmap =
        validRoadmaps.find(
          (roadmap) =>
            roadmap.id ===
            preferredRoadmapId
        ) ||
        firstRoadmap;

      if (!initialRoadmap) {
        return;
      }

      setSelectedRoadmapId(
        initialRoadmap.id
      );

      // -----------------------------------------------
      // Load THIS roadmap's plan
      // -----------------------------------------------

      const roadmapPlan =
        getPlan(
          initialRoadmap.id
        );

      setPlan(
        roadmapPlan
      );

      // -----------------------------------------------
      // Load THIS roadmap's progress
      // -----------------------------------------------

      const taskMap =
        getCompletedTasks(
          initialRoadmap.id
        );

      const topicMap =
        getCompletedTopics(
          initialRoadmap.id
        );

      const missedMap =
        getMissedTasks(
          initialRoadmap.id
        );

      setCompletedTasks(
        taskMap
      );

      setCompletedTopics(
        topicMap
      );

      setMissedTasks(
        missedMap
      );

      // -----------------------------------------------
      // Current day
      // -----------------------------------------------

      const current =
        determineCurrentDay(
          initialRoadmap.id,
          roadmapPlan,
          taskMap,
          topicMap
        );

      setCurrentDayNumber(
        current
      );

      // -----------------------------------------------
      // Topic quiz results
      // -----------------------------------------------

      if (preferences) {
        const results =
          Array.isArray(
            preferences.topicQuizResults
          )
            ? preferences.topicQuizResults
            : [];

        setTopicQuizResults(
          results
        );
      }
    } catch (err) {
      console.error(
        "Failed to load learning data:",
        err
      );

      setError(
        "Failed to load your learning plan."
      );
    }
  }

  // ===================================================
  // CURRENT DAY
  // ===================================================

  const currentDay =
    useMemo(() => {
      if (
        plan.length === 0 ||
        currentDayNumber === null
      ) {
        return null;
      }

      return (
        plan.find(
          (day) =>
            day.day ===
            currentDayNumber
        ) || null
      );
    }, [
      plan,
      currentDayNumber,
    ]);

  // ===================================================
  // TOPIC GROUPS
  // ===================================================

  const todayTopicGroups =
    useMemo(() => {
      if (!currentDay) {
        return [];
      }

      const groups: {
        topicId: string;
        topicTitle: string;
        tasks: LearningTask[];
      }[] = [];

      currentDay.tasks.forEach(
        (task) => {
          const topicId =
            task.topicId ||
            `topic-${task.id}`;

          const topicTitle =
            task.topicTitle ||
            "Learning Topic";

          const existing =
            groups.find(
              (group) =>
                group.topicId ===
                topicId
            );

          if (existing) {
            existing.tasks.push(
              task
            );
          } else {
            groups.push({
              topicId,
              topicTitle,
              tasks: [task],
            });
          }
        }
      );

      return groups;
    }, [currentDay]);

  // ===================================================
  // TOPIC COMPLETION
  // ===================================================

  function isTopicCompleted(
    topicId: string
  ): boolean {
    return Boolean(
      completedTopics[
        topicId
      ]
    );
  }

  // ===================================================
  // TASK COMPLETION
  // ===================================================

  function toggleTask(
    taskId: string
  ) {
    if (!selectedRoadmap) {
      return;
    }

    const updated = {
      ...completedTasks,
      [taskId]:
        !completedTasks[taskId],
    };

    setCompletedTasks(
      updated
    );

    saveRoadmapValue(
      COMPLETED_TASKS_KEY,
      selectedRoadmap.id,
      updated
    );
  }

  // ===================================================
  // MARK TOPIC COMPLETED
  // ===================================================

  function markTopicCompleted(
    topicId: string,
    topicTitle: string
  ) {
    if (!selectedRoadmap) {
      return;
    }

    const updated = {
      ...completedTopics,
      [topicId]: true,
    };

    setCompletedTopics(
      updated
    );

    saveRoadmapValue(
      COMPLETED_TOPICS_KEY,
      selectedRoadmap.id,
      updated
    );

    // -----------------------------------------------
    // Save roadmap-specific topic history
    // -----------------------------------------------

    try {
      const historyMap =
        readRoadmapMap<
          Array<{
            topicId: string;
            topicTitle: string;
            day: number | undefined;
            completedAt: string;
          }>
        >(
          TOPIC_COMPLETION_HISTORY_KEY
        );

      const history =
        historyMap[
          selectedRoadmap.id
        ] || [];

      history.push({
        topicId,
        topicTitle,
        day:
          currentDay?.day,
        completedAt:
          new Date().toISOString(),
      });

      saveRoadmapValue(
        TOPIC_COMPLETION_HISTORY_KEY,
        selectedRoadmap.id,
        history
      );
    } catch {
      // Ignore history errors
    }
  }

  // ===================================================
  // MARK TASK MISSED
  // ===================================================

  function markTaskMissed(
    taskId: string
  ) {
    if (!selectedRoadmap) {
      return;
    }

    const updated = {
      ...missedTasks,
      [taskId]: true,
    };

    setMissedTasks(
      updated
    );

    saveRoadmapValue(
      MISSED_TASKS_KEY,
      selectedRoadmap.id,
      updated
    );
  }

  // ===================================================
  // START TOPIC QUIZ
  // ===================================================

  function handleStartTopicQuiz(
    topicId: string,
    topicTitle: string,
    topicTasks: LearningTask[]
  ) {
    if (!selectedRoadmap) {
      setError(
        "Please select a roadmap first."
      );
      return;
    }

    if (
      !isTopicCompleted(
        topicId
      )
    ) {
      setError(
        "Complete the topic first before taking its quiz."
      );
      return;
    }

    localStorage.setItem(
      TOPIC_QUIZ_CONTEXT_KEY,
      JSON.stringify({
        roadmapId:
          selectedRoadmap.id,
        roadmapTitle:
          selectedRoadmap.roadmap,
        day:
          currentDay?.day,
        topicId,
        topicTitle,
        completedTasks:
          topicTasks,
      })
    );

    navigate(
      "/topic-quiz"
    );
  }

  // ===================================================
  // DAILY QUIZ STATUS
  // ===================================================

  const allTodayTopicsCompleted =
    todayTopicGroups.length > 0 &&
    todayTopicGroups.every(
      (topic) =>
        isTopicCompleted(
          topic.topicId
        ) &&
        isTopicQuizCompleted(
          topic.topicId
        )
    );

  // ===================================================
  // START DAILY QUIZ
  // ===================================================

  function handleStartDailyQuiz() {
    if (
      !selectedRoadmap ||
      !currentDay
    ) {
      return;
    }

    if (
      !allTodayTopicsCompleted
    ) {
      setError(
        "Complete every topic and its Topic Quiz before taking the Daily Quiz."
      );
      return;
    }

    const completedTodayTasks =
      currentDay.tasks.filter(
        (task) =>
          isTopicCompleted(
            task.topicId
          ) &&
          isTopicQuizCompleted(
            task.topicId
          )
      );

    localStorage.setItem(
      DAILY_QUIZ_CONTEXT_KEY,
      JSON.stringify({
        roadmapId:
          selectedRoadmap.id,
        roadmapTitle:
          selectedRoadmap.roadmap,
        day:
          currentDay.day,
        completedTasks:
          completedTodayTasks,
      })
    );

    navigate(
      "/daily-quiz"
    );
  }

  // ===================================================
  // GENERATE LEARNING PLAN
  // ===================================================

  async function handleGeneratePlan() {
    if (!selectedRoadmap) {
      setError(
        "Please select a roadmap."
      );
      return;
    }

    if (
      !learningGoal.trim()
    ) {
      setError(
        "Please enter your learning goal."
      );
      return;
    }

    if (!targetDate) {
      setError(
        "Please select a target completion date."
      );
      return;
    }

    if (
      availableDays.length === 0
    ) {
      setError(
        "Please select at least one study day."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const preferences:
        PersonalizationPreferences = {
        learningGoal:
          learningGoal.trim(),

        hoursPerDay:
          Number(hoursPerDay),

        targetDate,

        availableDays,

        skillLevel,

        knownTopics:
          knownTopics
            .split(",")
            .map(
              (topic) =>
                topic.trim()
            )
            .filter(Boolean),

        knownTopicIds: [],
      };

      const response =
        await generateLearningPlan(
          selectedRoadmap,
          preferences
        );

      const generatedPlan =
        response.plan ||
        response.days ||
        [];

      if (
        generatedPlan.length === 0
      ) {
        throw new Error(
          "The AI did not return a learning plan."
        );
      }

      // -----------------------------------------------
      // Save preferences
      // -----------------------------------------------

      savePreferences(
        preferences
      );

      // -----------------------------------------------
      // Reset ONLY THIS ROADMAP'S progress
      // -----------------------------------------------

      setCompletedTasks({});
      setMissedTasks({});
      setCompletedTopics({});
      setTopicQuizResults([]);

      saveRoadmapValue(
        COMPLETED_TASKS_KEY,
        selectedRoadmap.id,
        {}
      );

      saveRoadmapValue(
        MISSED_TASKS_KEY,
        selectedRoadmap.id,
        {}
      );

      saveRoadmapValue(
        COMPLETED_TOPICS_KEY,
        selectedRoadmap.id,
        {}
      );

      saveRoadmapValue(
        COMPLETED_DAYS_KEY,
        selectedRoadmap.id,
        []
      );

      // -----------------------------------------------
      // Save ONLY THIS ROADMAP'S PLAN
      // -----------------------------------------------

      setPlan(
        generatedPlan
      );

      savePlan(
        selectedRoadmap.id,
        generatedPlan
      );

      // -----------------------------------------------
      // Start from Day 1
      // -----------------------------------------------

      const sortedPlan =
        [...generatedPlan].sort(
          (a, b) =>
            a.day - b.day
        );

      const firstDay =
        sortedPlan[0];

      if (firstDay) {
        setCurrentDayNumber(
          firstDay.day
        );

        saveCurrentDay(
          selectedRoadmap.id,
          firstDay.day
        );
      }

      // -----------------------------------------------
      // Save selected roadmap
      // -----------------------------------------------

      localStorage.setItem(
        SELECTED_ROADMAP_KEY,
        selectedRoadmap.id
      );
    } catch (err) {
      console.error(
        "Learning plan generation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate learning plan."
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // ROADMAP CHANGE
  // ===================================================

  function handleRoadmapChange(
    roadmapId: string
  ) {
    setSelectedRoadmapId(
      roadmapId
    );

    localStorage.setItem(
      SELECTED_ROADMAP_KEY,
      roadmapId
    );

    const selected =
      roadmaps.find(
        (roadmap) =>
          roadmap.id ===
          roadmapId
      );

    if (!selected) {
      setPlan([]);
      setCompletedTasks({});
      setCompletedTopics({});
      setMissedTasks({});
      setCurrentDayNumber(null);
      setTopicQuizResults([]);
      return;
    }

    // -----------------------------------------------
    // Load selected roadmap's plan
    // -----------------------------------------------

    const roadmapPlan =
      getPlan(
        selected.id
      );

    setPlan(
      roadmapPlan
    );

    // -----------------------------------------------
    // Load selected roadmap's progress
    // -----------------------------------------------

    const taskMap =
      getCompletedTasks(
        selected.id
      );

    const topicMap =
      getCompletedTopics(
        selected.id
      );

    const missedMap =
      getMissedTasks(
        selected.id
      );

    setCompletedTasks(
      taskMap
    );

    setCompletedTopics(
      topicMap
    );

    setMissedTasks(
      missedMap
    );

    // -----------------------------------------------
    // Current day
    // -----------------------------------------------

    const current =
      determineCurrentDay(
        selected.id,
        roadmapPlan,
        taskMap,
        topicMap
      );

    setCurrentDayNumber(
      current
    );

    // -----------------------------------------------
    // Clear any old quiz context
    // -----------------------------------------------

    localStorage.removeItem(
      DAILY_QUIZ_CONTEXT_KEY
    );

    localStorage.removeItem(
      TOPIC_QUIZ_CONTEXT_KEY
    );
  }

  // ===================================================
  // REFRESH WHEN RETURNING FROM QUIZZES
  // ===================================================

  useEffect(() => {
    function refreshProgress() {
      if (!selectedRoadmap) {
        return;
      }

      const roadmapId =
        selectedRoadmap.id;

      const completedTopicMap =
        getCompletedTopics(
          roadmapId
        );

      const completedTaskMap =
        getCompletedTasks(
          roadmapId
        );

      const missedTaskMap =
        getMissedTasks(
          roadmapId
        );

      const roadmapPlan =
        getPlan(
          roadmapId
        );

      setCompletedTopics(
        completedTopicMap
      );

      setCompletedTasks(
        completedTaskMap
      );

      setMissedTasks(
        missedTaskMap
      );

      setPlan(
        roadmapPlan
      );

      const current =
        determineCurrentDay(
          roadmapId,
          roadmapPlan,
          completedTaskMap,
          completedTopicMap
        );

      setCurrentDayNumber(
        current
      );

      // Topic quiz results
      const preferences =
        getPreferences();

      if (preferences) {
        setTopicQuizResults(
          Array.isArray(
            preferences.topicQuizResults
          )
            ? preferences.topicQuizResults
            : []
        );
      }
    }

    window.addEventListener(
      "focus",
      refreshProgress
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshProgress
      );
    };
  }, [
    selectedRoadmap,
  ]);

  // ===================================================
  // TOGGLE AVAILABLE DAY
  // ===================================================

  function toggleAvailableDay(
    day: string
  ) {
    setAvailableDays(
      (previous) =>
        previous.includes(day)
          ? previous.filter(
              (item) =>
                item !== day
            )
          : [
              ...previous,
              day,
            ]
    );
  }

  // ===================================================
  // PROGRESS
  // ===================================================

  const totalTasks =
    currentDay?.tasks.length ||
    0;

  const completedTaskCount =
    currentDay?.tasks.filter(
      (task) =>
        completedTasks[
          task.id
        ]
    ).length || 0;

  const taskProgress =
    totalTasks > 0
      ? Math.round(
          (completedTaskCount /
            totalTasks) *
            100
        )
      : 0;

  const completedTopicCount =
    todayTopicGroups.filter(
      (topic) =>
        isTopicCompleted(
          topic.topicId
        )
    ).length;

  const topicProgress =
    todayTopicGroups.length > 0
      ? Math.round(
          (completedTopicCount /
            todayTopicGroups.length) *
            100
        )
      : 0;

  const totalDays =
    plan.length;

  const isCurrentDayQuizCompleted =
    selectedRoadmap &&
    currentDay
      ? isDayCompleted(
          selectedRoadmap.id,
          currentDay.day
        )
      : false;

  const sortedPlan =
    [...plan].sort(
      (a, b) =>
        a.day - b.day
    );

  const lastDay =
    sortedPlan[
      sortedPlan.length - 1
    ];

  const isCourseCompleted =
    currentDay &&
    lastDay &&
    totalDays > 0 &&
    currentDay.day ===
      lastDay.day &&
    isCurrentDayQuizCompleted;

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen bg-gray-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              NovaPath 🚀
            </h1>

            <p className="text-sm text-gray-500">
              Personalized Learning
            </p>
          </div>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </button>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start justify-between gap-4">
            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            SETUP
        ================================================= */}

        <section className="bg-white rounded-2xl shadow-sm border p-6 mb-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              AI Personalized Learning Setup
            </h2>

            <p className="text-gray-500 mt-1">
              Tell NovaPath how you want to learn.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">

            {/* Roadmap */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Roadmap
              </label>

              <select
                value={
                  selectedRoadmapId
                }
                onChange={(event) =>
                  handleRoadmapChange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              >
                <option value="">
                  Select roadmap
                </option>

                {roadmaps.map(
                  (roadmap) => (
                    <option
                      key={
                        roadmap.id
                      }
                      value={
                        roadmap.id
                      }
                    >
                      {
                        roadmap.roadmap
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Goal */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Learning Goal
              </label>

              <input
                value={
                  learningGoal
                }
                onChange={(event) =>
                  setLearningGoal(
                    event.target.value
                  )
                }
                placeholder="Example: Become an AI Engineer"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            {/* Hours */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Study Hours Per Day
              </label>

              <input
                type="number"
                min="1"
                max="12"
                value={
                  hoursPerDay
                }
                onChange={(event) =>
                  setHoursPerDay(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            {/* Target date */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Completion Date
              </label>

              <input
                type="date"
                value={
                  targetDate
                }
                onChange={(event) =>
                  setTargetDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

            {/* Skill */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Skill Level
              </label>

              <select
                value={
                  skillLevel
                }
                onChange={(event) =>
                  setSkillLevel(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              >
                <option>
                  Beginner
                </option>

                <option>
                  Intermediate
                </option>

                <option>
                  Advanced
                </option>
              </select>
            </div>

            {/* Known topics */}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Topics You Already Know
              </label>

              <input
                value={
                  knownTopics
                }
                onChange={(event) =>
                  setKnownTopics(
                    event.target.value
                  )
                }
                placeholder="Python, NumPy, Pandas"
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>

          </div>

          {/* Available days */}

          <div className="mt-6">

            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Available Study Days
            </label>

            <div className="flex flex-wrap gap-2">

              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => {

                const active =
                  availableDays.includes(
                    day
                  );

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      toggleAvailableDay(
                        day
                      )
                    }
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}

            </div>
          </div>

          <button
            type="button"
            onClick={
              handleGeneratePlan
            }
            disabled={loading}
            className="mt-6 w-full md:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading
              ? "Generating AI Learning Plan..."
              : "✨ Generate Personalized Plan"}
          </button>

        </section>

        {/* =================================================
            NO PLAN
        ================================================= */}

        {plan.length === 0 && (
          <div className="bg-white rounded-2xl border p-10 text-center">

            <div className="text-5xl mb-4">
              🗺️
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              No Learning Plan Yet
            </h2>

            <p className="text-gray-500 mt-2">
              Configure your learning preferences
              and generate your personalized plan.
            </p>

          </div>
        )}

        {/* =================================================
            CURRENT LEARNING DAY
        ================================================= */}

        {currentDay && (
          <>

            <section className="bg-white rounded-2xl shadow-sm border p-6 mb-8">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                <div>

                  <div className="flex items-center gap-3">

                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                      Day{" "}
                      {
                        currentDay.day
                      }
                    </span>

                    {isCurrentDayQuizCompleted && (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                        ✓ Completed
                      </span>
                    )}

                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mt-3">
                    Your Current Learning Day
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {
                      currentDay.date
                    }
                  </p>

                </div>

                <div className="text-right">

                  <div className="text-sm text-gray-500">
                    Topic Progress
                  </div>

                  <div className="text-2xl font-bold text-indigo-600">
                    {
                      completedTopicCount
                    }
                    /
                    {
                      todayTopicGroups.length
                    }
                  </div>

                </div>

              </div>

              {/* Topic progress */}

              <div className="mt-6">

                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-600">
                    Topics
                  </span>

                  <span className="font-bold text-gray-800">
                    {
                      topicProgress
                    }
                    %
                  </span>
                </div>

                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{
                      width: `${topicProgress}%`,
                    }}
                  />
                </div>

              </div>

              {/* Task progress */}

              <div className="mt-5">

                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-600">
                    Task Progress
                  </span>

                  <span className="font-bold text-gray-800">
                    {
                      completedTaskCount
                    }
                    /
                    {
                      totalTasks
                    }
                  </span>
                </div>

                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${taskProgress}%`,
                    }}
                  />
                </div>

              </div>

            </section>

            {/* =================================================
                TOPICS
            ================================================= */}

            <section className="mb-8">

              <div className="mb-5">

                <h2 className="text-2xl font-bold text-gray-900">
                  Today's Topics
                </h2>

                <p className="text-gray-500 mt-1">
                  Complete each topic individually,
                  then take its Topic Quiz.
                </p>

              </div>

              <div className="space-y-6">

                {todayTopicGroups.map(
                  (
                    topic,
                    topicIndex
                  ) => {

                    const topicCompleted =
                      isTopicCompleted(
                        topic.topicId
                      );

                    const quizCompleted =
                      isTopicQuizCompleted(
                        topic.topicId
                      );

                    return (
                      <div
                        key={
                          topic.topicId
                        }
                        className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                      >

                        {/* Topic header */}

                        <div className="p-6 border-b">

                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                            <div className="flex gap-4">

                              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                {
                                  topicIndex +
                                  1
                                }
                              </div>

                              <div>

                                <h3 className="text-xl font-bold text-gray-900">
                                  {
                                    topic.topicTitle
                                  }
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                  {
                                    topic.tasks.length
                                  }{" "}
                                  learning task
                                  {
                                    topic.tasks
                                      .length !==
                                    1
                                      ? "s"
                                      : ""
                                  }
                                </p>

                              </div>

                            </div>

                            <div>

                              {quizCompleted ? (
                                <span className="inline-flex px-4 py-2 rounded-xl bg-green-100 text-green-700 font-semibold text-sm">
                                  ✓ Topic Quiz Completed
                                </span>
                              ) : topicCompleted ? (
                                <span className="inline-flex px-4 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm">
                                  Topic Completed
                                </span>
                              ) : (
                                <span className="inline-flex px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">
                                  In Progress
                                </span>
                              )}

                            </div>

                          </div>

                        </div>

                        {/* Tasks */}

                        <div className="p-6">

                          <div className="space-y-5">

                            {topic.tasks.map(
                              (task) => (
                                <div
                                  key={
                                    task.id
                                  }
                                  className="border rounded-xl p-5"
                                >

                                  <div className="flex items-start gap-4">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleTask(
                                          task.id
                                        )
                                      }
                                      className={`w-6 h-6 rounded-md border-2 flex-shrink-0 mt-1 ${
                                        completedTasks[
                                          task.id
                                        ]
                                          ? "bg-green-500 border-green-500"
                                          : "border-gray-300"
                                      }`}
                                    >
                                      {completedTasks[
                                        task.id
                                      ] && (
                                        <span className="text-white text-sm">
                                          ✓
                                        </span>
                                      )}
                                    </button>

                                    <div className="flex-1">

                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

                                        <h4 className="font-bold text-gray-900">
                                          {
                                            task.title
                                          }
                                        </h4>

                                        <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 w-fit">
                                          {
                                            task.estimatedMinutes
                                          }{" "}
                                          min
                                        </span>

                                      </div>

                                      {task.description && (
                                        <p className="text-gray-600 mt-2">
                                          {
                                            task.description
                                          }
                                        </p>
                                      )}

                                      {/* Resources */}

                                      {task.resources &&
                                        task.resources.length >
                                          0 && (
                                          <div className="mt-4">

                                            <h5 className="font-semibold text-gray-800 mb-2">
                                              📚 Learning Resources
                                            </h5>

                                            <div className="flex flex-wrap gap-2">

                                              {task.resources.map(
                                                (
                                                  resource,
                                                  index
                                                ) => (
                                                  <button
                                                    key={`${task.id}-resource-${index}`}
                                                    type="button"
                                                    onClick={() =>
                                                      window.open(
                                                        resource.url,
                                                        "_blank",
                                                        "noopener,noreferrer"
                                                      )
                                                    }
                                                    className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition"
                                                  >
                                                    {resource.type ===
                                                    "video"
                                                      ? "▶"
                                                      : "📖"}{" "}
                                                    {
                                                      resource.title
                                                    }
                                                  </button>
                                                )
                                              )}

                                            </div>

                                          </div>
                                        )}

                                      {/* Practice */}

                                      {task.practiceExercises &&
                                        task.practiceExercises.length >
                                          0 && (
                                          <div className="mt-5">

                                            <h5 className="font-semibold text-gray-800 mb-2">
                                              ✏️ Practice Exercises
                                            </h5>

                                            <ul className="space-y-2">

                                              {task.practiceExercises.map(
                                                (
                                                  exercise,
                                                  index
                                                ) => (
                                                  <li
                                                    key={`${task.id}-practice-${index}`}
                                                    className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3"
                                                  >
                                                    {
                                                      index +
                                                      1
                                                    }
                                                    .{" "}
                                                    {
                                                      exercise
                                                    }
                                                  </li>
                                                )
                                              )}

                                            </ul>

                                          </div>
                                        )}

                                      {/* Coding tasks */}

                                      {task.codingTasks &&
                                        task.codingTasks.length >
                                          0 && (
                                          <div className="mt-5">

                                            <h5 className="font-semibold text-gray-800 mb-2">
                                              💻 Coding Tasks
                                            </h5>

                                            <ul className="space-y-2">

                                              {task.codingTasks.map(
                                                (
                                                  codingTask,
                                                  index
                                                ) => (
                                                  <li
                                                    key={`${task.id}-coding-${index}`}
                                                    className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3"
                                                  >
                                                    {
                                                      index +
                                                      1
                                                    }
                                                    .{" "}
                                                    {
                                                      codingTask
                                                    }
                                                  </li>
                                                )
                                              )}

                                            </ul>

                                          </div>
                                        )}

                                      {/* Missed */}

                                      {!completedTasks[
                                        task.id
                                      ] &&
                                        !missedTasks[
                                          task.id
                                        ] && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              markTaskMissed(
                                                task.id
                                              )
                                            }
                                            className="mt-4 text-sm text-red-600 hover:text-red-700"
                                          >
                                            Mark as missed
                                          </button>
                                        )}

                                      {missedTasks[
                                        task.id
                                      ] && (
                                        <div className="mt-4 text-sm text-orange-600 font-medium">
                                          ⚠️ Marked as missed
                                        </div>
                                      )}

                                    </div>

                                  </div>

                                </div>
                              )
                            )}

                          </div>

                          {/* Topic actions */}

                          <div className="mt-6 pt-6 border-t">

                            {!topicCompleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  markTopicCompleted(
                                    topic.topicId,
                                    topic.topicTitle
                                  )
                                }
                                className="w-full md:w-auto px-6 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition"
                              >
                                ✓ I Have Completed This Topic
                              </button>
                            )}

                            {topicCompleted &&
                              !quizCompleted && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartTopicQuiz(
                                      topic.topicId,
                                      topic.topicTitle,
                                      topic.tasks
                                    )
                                  }
                                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
                                >
                                  🧠 Take Topic Quiz
                                </button>
                              )}

                            {quizCompleted && (
                              <div className="flex flex-col md:flex-row md:items-center gap-3">

                                <div className="px-5 py-3 rounded-xl bg-green-50 text-green-700 font-semibold">
                                  ✓ Topic finished successfully
                                </div>

                              </div>
                            )}

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* =================================================
                DAILY QUIZ
            ================================================= */}

            <section className="mb-10">

              {allTodayTopicsCompleted ? (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-7 shadow-lg">

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                    <div>

                      <div className="text-3xl mb-2">
                        🧠
                      </div>

                      <h2 className="text-2xl font-bold">
                        Day{" "}
                        {
                          currentDay.day
                        }{" "}
                        Daily Quiz
                      </h2>

                      <p className="text-indigo-100 mt-1">
                        All today's topics and Topic
                        Quizzes are complete. Test your
                        overall understanding.
                      </p>

                    </div>

                    {isCurrentDayQuizCompleted ? (
                      <div className="px-6 py-3 rounded-xl bg-white/20 font-bold">
                        ✓ Daily Quiz Completed
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleStartDailyQuiz
                        }
                        className="px-7 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition"
                      >
                        🧠 Take Today's Daily Quiz
                      </button>
                    )}

                  </div>

                </div>
              ) : (
                <div className="bg-white border rounded-2xl p-6">

                  <h2 className="text-xl font-bold text-gray-900">
                    🔒 Daily Quiz Locked
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Complete every topic and take
                    each Topic Quiz to unlock today's
                    Daily Quiz.
                  </p>

                  <div className="mt-4 text-sm font-medium text-gray-600">
                    {
                      completedTopicCount
                    }
                    /
                    {
                      todayTopicGroups.length
                    }{" "}
                    topics completed
                  </div>

                </div>
              )}

            </section>

            {/* =================================================
                PROGRESSION MESSAGE
            ================================================= */}

            {!isCurrentDayQuizCompleted &&
              completedTopicCount ===
                todayTopicGroups.length &&
              todayTopicGroups.length > 0 && (
                <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-5">

                  <h3 className="font-bold text-yellow-900">
                    ⚠️ Day{" "}
                    {
                      currentDay.day
                    }{" "}
                    is not finished yet
                  </h3>

                  <p className="text-yellow-800 mt-1">
                    Completing the topics does not
                    move you to the next day. Submit
                    the Daily Quiz to unlock Day{" "}
                    {
                      currentDay.day + 1
                    }.
                  </p>

                </div>
              )}

            {/* =================================================
                FULL LEARNING PLAN
            ================================================= */}

            {plan.length > 0 && (
              <section className="mt-12">

                <div className="mb-5">

                  <h2 className="text-2xl font-bold text-gray-900">
                    Full Learning Plan
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Your progress moves forward only
                    after completing each day's Daily Quiz.
                  </p>

                </div>

                <div className="space-y-4">

                  {sortedPlan.map(
                    (day) => {

                      const dayQuizCompleted =
                        selectedRoadmap
                          ? isDayCompleted(
                              selectedRoadmap.id,
                              day.day
                            )
                          : false;

                      const isActive =
                        day.day ===
                        currentDayNumber;

                      const isLocked =
                        day.day >
                        (
                          currentDayNumber ||
                          1
                        );

                      const topicCount =
                        new Set(
                          day.tasks.map(
                            (task) =>
                              task.topicId
                          )
                        ).size;

                      return (
                        <div
                          key={
                            day.day
                          }
                          className={`bg-white rounded-2xl border p-6 ${
                            isActive
                              ? "border-indigo-400 ring-2 ring-indigo-100"
                              : ""
                          }`}
                        >

                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                            <div>

                              <div className="flex items-center gap-3 flex-wrap">

                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    dayQuizCompleted
                                      ? "bg-green-100 text-green-700"
                                      : isActive
                                      ? "bg-indigo-100 text-indigo-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {dayQuizCompleted
                                    ? "✓ Completed"
                                    : isActive
                                    ? "● Current Day"
                                    : isLocked
                                    ? "🔒 Locked"
                                    : `Day ${day.day}`}
                                </span>

                                <span className="text-sm text-gray-500">
                                  {
                                    day.date
                                  }
                                </span>

                              </div>

                              <h3 className="font-bold text-gray-900 mt-3">
                                Day{" "}
                                {
                                  day.day
                                }
                              </h3>

                              <p className="text-sm text-gray-500 mt-1">
                                {
                                  topicCount
                                }{" "}
                                topic
                                {
                                  topicCount !==
                                  1
                                    ? "s"
                                    : ""
                                }{" "}
                                •{" "}
                                {
                                  day.tasks
                                    .length
                                }{" "}
                                tasks
                              </p>

                            </div>

                            <div>

                              {dayQuizCompleted ? (
                                <span className="text-green-600 font-semibold text-sm">
                                  Daily Quiz completed
                                </span>
                              ) : isActive ? (
                                <span className="text-indigo-600 font-semibold text-sm">
                                  Continue today's learning
                                </span>
                              ) : (
                                <span className="text-gray-400 font-semibold text-sm">
                                  Complete previous Daily Quiz first
                                </span>
                              )}

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </section>
            )}

            {/* =================================================
                COURSE COMPLETE
            ================================================= */}

            {isCourseCompleted && (
              <section className="mt-10 bg-green-50 border border-green-200 rounded-2xl p-8 text-center">

                <div className="text-5xl mb-4">
                  🎉
                </div>

                <h2 className="text-2xl font-bold text-green-800">
                  Learning Plan Completed!
                </h2>

                <p className="text-green-700 mt-2">
                  You successfully completed all
                  learning days and Daily Quizzes.
                </p>

              </section>
            )}

          </>
        )}

      </main>
    </div>
  );
}

export default PersonalizedLearning;