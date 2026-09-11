const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

// =====================================================
// COMMON TYPES
// =====================================================

export type RoadmapTopic = {
  id: string;
  title: string;
  description?: string;
  day?: number;
  tasks?: string[];
  estimatedHours?: number;
  expectedOutcome?: string;
};

export type Roadmap = {
  id: string;
  roadmap: string;
  topics?: RoadmapTopic[];
  source?: string;
  hours?: number;
  fileName?: string;
  progress?: number;
  currentDay?: number;
  completedTopics?: string[];
};

// =====================================================
// SKILL LEVEL
// =====================================================

export type SkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | string;

// =====================================================
// LEARNING PLAN TYPES
// =====================================================

export type LearningResource = {
  title: string;
  url: string;
  type:
    | "video"
    | "article"
    | "documentation"
    | string;
};

export type LearningTask = {
  id: string;
  topicId: string;
  topicTitle?: string;
  title: string;
  description?: string;
  estimatedMinutes: number;

  type:
    | "learning"
    | "practice"
    | "revision"
    | "project"
    | string;

  resources?: LearningResource[];
  practiceExercises?: string[];
  codingTasks?: string[];

  status?:
    | "pending"
    | "completed"
    | string;
};

export type LearningDay = {
  day: number;
  date: string;
  totalMinutes?: number;
  tasks: LearningTask[];
};

// =====================================================
// SKILL ASSESSMENT
// =====================================================

export type SkillAssessmentQuestion = {
  id: string;
  topicId?: string;
  topicTitle?: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
};

export type SkillAssessmentResult = {
  score: number;
  skillLevel: string;
  strengths: string[];
  weaknesses: string[];
  knownTopicIds: string[];
  recommendedStartTopicId: string;
  recommendedStartTopicTitle: string;
  summary: string;
};

// =====================================================
// TOPIC QUIZ TYPES
// =====================================================

export type TopicQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topicId: string;
  topicTitle: string;
  explanation: string;
};

export type TopicQuiz = {
  id: string;
  roadmapId?: string;
  roadmapTitle: string;
  topicId: string;
  topicTitle: string;
  questions: TopicQuizQuestion[];
};

export type TopicQuizResult = {
  quizId: string;
  topicId: string;
  topicTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;

  strengths?: string[];
  weaknesses?: string[];

  status:
    | "Mastered"
    | "Revise"
    | "Review & Practice";

  message: string;
  completedAt: string;
};

// =====================================================
// DAILY QUIZ TYPES
// =====================================================

export type DailyQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topicId: string;
  topicTitle: string;
  explanation: string;
};

export type DailyQuiz = {
  id: string;
  roadmapId?: string;
  roadmapTitle: string;
  day: number;
  topics: string[];
  questions: DailyQuizQuestion[];
};

export type DailyQuizResult = {
  quizId: string;
  day: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;

  strengths: string[];
  weaknesses: string[];

  status?:
    | "Mastered"
    | "Revise"
    | "Review & Practice"
    | "Needs Review";

  message?: string;
  completedAt: string;
};

// =====================================================
// DAILY QUIZ API RESPONSE TYPES
// =====================================================

export type DailyQuizResponse = {
  success: boolean;
  quiz?: DailyQuiz;
  error?: string;
};

export type DailyQuizEvaluateResponse = {
  success: boolean;
  result?: DailyQuizResult;
  error?: string;
};

// =====================================================
// TOPIC QUIZ API RESPONSE TYPES
// =====================================================

export type TopicQuizResponse = {
  success: boolean;
  quiz?: TopicQuiz;
  error?: string;
};

export type TopicQuizEvaluateResponse = {
  success: boolean;
  result?: TopicQuizResult;
  error?: string;
};

// =====================================================
// PERSONALIZATION
// =====================================================

export type PersonalizationPreferences = {
  learningGoal: string;
  hoursPerDay: number;
  targetDate: string;
  availableDays: string[];
  skillLevel: string;
  knownTopics: string[];
  knownTopicIds?: string[];
  assessmentResult?: SkillAssessmentResult | null;
  topicQuizResults?: TopicQuizResult[];
};

export type PersonalizationResponse = {
  success: boolean;

  plan?: LearningDay[];
  days?: LearningDay[];

  learningGoal?: string;
  hoursPerDay?: number;
  targetDate?: string;
  availableDays?: string[];
  skillLevel?: string;
  knownTopicIds?: string[];

  assessmentResult?: SkillAssessmentResult | null;
  topicQuizResults?: TopicQuizResult[];

  generatedAt?: string;
  message?: string;
  error?: string;
};

// =====================================================
// GENERIC REQUEST HELPER
// =====================================================

const AUTH_STORAGE_KEY = "novapath_auth";

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;

  // ---------------------------------------------------
  // CONNECT TO BACKEND
  // ---------------------------------------------------

  const token = getStoredToken();

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options?.headers || {}),
        },
        ...options,
      }
    );
  } catch {
    throw new Error(
      "Unable to connect to the NovaPath backend. Make sure the backend server is running."
    );
  }

  // ---------------------------------------------------
  // READ RESPONSE
  // ---------------------------------------------------

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }

  // ---------------------------------------------------
  // HANDLE ERRORS
  // ---------------------------------------------------

  if (!response.ok) {
    const errorMessage =
      typeof data?.error === "string"
        ? data.error
        : "";

    /*
     * Gemini quota / rate-limit error.
     *
     * Gemini normally returns:
     *
     * 429 RESOURCE_EXHAUSTED
     *
     * But the current backend may convert
     * it into HTTP 500 while keeping the
     * Gemini error message.
     */

    const isQuotaError =
      response.status === 429 ||
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("Quota exceeded") ||
      errorMessage.includes("free_tier") ||
      errorMessage.includes("rate limit");

    if (isQuotaError) {
      throw new Error(
        "The AI quota for NovaPath has been reached. Daily Quiz generation is temporarily unavailable. Please try again later."
      );
    }

    /*
     * Handle common server errors.
     */

    if (response.status === 500) {
      throw new Error(
        errorMessage ||
          "The NovaPath server encountered an error. Please try again."
      );
    }

    if (response.status === 404) {
      throw new Error(
        errorMessage ||
          "The requested NovaPath API endpoint was not found."
      );
    }

    if (response.status === 400) {
      throw new Error(
        errorMessage ||
          "The request sent to the NovaPath server was invalid."
      );
    }

    /*
     * Generic error.
     */

    throw new Error(
      errorMessage ||
        `Request failed with status ${response.status}.`
    );
  }

  // ---------------------------------------------------
  // SUCCESS
  // ---------------------------------------------------

  return data as T;
}

// =====================================================
// ROADMAP
// =====================================================

export async function generateRoadmap(
  careerGoal: string,
  skillLevel: string,
  hoursPerDay: number
): Promise<{
  success: boolean;
  roadmap: string;
  topics: RoadmapTopic[];
  error?: string;
}> {
  return request(
    "/api/generate-roadmap",
    {
      method: "POST",

      body: JSON.stringify({
        careerGoal,
        skillLevel,
        hoursPerDay,
      }),
    }
  );
}

// =====================================================
// IMAGE ROADMAP
// =====================================================

export async function analyzeRoadmapImage(
  image: string,
  mimeType: string,
  hoursPerDay: number
): Promise<{
  success: boolean;
  roadmap: string;
  topics: RoadmapTopic[];
  error?: string;
}> {
  return request(
    "/api/analyze-roadmap-image",
    {
      method: "POST",

      body: JSON.stringify({
        image,
        mimeType,
        hoursPerDay,
      }),
    }
  );
}

// =====================================================
// SKILL ASSESSMENT - GENERATE
// =====================================================

export async function generateSkillAssessment(
  roadmap: Roadmap,
  skillLevel: string = "Beginner"
): Promise<SkillAssessmentQuestion[]> {
  const response =
    await request<{
      success: boolean;

      assessment?: {
        questions?: SkillAssessmentQuestion[];
      };

      error?: string;
    }>(
      "/api/skill-assessment",
      {
        method: "POST",

        body: JSON.stringify({
          roadmap,
          skillLevel,
        }),
      }
    );

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to generate skill assessment."
    );
  }

  return (
    response.assessment?.questions ||
    []
  );
}

// =====================================================
// SKILL ASSESSMENT - EVALUATE
// =====================================================

export async function evaluateSkillAssessment(
  roadmap: Roadmap,
  questionsOrSkillLevel:
    | SkillAssessmentQuestion[]
    | string,
  answers: Record<string, string>
): Promise<SkillAssessmentResult> {
  let skillLevel = "Beginner";

  let questions:
    | SkillAssessmentQuestion[]
    | undefined;

  if (Array.isArray(questionsOrSkillLevel)) {
    questions = questionsOrSkillLevel;
  } else {
    skillLevel = questionsOrSkillLevel;
  }

  const response =
    await request<{
      success: boolean;
      result?: SkillAssessmentResult;
      error?: string;
    }>(
      "/api/skill-assessment",
      {
        method: "POST",

        body: JSON.stringify({
          roadmap,
          skillLevel,
          questions,
          answers,
        }),
      }
    );

  if (!response.success || !response.result) {
    throw new Error(
      response.error ||
        "Failed to evaluate skill assessment."
    );
  }

  return response.result;
}

// =====================================================
// ASSESSMENT RESULT STORAGE
// =====================================================

const ASSESSMENT_RESULTS_KEY =
  "novapath_assessment_results";

export function getAssessmentResults(): Record<
  string,
  SkillAssessmentResult
> {
  try {
    const raw =
      localStorage.getItem(
        ASSESSMENT_RESULTS_KEY
      );

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

// =====================================================
// GET ASSESSMENT RESULT
// =====================================================

export function getAssessmentResult(
  roadmapId: string
): SkillAssessmentResult | null {
  const results =
    getAssessmentResults();

  return (
    results[String(roadmapId)] ||
    null
  );
}

// =====================================================
// SAVE ASSESSMENT RESULT
// =====================================================

export function saveAssessmentResult(
  roadmapId: string,
  result: SkillAssessmentResult
): void {
  const results =
    getAssessmentResults();

  results[String(roadmapId)] = result;

  localStorage.setItem(
    ASSESSMENT_RESULTS_KEY,
    JSON.stringify(results)
  );
}

// =====================================================
// PERSONALIZED LEARNING PLAN
// =====================================================

export async function generateLearningPlan(
  roadmap: Roadmap,
  preferences: PersonalizationPreferences
): Promise<PersonalizationResponse> {
  const response =
    await request<{
      success: boolean;

      plan?: {
        days?: LearningDay[];

        learningGoal?: string;
        hoursPerDay?: number;
        targetDate?: string;
        availableDays?: string[];
        skillLevel?: string;
        knownTopicIds?: string[];

        assessmentResult?:
          | SkillAssessmentResult
          | null;

        topicQuizResults?:
          | TopicQuizResult[];

        generatedAt?: string;
      };

      error?: string;
    }>(
      "/api/generate-learning-plan",
      {
        method: "POST",

        body: JSON.stringify({
          roadmap,
          preferences,
        }),
      }
    );

  const days =
    response.plan?.days || [];

  return {
    success: response.success,

    plan: days,
    days,

    learningGoal:
      response.plan?.learningGoal,

    hoursPerDay:
      response.plan?.hoursPerDay,

    targetDate:
      response.plan?.targetDate,

    availableDays:
      response.plan?.availableDays,

    skillLevel:
      response.plan?.skillLevel,

    knownTopicIds:
      response.plan?.knownTopicIds,

    assessmentResult:
      response.plan?.assessmentResult,

    topicQuizResults:
      response.plan?.topicQuizResults,

    generatedAt:
      response.plan?.generatedAt,

    error:
      response.error,
  };
}

// =====================================================
// PERSONALIZATION STORAGE
// =====================================================

const PERSONALIZATION_KEY =
  "novapath_personalization";

export function savePersonalization(
  preferences: PersonalizationPreferences
): void {
  localStorage.setItem(
    PERSONALIZATION_KEY,
    JSON.stringify(preferences)
  );
}

export function getPersonalization():
  | PersonalizationPreferences
  | null {
  try {
    const raw =
      localStorage.getItem(
        PERSONALIZATION_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    return {
      ...parsed,

      knownTopics:
        Array.isArray(
          parsed.knownTopics
        )
          ? parsed.knownTopics
          : [],

      knownTopicIds:
        Array.isArray(
          parsed.knownTopicIds
        )
          ? parsed.knownTopicIds
          : [],

      topicQuizResults:
        Array.isArray(
          parsed.topicQuizResults
        )
          ? parsed.topicQuizResults
          : [],
    };
  } catch {
    return null;
  }
}

// =====================================================
// BACKWARD-COMPATIBLE ALIASES
// =====================================================

export function savePreferences(
  preferences: PersonalizationPreferences
): void {
  savePersonalization(preferences);
}

export function getPreferences():
  | PersonalizationPreferences
  | null {
  return getPersonalization();
}

// =====================================================
// TOPIC QUIZ - GENERATE
// =====================================================

export async function generateTopicQuiz(
  roadmap: Roadmap,
  topic: RoadmapTopic,
  completedTasks: LearningTask[] = []
): Promise<TopicQuiz> {
  const response =
    await request<TopicQuizResponse>(
      "/api/topic-quiz",
      {
        method: "POST",

        body: JSON.stringify({
          roadmap,
          topic,
          completedTasks,
        }),
      }
    );

  if (
    !response.success ||
    !response.quiz
  ) {
    throw new Error(
      response.error ||
        "Failed to generate topic quiz."
    );
  }

  return response.quiz;
}

// =====================================================
// TOPIC QUIZ - EVALUATE
// =====================================================

export async function evaluateTopicQuiz(
  quiz: TopicQuiz,
  answers: Record<string, string>
): Promise<TopicQuizResult> {
  const response =
    await request<TopicQuizEvaluateResponse>(
      "/api/topic-quiz/evaluate",
      {
        method: "POST",

        body: JSON.stringify({
          quiz,
          answers,
        }),
      }
    );

  if (
    !response.success ||
    !response.result
  ) {
    throw new Error(
      response.error ||
        "Failed to evaluate topic quiz."
    );
  }

  return response.result;
}

// =====================================================
// TOPIC QUIZ RESULT STORAGE
// =====================================================

const TOPIC_QUIZ_RESULTS_KEY =
  "novapath_topic_quiz_results";

export function getTopicQuizResults():
  TopicQuizResult[] {
  try {
    const raw =
      localStorage.getItem(
        TOPIC_QUIZ_RESULTS_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

// =====================================================
// SAVE TOPIC QUIZ RESULT
// =====================================================

export function saveTopicQuizResult(
  result: TopicQuizResult
): void {
  const existing =
    getTopicQuizResults();

  /*
   * Keep the latest result for each topic.
   */

  const filtered =
    existing.filter(
      (item) =>
        String(item.topicId) !==
        String(result.topicId)
    );

  filtered.push(result);

  localStorage.setItem(
    TOPIC_QUIZ_RESULTS_KEY,
    JSON.stringify(filtered)
  );

  /*
   * Keep personalization synchronized.
   */

  const preferences =
    getPersonalization();

  if (preferences) {
    preferences.topicQuizResults =
      filtered;

    savePersonalization(
      preferences
    );
  }
}

// =====================================================
// GET RESULT FOR ONE TOPIC
// =====================================================

export function getTopicQuizResult(
  topicId: string
): TopicQuizResult | null {
  const results =
    getTopicQuizResults();

  return (
    results.find(
      (result) =>
        String(result.topicId) ===
        String(topicId)
    ) || null
  );
}

// =====================================================
// DAILY QUIZ - GENERATE
// =====================================================

export async function generateDailyQuiz(
  roadmap: Roadmap,
  day: number,
  completedTasks: LearningTask[]
): Promise<DailyQuizResponse> {
  return request<DailyQuizResponse>(
    "/api/daily-quiz",
    {
      method: "POST",

      body: JSON.stringify({
        roadmap,
        day,
        completedTasks,
      }),
    }
  );
}

// =====================================================
// DAILY QUIZ - EVALUATE
// =====================================================

export async function evaluateDailyQuiz(
  quiz: DailyQuiz,
  answers: Record<string, string>
): Promise<DailyQuizEvaluateResponse> {
  return request<DailyQuizEvaluateResponse>(
    "/api/daily-quiz/evaluate",
    {
      method: "POST",

      body: JSON.stringify({
        quiz,
        answers,
      }),
    }
  );
}

// =====================================================
// DAILY QUIZ RESULT STORAGE
// =====================================================

const DAILY_QUIZ_RESULTS_KEY =
  "novapath_daily_quiz_results";

export function getDailyQuizResults():
  DailyQuizResult[] {
  try {
    const raw =
      localStorage.getItem(
        DAILY_QUIZ_RESULTS_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

// =====================================================
// SAVE DAILY QUIZ RESULT
// =====================================================

export function saveDailyQuizResult(
  result: DailyQuizResult
): void {
  const existing =
    getDailyQuizResults();

  const filtered =
    existing.filter(
      (item) =>
        item.quizId !==
        result.quizId
    );

  filtered.push(result);

  localStorage.setItem(
    DAILY_QUIZ_RESULTS_KEY,
    JSON.stringify(filtered)
  );
}

// =====================================================
// HEALTH CHECK
// =====================================================

export async function checkBackend(): Promise<boolean> {
  try {
    const response =
      await fetch(API_BASE_URL);

    return response.ok;
  } catch {
    return false;
  }
}

// =====================================================
// AUTH TYPES
// =====================================================

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  careerGoal?: string;
  skillLevel?: string;
  createdAt: string;
};

export type AuthResponse = {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
};

export async function signupRequest(
  name: string,
  email: string,
  password: string,
  careerGoal?: string,
  skillLevel?: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, careerGoal, skillLevel }),
  });

  if (!response.success || !response.token || !response.user) {
    throw new Error(response.error || "Failed to create account.");
  }

  return { token: response.token, user: response.user };
}

export type LoginPortal = "student" | "admin";

export async function loginRequest(
  email: string,
  password: string,
  portal: LoginPortal = "student"
): Promise<{ token: string; user: AuthUser }> {
  const response = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, portal }),
  });

  if (!response.success || !response.token || !response.user) {
    throw new Error(response.error || "Failed to log in.");
  }

  return { token: response.token, user: response.user };
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "Session expired.");
  }

  return data.user as AuthUser;
}

export async function updateProfileRequest(patch: {
  name?: string;
  careerGoal?: string;
  skillLevel?: string;
}): Promise<AuthUser> {
  const response = await request<{
    success: boolean;
    user?: AuthUser;
    error?: string;
  }>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  if (!response.success || !response.user) {
    throw new Error(response.error || "Failed to update profile.");
  }

  return response.user;
}

// =====================================================
// AI MENTOR CHAT
// =====================================================

export type MentorMessage = { role: "user" | "mentor"; content: string };

export async function sendMentorMessage(
  roadmapTitle: string,
  history: MentorMessage[],
  question: string
): Promise<string> {
  const response = await request<{
    success: boolean;
    answer?: string;
    error?: string;
  }>("/api/mentor-chat", {
    method: "POST",
    body: JSON.stringify({ roadmapTitle, history, question }),
  });

  if (!response.success || !response.answer) {
    throw new Error(response.error || "The AI mentor could not respond.");
  }

  return response.answer;
}

// =====================================================
// AI CAREER GUIDANCE
// =====================================================

export type CareerGuidance = {
  skillGapSummary: string;
  prioritySkills: string[];
  recommendedProjects: string[];
  certifications: string[];
  interviewPrepTopics: string[];
  nextSteps: string[];
};

export async function getCareerGuidance(input: {
  careerGoal: string;
  roadmapTitle?: string;
  skillLevel?: string;
  topicQuizResults?: TopicQuizResult[];
  assessmentResult?: SkillAssessmentResult | null;
}): Promise<CareerGuidance> {
  const response = await request<{
    success: boolean;
    guidance?: CareerGuidance;
    error?: string;
  }>("/api/career-guidance", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.success || !response.guidance) {
    throw new Error(response.error || "Failed to generate career guidance.");
  }

  return response.guidance;
}

// =====================================================
// ADMIN
// =====================================================

export type AdminStats = {
  roadmapsGenerated: number;
  learningPlansGenerated: number;
  topicQuizzesGenerated: number;
  dailyQuizzesGenerated: number;
  mentorMessages: number;
  careerGuidanceRuns: number;
  totalUsers: number;
  totalAdmins: number;
};

export async function fetchAdminUsers(): Promise<AuthUser[]> {
  const response = await request<{
    success: boolean;
    users?: AuthUser[];
    error?: string;
  }>("/api/admin/users");

  if (!response.success || !response.users) {
    throw new Error(response.error || "Failed to load users.");
  }

  return response.users;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await request<{
    success: boolean;
    stats?: AdminStats;
    error?: string;
  }>("/api/admin/stats");

  if (!response.success || !response.stats) {
    throw new Error(response.error || "Failed to load platform stats.");
  }

  return response.stats;
}

export async function updateUserRole(
  userId: string,
  role: "admin" | "student"
): Promise<AuthUser> {
  const response = await request<{
    success: boolean;
    user?: AuthUser;
    error?: string;
  }>(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });

  if (!response.success || !response.user) {
    throw new Error(response.error || "Failed to update user role.");
  }

  return response.user;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const response = await request<{ success: boolean; error?: string }>(
    `/api/admin/users/${userId}`,
    { method: "DELETE" }
  );

  if (!response.success) {
    throw new Error(response.error || "Failed to delete user.");
  }
}
