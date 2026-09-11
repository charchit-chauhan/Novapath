import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

import {
  createUser,
  findUserByEmail,
  updateUser,
  deleteUser,
  toPublicUser,
  getUsers,
  getStats,
  bumpStat,
} from "./store";

import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  requireAdmin,
  type AuthedRequest,
} from "./auth";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// =====================================================
// ADMIN ALLOWLIST
// =====================================================
//
// Comma-separated list of emails in .env (ADMIN_EMAILS) that should
// always have admin access. This makes admin access explicit and
// resilient — it no longer depends on being the very first person to
// sign up. If an account with a matching email exists as "student"
// (e.g. it was created before you added it to the allowlist), it gets
// auto-promoted the next time that account signs up or logs in.
// =====================================================

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowlistedAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  })
);

app.use(
  express.json({
    limit: "20mb",
  })
);

// =====================================================
// GEMINI
// =====================================================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "❌ GEMINI_API_KEY is missing from .env"
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

// =====================================================
// HELPER: CLEAN GEMINI JSON
// =====================================================

function cleanGeminiJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// =====================================================
// HELPER: GEMINI WITH RETRY
// =====================================================

async function generateWithRetry(
  contents: any,
  maxRetries = 3
) {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      console.log(
        `🤖 Gemini request attempt ${attempt}/${maxRetries}`
      );

      const response =
        await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents,
        });

      return response;
    } catch (error) {
      lastError = error;

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `❌ Gemini attempt ${attempt} failed:`,
        errorMessage
      );

      const isTemporaryError =
        errorMessage.includes("503") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("429") ||
        errorMessage.includes(
          "RESOURCE_EXHAUSTED"
        );

      if (
        !isTemporaryError ||
        attempt === maxRetries
      ) {
        throw error;
      }

      const waitTime = attempt * 3000;

      console.log(
        `⏳ Gemini temporarily unavailable. Retrying in ${
          waitTime / 1000
        } seconds...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, waitTime)
      );
    }
  }

  throw lastError;
}

// =====================================================
// HELPER: GET AVAILABLE STUDY DATES
// =====================================================

function getStudyDates(
  startDate: Date,
  targetDate: Date,
  availableDays: string[]
): string[] {
  const dates: string[] = [];

  const allowedDays = new Set(
    availableDays.map((day) =>
      day.toLowerCase()
    )
  );

  const current = new Date(startDate);

  current.setHours(0, 0, 0, 0);

  while (current <= targetDate) {
    const dayName = current
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();

    if (allowedDays.has(dayName)) {
      const year = current.getFullYear();

      const month = String(
        current.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        current.getDate()
      ).padStart(2, "0");

      dates.push(
        `${year}-${month}-${day}`
      );
    }

    current.setDate(
      current.getDate() + 1
    );
  }

  return dates;
}

// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message:
      "NovaPath Backend is running 🚀",
  });
});

// =====================================================
// TEXT ROADMAP
// =====================================================

app.post(
  "/api/generate-roadmap",
  async (req, res) => {
    try {
      const {
        careerGoal,
        skillLevel,
        hoursPerDay,
      } = req.body;

      if (
        !careerGoal ||
        !skillLevel ||
        !hoursPerDay
      ) {
        return res.status(400).json({
          success: false,
          error:
            "careerGoal, skillLevel and hoursPerDay are required",
        });
      }

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "GEMINI_API_KEY is missing in backend .env",
        });
      }

      console.log(
        `🤖 Generating roadmap for ${careerGoal}...`
      );

      const prompt = `
You are NovaPath, an AI learning roadmap generator.

Create a personalized learning roadmap.

Career Goal:
${careerGoal}

Skill Level:
${skillLevel}

Available Hours Per Day:
${hoursPerDay}

Return ONLY valid JSON.

Use exactly this structure:

{
  "roadmap": "short description of the roadmap",
  "topics": [
    {
      "id": "topic-1",
      "title": "Python Fundamentals",
      "description": "Learn Python basics required for this career.",
      "day": 1,
      "tasks": [
        "Learn variables",
        "Learn data types",
        "Practice basic programs"
      ],
      "estimatedHours": 2,
      "expectedOutcome": "Understand Python fundamentals."
    }
  ]
}

Create 15 to 30 useful learning topics.

Order topics from beginner to advanced.

Make the roadmap practical.

Do not use markdown.

Do not use code fences.

Return JSON only.
`;

      const response =
        await generateWithRetry(prompt);

      const text =
        response.text || "";

      console.log(
        "🧠 Gemini response received"
      );

      console.log(text);

      if (!text) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned an empty response.",
        });
      }

      let parsed: any;

      try {
        parsed = JSON.parse(
          cleanGeminiJson(text)
        );
      } catch (error) {
        console.error(
          "❌ Failed to parse Gemini JSON:",
          error
        );

        return res.status(500).json({
          success: false,
          error:
            "Gemini returned invalid JSON.",
          rawResponse: text,
        });
      }

      const topics = Array.isArray(
        parsed.topics
      )
        ? parsed.topics
        : [];

      if (topics.length === 0) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini generated no learning topics.",
        });
      }

      return res.json({
        success: true,
        roadmap:
          parsed.roadmap ||
          `Personalized ${careerGoal} roadmap`,
        topics,
      });
    } catch (error) {
      console.error(
        "❌ Gemini text API error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate roadmap.",
      });
    }
  }
);

// =====================================================
// CUSTOM IMAGE ROADMAP
// =====================================================

app.post(
  "/api/analyze-roadmap-image",
  async (req, res) => {
    try {
      const {
        image,
        mimeType,
        hoursPerDay,
      } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error:
            "Roadmap image is required.",
        });
      }

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "GEMINI_API_KEY is missing in backend .env",
        });
      }

      console.log(
        "📷 Roadmap image received"
      );

      console.log(
        "📄 MIME type:",
        mimeType
      );

      console.log(
        "📦 Base64 length:",
        image.length
      );

      const allowedMimeTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ];

      const finalMimeType =
        allowedMimeTypes.includes(
          mimeType
        )
          ? mimeType
          : "image/jpeg";

      const prompt = `
You are NovaPath, an AI system that reads learning roadmap images.

Analyze the uploaded roadmap image carefully.

The image may contain:

- boxes
- arrows
- branches
- categories
- programming languages
- technologies
- tools
- frameworks
- databases
- concepts
- learning stages

Your job is to extract ALL clearly readable learning topics from the image.

IMPORTANT RULES:

1. Read the entire image.
2. Extract as many clearly visible topics as possible.
3. Do not skip readable small boxes.
4. Do not invent unrelated technologies.
5. Do not create duplicate topics.
6. Preserve the logical learning order shown by the roadmap.
7. If there are categories, organize topics logically.
8. Convert every meaningful readable technology/concept into a topic.
9. Keep topic titles short and clear.
10. The user can study approximately ${hoursPerDay} hours per day.

Return ONLY valid JSON.

Use exactly this structure:

{
  "roadmap": "description of the detected roadmap",
  "topics": [
    {
      "id": "custom-topic-1",
      "title": "Python",
      "description": "Learn Python programming fundamentals.",
      "day": 1,
      "tasks": [
        "Learn Python syntax",
        "Practice variables and data types",
        "Solve beginner exercises"
      ],
      "estimatedHours": ${hoursPerDay},
      "expectedOutcome": "Understand Python fundamentals."
    }
  ]
}

Create one topic for every clearly readable learning item.

Do not use markdown.

Do not use code fences.

Return JSON only.
`;

      console.log(
        "🧠 Sending image to Gemini..."
      );

      const response =
        await generateWithRetry([
          {
            inlineData: {
              mimeType:
                finalMimeType,
              data: image,
            },
          },
          {
            text: prompt,
          },
        ]);

      const text =
        response.text || "";

      console.log(
        "🧠 Gemini image response:"
      );

      console.log(text);

      if (!text) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned an empty response while analyzing the image.",
        });
      }

      let parsed: any;

      try {
        parsed = JSON.parse(
          cleanGeminiJson(text)
        );
      } catch (error) {
        console.error(
          "❌ Image JSON parsing failed:",
          error
        );

        return res.status(500).json({
          success: false,
          error:
            "Gemini could read the image, but returned an invalid response. Please try a clearer image.",
          rawResponse: text,
        });
      }

      const topics = Array.isArray(
        parsed.topics
      )
        ? parsed.topics
        : [];

      if (topics.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "No readable learning topics were found in the uploaded image. Please upload a clearer roadmap image.",
        });
      }

      console.log(
        `✅ ${topics.length} topics extracted from image`
      );

      return res.json({
        success: true,

        roadmap:
          parsed.roadmap ||
          "Custom roadmap extracted from uploaded image.",

        topics,
      });
    } catch (error) {
      console.error(
        "❌ Gemini Image API Error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze roadmap image.",
      });
    }
  }
);

// =====================================================
// AI SKILL ASSESSMENT
// =====================================================

app.post(
  "/api/skill-assessment",
  async (req, res) => {
    try {
      const {
        roadmap,
        skillLevel,
        answers,
      } = req.body;

      if (!roadmap) {
        return res.status(400).json({
          success: false,
          error:
            "Roadmap is required.",
        });
      }

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "GEMINI_API_KEY is missing in backend .env",
        });
      }

      const topics = Array.isArray(
        roadmap.topics
      )
        ? roadmap.topics
        : [];

      if (topics.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "The selected roadmap has no topics for assessment.",
        });
      }

      // -------------------------------------------------
      // MODE 1: GENERATE ASSESSMENT
      // -------------------------------------------------

      if (!answers) {
        const assessmentTopics =
          topics.slice(0, 10);

        const prompt = `
You are NovaPath, an AI skill assessment system.

Create an initial skill assessment for the user's selected roadmap.

ROADMAP:
${JSON.stringify(
  assessmentTopics
)}

USER'S SELF-REPORTED SKILL LEVEL:
${skillLevel || "Beginner"}

Create 8 multiple-choice questions.

The questions should test prerequisite knowledge from the roadmap.

Questions should progress from basic to intermediate difficulty.

Do NOT require advanced knowledge that is not represented in the roadmap.

Return ONLY valid JSON.

Use exactly this structure:

{
  "questions": [
    {
      "id": "q1",
      "topicId": "topic-1",
      "question": "What is ...?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ]
    }
  ]
}

Rules:

1. Exactly 8 questions.
2. Each question must have exactly 4 options.
3. Use only roadmap topics.
4. Do not include the correct answer in this response.
5. Do not use markdown.
6. Return JSON only.
`;

        const response =
          await generateWithRetry(prompt);

        const text =
          response.text || "";

        if (!text) {
          return res.status(500).json({
            success: false,
            error:
              "Gemini returned an empty assessment.",
          });
        }

        let parsed: any;

        try {
          parsed = JSON.parse(
            cleanGeminiJson(text)
          );
        } catch {
          return res.status(500).json({
            success: false,
            error:
              "Gemini returned invalid assessment JSON.",
          });
        }

        return res.json({
          success: true,
          assessment: parsed,
        });
      }

      // -------------------------------------------------
      // MODE 2: EVALUATE ASSESSMENT
      // -------------------------------------------------

      const prompt = `
You are NovaPath, an AI skill assessment evaluator.

Evaluate the user's answers against the selected roadmap.

ROADMAP:
${JSON.stringify(topics)}

USER SELF-REPORTED LEVEL:
${skillLevel || "Beginner"}

USER ANSWERS:
${JSON.stringify(answers)}

Determine:

1. Overall skill level.
2. Strengths.
3. Weaknesses.
4. Topics the user already understands.
5. Topics the user should start learning from.
6. Recommended starting topic.
7. Assessment score.

Return ONLY valid JSON.

Use exactly this structure:

{
  "score": 0,
  "skillLevel": "Beginner",
  "strengths": [
    "..."
  ],
  "weaknesses": [
    "..."
  ],
  "knownTopicIds": [
    "topic-1"
  ],
  "recommendedStartTopicId": "topic-3",
  "recommendedStartTopicTitle": "Python Functions",
  "summary": "Short explanation of the assessment result."
}

Rules:

- score must be between 0 and 100.
- knownTopicIds must contain ONLY IDs from the supplied roadmap.
- recommendedStartTopicId must be a supplied roadmap topic ID.
- Do not invent topic IDs.
- Base the result on the user's actual answers.
- Return JSON only.
`;

      const response =
        await generateWithRetry(prompt);

      const text =
        response.text || "";

      if (!text) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned an empty assessment result.",
        });
      }

      let parsed: any;

      try {
        parsed = JSON.parse(
          cleanGeminiJson(text)
        );
      } catch {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned invalid assessment result JSON.",
        });
      }

      const allowedTopicIds =
        new Set(
          topics.map(
            (topic: any) =>
              topic.id
          )
        );

      parsed.knownTopicIds =
        Array.isArray(
          parsed.knownTopicIds
        )
          ? parsed.knownTopicIds.filter(
              (id: string) =>
                allowedTopicIds.has(id)
            )
          : [];

      if (
        !allowedTopicIds.has(
          parsed.recommendedStartTopicId
        )
      ) {
        parsed.recommendedStartTopicId =
          topics[0].id;

        parsed.recommendedStartTopicTitle =
          topics[0].title;
      }

      parsed.score = Math.min(
        100,
        Math.max(
          0,
          Number(parsed.score) || 0
        )
      );

      return res.json({
        success: true,
        result: parsed,
      });
    } catch (error) {
      console.error(
        "❌ Skill assessment error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process skill assessment.",
      });
    }
  }
);

// =====================================================
// PERSONALIZED LEARNING PLAN
// =====================================================

app.post(
  "/api/generate-learning-plan",
  async (req, res) => {
    try {
      const {
        roadmap,
        preferences,
      } = req.body;

      if (!roadmap || !preferences) {
        return res.status(400).json({
          success: false,
          error:
            "roadmap and preferences are required",
        });
      }

      const {
        learningGoal,
        hoursPerDay,
        targetDate,
        availableDays,
        skillLevel,
        knownTopicIds,
        assessmentResult,
        topicQuizResults,
      } = preferences;

      if (
        !learningGoal ||
        !hoursPerDay ||
        !targetDate ||
        !Array.isArray(availableDays) ||
        availableDays.length === 0 ||
        !skillLevel
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Complete personalization preferences are required",
        });
      }

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "GEMINI_API_KEY is missing in backend .env",
        });
      }

      const topics = Array.isArray(
        roadmap.topics
      )
        ? roadmap.topics
        : [];

      if (topics.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "The selected roadmap has no topics.",
        });
      }

      // -------------------------------------------------
      // KNOWN TOPICS
      // -------------------------------------------------

      const knownIds = new Set(
        Array.isArray(knownTopicIds)
          ? knownTopicIds
          : []
      );

      if (
        assessmentResult &&
        Array.isArray(
          assessmentResult.knownTopicIds
        )
      ) {
        assessmentResult.knownTopicIds.forEach(
          (id: string) => {
            knownIds.add(id);
          }
        );
      }

      // -------------------------------------------------
      // TOPIC QUIZ PERFORMANCE
      // -------------------------------------------------

      const quizResults = Array.isArray(
        topicQuizResults
      )
        ? topicQuizResults
        : [];

      const weakQuizTopics =
        quizResults.filter(
          (result: any) =>
            Number(result.percentage) < 80
        );

      const masteredQuizTopics =
        quizResults.filter(
          (result: any) =>
            Number(result.percentage) >= 80
        );

      const remainingTopics =
        topics.filter(
          (topic: any) =>
            !knownIds.has(topic.id)
        );

      if (
        remainingTopics.length === 0
      ) {
        return res.json({
          success: true,
          plan: {
            days: [],
            message:
              "All selected roadmap topics are already known.",
          },
        });
      }

      // -------------------------------------------------
      // TARGET DATE
      // -------------------------------------------------

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const target = new Date(
        `${targetDate}T23:59:59`
      );

      if (
        Number.isNaN(
          target.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid target completion date.",
        });
      }

      if (target < today) {
        return res.status(400).json({
          success: false,
          error:
            "Target completion date must be in the future.",
        });
      }

      const studyDates =
        getStudyDates(
          today,
          target,
          availableDays
        );

      if (studyDates.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "No available study days exist before the target date.",
        });
      }

      console.log(
        `🤖 Creating personalized learning plan for ${learningGoal}...`
      );

      console.log(
        `📅 Available study dates: ${studyDates.length}`
      );

      console.log(
        `🧠 Topic quiz results received: ${quizResults.length}`
      );

      // -------------------------------------------------
      // PERSONALIZED PLAN PROMPT
      // -------------------------------------------------

      const prompt = `
You are NovaPath, an AI personalized learning planner.

Create a practical day-by-day learning plan.

LEARNING GOAL:
${learningGoal}

SKILL LEVEL:
${skillLevel}

AVAILABLE HOURS PER DAY:
${hoursPerDay}

AVAILABLE STUDY DAYS:
${availableDays.join(", ")}

TARGET COMPLETION DATE:
${targetDate}

AVAILABLE STUDY DATES:
${studyDates.join(", ")}

ROADMAP:
${JSON.stringify(roadmap)}

KNOWN TOPIC IDS:
${JSON.stringify(
  Array.from(knownIds)
)}

AI ASSESSMENT:
${JSON.stringify(
  assessmentResult || null
)}

TOPIC QUIZ RESULTS:
${JSON.stringify(
  quizResults
)}

WEAK TOPICS FROM QUIZZES:
${JSON.stringify(
  weakQuizTopics
)}

MASTERED TOPICS FROM QUIZZES:
${JSON.stringify(
  masteredQuizTopics
)}

IMPORTANT RULES:

1. Use ONLY supplied roadmap topics.
2. Never invent roadmap topic IDs.
3. Skip known topics.
4. Use the assessment result to determine the appropriate starting point.
5. Preserve prerequisite order.
6. Assign tasks only to supplied study dates.
7. Never exceed ${Number(hoursPerDay) * 60} minutes per day.
8. Include learning activities.
9. Include practice exercises.
10. Include coding tasks when the topic is suitable.
11. Include useful learning resources.
12. Resources can be videos, articles or documentation.
13. Resources must be relevant to the specific topic.
14. Keep estimated times realistic.
15. Every task must belong to a supplied roadmap topic.
16. Complete the remaining roadmap before the target date if possible.
17. If time is limited, prioritize prerequisites.
18. Use only supplied available dates.
19. Do not create dates outside AVAILABLE STUDY DATES.
20. If a topic quiz shows a weak result, schedule additional revision and practice for that topic.
21. If a topic quiz shows a mastered result, avoid unnecessary repetition and move forward when prerequisites allow.
22. Topic quizzes are handled separately by NovaPath and must NOT be included inside learning resources.
23. Do not label videos, podcasts, articles or documentation as quizzes.
24. Do not create a quiz object inside individual tasks.
25. Return ONLY valid JSON.
26. Do not use markdown or code fences.

Return EXACTLY:

{
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "totalMinutes": 120,
      "tasks": [
        {
          "id": "task-1",
          "topicId": "topic-1",
          "topicTitle": "Python Fundamentals",
          "title": "Learn Python variables",
          "description": "Study variables and data types.",
          "estimatedMinutes": 30,
          "type": "learning",

          "resources": [
            {
              "title": "Python Variables Documentation",
              "url": "https://docs.python.org/",
              "type": "documentation"
            }
          ],

          "practiceExercises": [
            "Create variables for name, age and score.",
            "Convert a string number into an integer."
          ],

          "codingTasks": [
            "Write a program that calculates the average of three numbers."
          ],

          "status": "pending"
        }
      ]
    }
  ]
}

Allowed task types:

"learning"
"practice"
"revision"
"project"

Resource types:

"video"
"article"
"documentation"

IMPORTANT:

- Every task must contain resources.
- Every task should contain practiceExercises when appropriate.
- Coding tasks should be included for programming/technical topics.
- Do not include quiz questions inside tasks.
- Do not call resources quizzes.
- Do not invent unrelated resources.
- Prefer official documentation when appropriate.
`;

      const response =
        await generateWithRetry(prompt);

      const text =
        response.text || "";

      console.log(
        "🧠 Personalized plan response received"
      );

      console.log(text);

      if (!text) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned an empty personalized plan.",
        });
      }

      let parsed: any;

      try {
        parsed = JSON.parse(
          cleanGeminiJson(text)
        );
      } catch (error) {
        console.error(
          "❌ Personalized plan JSON parsing failed:",
          error
        );

        return res.status(500).json({
          success: false,
          error:
            "Gemini returned invalid personalized plan JSON.",
          rawResponse: text,
        });
      }

      if (
        !parsed ||
        !Array.isArray(parsed.days)
      ) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini generated an invalid learning plan.",
        });
      }

      const allowedTopicIds =
        new Set(
          remainingTopics.map(
            (topic: any) =>
              topic.id
          )
        );

      const allowedDates =
        new Set(studyDates);

      const maxMinutes =
        Number(hoursPerDay) * 60;

      // -------------------------------------------------
      // CLEAN PLAN
      // -------------------------------------------------

      const cleanedDays =
        parsed.days
          .map(
            (
              day: any,
              index: number
            ) => {
              if (
                !day ||
                !allowedDates.has(
                  day.date
                ) ||
                !Array.isArray(
                  day.tasks
                )
              ) {
                return null;
              }

              let totalMinutes = 0;

              const tasks =
                day.tasks
                  .filter(
                    (task: any) =>
                      task &&
                      allowedTopicIds.has(
                        task.topicId
                      )
                  )
                  .map(
                    (
                      task: any,
                      taskIndex: number
                    ) => {
                      let minutes =
                        Number(
                          task.estimatedMinutes
                        );

                      if (
                        !Number.isFinite(
                          minutes
                        )
                      ) {
                        minutes = 30;
                      }

                      minutes = Math.min(
                        Math.max(
                          minutes,
                          10
                        ),
                        maxMinutes
                      );

                      if (
                        totalMinutes +
                          minutes >
                        maxMinutes
                      ) {
                        return null;
                      }

                      totalMinutes +=
                        minutes;

                      const resources =
                        Array.isArray(
                          task.resources
                        )
                          ? task.resources
                              .filter(
                                (resource: any) =>
                                  resource &&
                                  typeof resource.title ===
                                    "string"
                              )
                              .slice(0, 5)
                              .map(
                                (
                                  resource: any
                                ) => ({
                                  title:
                                    resource.title,

                                  url:
                                    typeof resource.url ===
                                    "string"
                                      ? resource.url
                                      : "",

                                  type:
                                    resource.type ||
                                    "article",
                                })
                              )
                          : [];

                      const practiceExercises =
                        Array.isArray(
                          task.practiceExercises
                        )
                          ? task.practiceExercises
                              .filter(
                                (
                                  item: any
                                ) =>
                                  typeof item ===
                                  "string"
                              )
                              .slice(0, 5)
                          : [];

                      const codingTasks =
                        Array.isArray(
                          task.codingTasks
                        )
                          ? task.codingTasks
                              .filter(
                                (
                                  item: any
                                ) =>
                                  typeof item ===
                                  "string"
                              )
                              .slice(0, 5)
                          : [];

                      return {
                        id:
                          task.id ||
                          `day-${
                            index + 1
                          }-task-${
                            taskIndex + 1
                          }`,

                        topicId:
                          task.topicId,

                        topicTitle:
                          task.topicTitle ||
                          "Learning Topic",

                        title:
                          task.title ||
                          "Complete learning task",

                        description:
                          task.description ||
                          "",

                        estimatedMinutes:
                          minutes,

                        type:
                          task.type ||
                          "learning",

                        resources,

                        practiceExercises,

                        codingTasks,

                        status:
                          "pending",
                      };
                    }
                  )
                  .filter(
                    (
                      task: any
                    ) =>
                      task !== null
                  );

              if (
                tasks.length === 0
              ) {
                return null;
              }

              return {
                day:
                  Number(day.day) ||
                  index + 1,

                date:
                  day.date,

                totalMinutes,

                tasks,
              };
            }
          )
          .filter(
            (day: any) =>
              day !== null
          );

      console.log(
        `✅ Personalized plan created with ${cleanedDays.length} days`
      );

      return res.json({
        success: true,

        plan: {
          days: cleanedDays,

          learningGoal,

          hoursPerDay:
            Number(hoursPerDay),

          targetDate,

          availableDays,

          skillLevel,

          knownTopicIds:
            Array.from(knownIds),

          assessmentResult:
            assessmentResult || null,

          topicQuizResults:
            quizResults,

          generatedAt:
            new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "❌ Personalized learning plan error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate personalized learning plan.",
      });
    }
  }
);

// =====================================================
// TOPIC QUIZ - GENERATE
// =====================================================

app.post(
  "/api/topic-quiz",
  async (req, res) => {
    try {
      const {
        roadmap,
        topic,
        completedTasks,
      } = req.body;

      // -------------------------------------------------
      // VALIDATION
      // -------------------------------------------------

      if (!roadmap) {
        return res.status(400).json({
          success: false,
          error:
            "Roadmap is required.",
        });
      }

      if (!topic) {
        return res.status(400).json({
          success: false,
          error:
            "Topic is required.",
        });
      }

      if (!topic.id || !topic.title) {
        return res.status(400).json({
          success: false,
          error:
            "Topic ID and topic title are required.",
        });
      }

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "GEMINI_API_KEY is missing in backend .env",
        });
      }

      // -------------------------------------------------
      // ONLY USE TASKS BELONGING TO THIS TOPIC
      // -------------------------------------------------

      const topicTasks =
        Array.isArray(completedTasks)
          ? completedTasks.filter(
              (task: any) =>
                String(
                  task.topicId
                ) ===
                String(topic.id)
            )
          : [];

      console.log(
        `🧠 Generating Topic Quiz for: ${topic.title}`
      );

      console.log(
        `📚 Topic ID: ${topic.id}`
      );

      console.log(
        `📝 Completed tasks for topic: ${topicTasks.length}`
      );

      // -------------------------------------------------
      // TOPIC QUIZ PROMPT
      // -------------------------------------------------

      const prompt = `
You are NovaPath, an AI topic assessment system.

Generate a quiz ONLY for the specified learning topic.

IMPORTANT:
The quiz must test ONLY the selected topic.
Do NOT ask questions from other roadmap topics.

SELECTED TOPIC:

${JSON.stringify(topic)}

COMPLETED TASKS FOR THIS TOPIC:

${JSON.stringify(topicTasks)}

ROADMAP CONTEXT:

${JSON.stringify(roadmap)}

Create exactly 5 multiple-choice questions.

Questions should test:
- conceptual understanding
- practical understanding
- application
- problem solving where appropriate

Difficulty:
Beginner to intermediate depending on the topic.

IMPORTANT RULES:

1. Exactly 5 questions.
2. Every question must relate ONLY to the selected topic.
3. Exactly 4 options per question.
4. One correct answer per question.
5. Include a short explanation.
6. Every question must contain the selected topicId.
7. Every question must contain the selected topicTitle.
8. Do not ask questions about unrelated roadmap topics.
9. Do not use markdown.
10. Do not use code fences.
11. Return ONLY valid JSON.

Use EXACTLY this structure:

{
  "questions": [
    {
      "id": "topic-q1",
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A",
      "topicId": "${topic.id}",
      "topicTitle": "${topic.title}",
      "explanation": "Short explanation of why the answer is correct."
    }
  ]
}

Return JSON only.
`;

      const response =
        await generateWithRetry(prompt);

      const text =
        response.text || "";

      console.log(
        "🧠 Topic Quiz Gemini response:"
      );

      console.log(text);

      if (!text) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned an empty topic quiz.",
        });
      }

      let parsed: any;

      try {
        parsed = JSON.parse(
          cleanGeminiJson(text)
        );
      } catch (error) {
        console.error(
          "❌ Topic Quiz JSON parsing failed:",
          error
        );

        return res.status(500).json({
          success: false,
          error:
            "Gemini returned invalid topic quiz JSON.",
        });
      }

      if (
        !parsed ||
        !Array.isArray(
          parsed.questions
        )
      ) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini generated an invalid topic quiz.",
        });
      }

      // -------------------------------------------------
      // VALIDATE QUESTIONS
      // -------------------------------------------------

      const questions =
        parsed.questions
          .filter(
            (question: any) =>
              question &&
              typeof question.question ===
                "string" &&
              Array.isArray(
                question.options
              ) &&
              question.options.length >= 4 &&
              String(
                question.topicId
              ) ===
                String(topic.id)
          )
          .slice(0, 5)
          .map(
            (
              question: any,
              index: number
            ) => {
              const options =
                question.options
                  .filter(
                    (option: any) =>
                      typeof option ===
                      "string"
                  )
                  .slice(0, 4);

              return {
                id:
                  question.id ||
                  `topic-q${
                    index + 1
                  }`,

                question:
                  question.question,

                options,

                correctAnswer:
                  typeof question.correctAnswer ===
                  "string"
                    ? question.correctAnswer
                    : "",

                topicId:
                  topic.id,

                topicTitle:
                  topic.title,

                explanation:
                  typeof question.explanation ===
                  "string"
                    ? question.explanation
                    : "",
              };
            }
          )
          .filter(
            (question: any) =>
              question.options.length ===
                4 &&
              question.correctAnswer &&
              question.options.includes(
                question.correctAnswer
              )
          );

      if (questions.length < 5) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini did not generate enough valid questions for this topic.",
        });
      }

      const quiz = {
        id:
          `topic-quiz-${String(
            topic.id
          )}-${Date.now()}`,

        roadmapId:
          roadmap.id
            ? String(roadmap.id)
            : undefined,

        roadmapTitle:
          roadmap.roadmap ||
          "NovaPath Roadmap",

        topicId:
          String(topic.id),

        topicTitle:
          topic.title,

        questions,
      };

      console.log(
        `✅ Topic Quiz generated with ${questions.length} questions`
      );

      return res.json({
        success: true,
        quiz,
      });
    } catch (error) {
      console.error(
        "❌ Topic Quiz generation error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate topic quiz.",
      });
    }
  }
);

// =====================================================
// TOPIC QUIZ - EVALUATE
// =====================================================

app.post(
  "/api/topic-quiz/evaluate",
  async (req, res) => {
    try {
      const {
        quiz,
        answers,
      } = req.body;

      if (!quiz) {
        return res.status(400).json({
          success: false,
          error:
            "Quiz is required.",
        });
      }

      if (!answers) {
        return res.status(400).json({
          success: false,
          error:
            "Quiz answers are required.",
        });
      }

      if (
        !Array.isArray(
          quiz.questions
        ) ||
        quiz.questions.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Quiz contains no questions.",
        });
      }

      console.log(
        `📊 Evaluating Topic Quiz: ${quiz.topicTitle}`
      );

      // -------------------------------------------------
      // CALCULATE SCORE
      // -------------------------------------------------

      let correctAnswers = 0;

      quiz.questions.forEach(
        (question: any) => {
          const userAnswer =
            answers[question.id];

          if (
            typeof userAnswer ===
              "string" &&
            typeof question.correctAnswer ===
              "string" &&
            userAnswer.trim() ===
              question.correctAnswer.trim()
          ) {
            correctAnswers++;
          }
        }
      );

      const totalQuestions =
        quiz.questions.length;

      const wrongAnswers =
        totalQuestions -
        correctAnswers;

      const percentage =
        Math.round(
          (correctAnswers /
            totalQuestions) *
            100
        );

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      let status:
        | "Mastered"
        | "Revise"
        | "Review & Practice";

      let message: string;

      if (percentage >= 80) {
        status = "Mastered";

        message =
          `Excellent! You have demonstrated strong understanding of ${quiz.topicTitle}.`;
      } else if (
        percentage >= 60
      ) {
        status = "Revise";

        message =
          `Good progress. Revise ${quiz.topicTitle} before moving forward.`;
      } else {
        status =
          "Review & Practice";

        message =
          `Spend more time reviewing ${quiz.topicTitle} and complete additional practice before moving ahead.`;
      }

      // -------------------------------------------------
      // TOPIC RESULT
      // -------------------------------------------------

      const result = {
        quizId:
          quiz.id,

        topicId:
          String(quiz.topicId),

        topicTitle:
          quiz.topicTitle,

        score:
          correctAnswers,

        totalQuestions,

        percentage,

        correctAnswers,

        wrongAnswers,

        status,

        message,

        completedAt:
          new Date().toISOString(),
      };

      console.log(
        `✅ Topic Quiz Result: ${quiz.topicTitle} - ${percentage}%`
      );

      return res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error(
        "❌ Topic Quiz evaluation error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate topic quiz.",
      });
    }
  }
);

// =====================================================
// DAILY QUIZ - GENERATE
// =====================================================

app.post(
  "/api/daily-quiz",
  async (req, res) => {
    try {
      const {
        roadmap,
        day,
        completedTasks,
      } = req.body;

      if (!roadmap) {
        return res.status(400).json({
          success: false,
          error:
            "Roadmap is required.",
        });
      }

      if (!day) {
        return res.status(400).json({
          success: false,
          error:
            "Day number is required.",
        });
      }

      if (
        !Array.isArray(
          completedTasks
        ) ||
        completedTasks.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Complete at least one task before taking today's quiz.",
        });
      }

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error:
            "GEMINI_API_KEY is missing in backend .env",
        });
      }

      // -------------------------------------------------
      // EXTRACT TODAY'S TOPICS
      // -------------------------------------------------

      const todayTopics =
        completedTasks.map(
          (task: any) => ({
            id:
              task.topicId ||
              `topic-${task.id}`,

            title:
              task.topicTitle ||
              task.title ||
              "Learning Topic",

            description:
              task.description ||
              "",

            tasks:
              Array.isArray(
                task.practiceExercises
              )
                ? task.practiceExercises
                : [],
          })
        );

      const uniqueTopics =
        Array.from(
          new Map(
            todayTopics.map(
              (topic: any) => [
                topic.id,
                topic,
              ]
            )
          ).values()
        );

      console.log(
        `📝 Generating Daily Quiz for Day ${day}`
      );

      console.log(
        `📚 Topics covered today: ${uniqueTopics.length}`
      );

      const prompt = `
You are NovaPath, an AI daily learning assessment system.

Generate a daily quiz ONLY from the topics the student completed today.

TODAY:
Day ${day}

COMPLETED TOPICS:
${JSON.stringify(
  uniqueTopics
)}

ROADMAP:
${JSON.stringify(
  roadmap
)}

IMPORTANT:

1. Questions MUST be based only on today's completed topics.
2. Do NOT ask questions from future topics.
3. Do NOT ask questions from topics that were not completed today.
4. Test actual understanding, not memorization only.
5. Mix conceptual and practical questions.
6. Difficulty should match the student's learning level.
7. Create exactly 5 questions.
8. Each question must have exactly 4 options.
9. Every question must have one correct answer.
10. Include the topic ID and topic title for every question.
11. Include a short explanation for every answer.
12. Return ONLY valid JSON.
13. Do not use markdown.
14. Do not use code fences.

Use EXACTLY this structure:

{
  "questions": [
    {
      "id": "daily-q1",
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A",
      "topicId": "topic-1",
      "topicTitle": "Python Fundamentals",
      "explanation": "Why this answer is correct."
    }
  ]
}

Return JSON only.
`;

      const response =
        await generateWithRetry(prompt);

      const text =
        response.text || "";

      console.log(
        "🧠 Daily Quiz Gemini response:"
      );

      console.log(text);

      if (!text) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini returned an empty daily quiz.",
        });
      }

      let parsed: any;

      try {
        parsed = JSON.parse(
          cleanGeminiJson(text)
        );
      } catch (error) {
        console.error(
          "❌ Daily Quiz JSON parsing failed:",
          error
        );

        return res.status(500).json({
          success: false,
          error:
            "Gemini returned invalid daily quiz JSON.",
        });
      }

      if (
        !parsed ||
        !Array.isArray(
          parsed.questions
        )
      ) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini generated an invalid daily quiz.",
        });
      }

      const allowedTopicIds =
        new Set(
          uniqueTopics.map(
            (topic: any) =>
              topic.id
          )
        );

      const questions =
        parsed.questions
          .filter(
            (question: any) =>
              question &&
              typeof question.question ===
                "string" &&
              Array.isArray(
                question.options
              ) &&
              question.options.length >= 2 &&
              allowedTopicIds.has(
                question.topicId
              )
          )
          .slice(0, 5)
          .map(
            (
              question: any,
              index: number
            ) => ({
              id:
                question.id ||
                `daily-q${
                  index + 1
                }`,

              question:
                question.question,

              options:
                question.options
                  .filter(
                    (option: any) =>
                      typeof option ===
                      "string"
                  )
                  .slice(0, 4),

              correctAnswer:
                typeof question.correctAnswer ===
                "string"
                  ? question.correctAnswer
                  : "",

              topicId:
                question.topicId,

              topicTitle:
                question.topicTitle ||
                "Today's Topic",

              explanation:
                typeof question.explanation ===
                "string"
                  ? question.explanation
                  : "",
            })
          )
          .filter(
            (question: any) =>
              question.options.length === 4 &&
              question.correctAnswer &&
              question.options.includes(
                question.correctAnswer
              )
          );

      if (questions.length === 0) {
        return res.status(500).json({
          success: false,
          error:
            "No valid quiz questions were generated.",
        });
      }

      const quiz = {
        id: `daily-quiz-${Date.now()}`,

        roadmapId:
          roadmap.id
            ? String(roadmap.id)
            : undefined,

        roadmapTitle:
          roadmap.roadmap ||
          "NovaPath Roadmap",

        day: Number(day),

        topics:
          uniqueTopics.map(
            (topic: any) =>
              topic.title
          ),

        questions,
      };

      console.log(
        `✅ Daily Quiz generated with ${questions.length} questions`
      );

      return res.json({
        success: true,
        quiz,
      });
    } catch (error) {
      console.error(
        "❌ Daily Quiz generation error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate daily quiz.",
      });
    }
  }
);

// =====================================================
// DAILY QUIZ - EVALUATE
// =====================================================

app.post(
  "/api/daily-quiz/evaluate",
  async (req, res) => {
    try {
      const {
        quiz,
        answers,
      } = req.body;

      if (!quiz) {
        return res.status(400).json({
          success: false,
          error:
            "Quiz is required.",
        });
      }

      if (!answers) {
        return res.status(400).json({
          success: false,
          error:
            "Quiz answers are required.",
        });
      }

      if (
        !Array.isArray(
          quiz.questions
        ) ||
        quiz.questions.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Quiz contains no questions.",
        });
      }

      console.log(
        `📊 Evaluating Daily Quiz - Day ${quiz.day}`
      );

      let correctAnswers = 0;

      const topicStats: Record<
        string,
        {
          title: string;
          correct: number;
          total: number;
        }
      > = {};

      quiz.questions.forEach(
        (question: any) => {
          const topicId =
            question.topicId ||
            "unknown";

          const topicTitle =
            question.topicTitle ||
            "Unknown Topic";

          if (!topicStats[topicId]) {
            topicStats[topicId] = {
              title: topicTitle,
              correct: 0,
              total: 0,
            };
          }

          topicStats[topicId].total +=
            1;

          const userAnswer =
            answers[question.id];

          if (
            typeof userAnswer ===
              "string" &&
            userAnswer.trim() ===
              question.correctAnswer.trim()
          ) {
            correctAnswers++;

            topicStats[
              topicId
            ].correct++;
          }
        }
      );

      const totalQuestions =
        quiz.questions.length;

      const wrongAnswers =
        totalQuestions -
        correctAnswers;

      const percentage =
        Math.round(
          (correctAnswers /
            totalQuestions) *
            100
        );

      const strengths: string[] =
        [];

      const weaknesses: string[] =
        [];

      Object.values(
        topicStats
      ).forEach((topic) => {
        const topicPercentage =
          Math.round(
            (topic.correct /
              topic.total) *
              100
          );

        if (
          topicPercentage >= 80
        ) {
          strengths.push(
            topic.title
          );
        } else {
          weaknesses.push(
            topic.title
          );
        }
      });

      let status =
        "Needs Review";

      let message =
        "Review today's topics and practice the weak areas.";

      if (percentage >= 80) {
        status = "Mastered";

        message =
          "Excellent work! You have demonstrated strong understanding of today's topics.";
      } else if (
        percentage >= 60
      ) {
        status = "Revise";

        message =
          "Good progress! Revise the weak topics before moving forward.";
      } else {
        status =
          "Review & Practice";

        message =
          "Spend more time reviewing today's topics and complete additional practice before moving ahead.";
      }

      const result = {
        quizId:
          quiz.id,

        day:
          Number(quiz.day),

        score:
          correctAnswers,

        totalQuestions,

        percentage,

        correctAnswers,

        wrongAnswers,

        strengths,

        weaknesses,

        status,

        message,

        completedAt:
          new Date().toISOString(),
      };

      console.log(
        `✅ Daily Quiz Result: ${percentage}%`
      );

      return res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error(
        "❌ Daily Quiz evaluation error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to evaluate daily quiz.",
      });
    }
  }
);

// =====================================================
// AUTH: SIGNUP
// =====================================================

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, careerGoal, skillLevel } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email and password are required.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters.",
      });
    }

    const existing = findUserByEmail(String(email));

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await hashPassword(String(password));

    // First registered user becomes an admin so there is
    // always at least one account that can view /admin. Any email
    // listed in ADMIN_EMAILS (see .env) is also always made admin,
    // regardless of signup order.
    const isFirstUser = getUsers().length === 0;
    const normalizedEmail = String(email).trim().toLowerCase();
    const isAdminEmail = isAllowlistedAdmin(normalizedEmail);

    const user = createUser({
      id: crypto.randomUUID(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: isFirstUser || isAdminEmail ? "admin" : "student",
      careerGoal: careerGoal ? String(careerGoal) : undefined,
      skillLevel: skillLevel ? String(skillLevel) : "Beginner",
      createdAt: new Date().toISOString(),
    });

    const token = signToken(user.id);

    return res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("❌ Signup error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create account.",
    });
  }
});

// =====================================================
// AUTH: LOGIN
// =====================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, portal } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required.",
      });
    }

    // "portal" tells us which login window the request came from:
    // the Student window or the Admin window. It is enforced here,
    // server-side, so admin access can never be granted just because
    // the client-side UI happened to say "admin".
    const requestedPortal = portal === "admin" ? "admin" : "student";

    const user = findUserByEmail(String(email));

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const valid = await verifyPassword(String(password), user.passwordHash);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    // Self-heal: if this account's email is on the ADMIN_EMAILS
    // allowlist but was created (or ended up) as "student" — e.g. it
    // wasn't the first account to sign up — promote it to admin now.
    let effectiveUser = user;
    if (user.role !== "admin" && isAllowlistedAdmin(user.email)) {
      effectiveUser = updateUser(user.id, { role: "admin" }) || user;
    }

    // Only accounts with the "admin" role may authenticate through the
    // Admin login window. Everyone else is rejected outright, even with
    // a correct password, so student accounts can never end up with
    // admin authority.
    if (requestedPortal === "admin" && effectiveUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        error:
          "This account does not have admin access. Please use the Student login instead.",
      });
    }

    const token = signToken(effectiveUser.id);

    return res.json({
      success: true,
      token,
      user: toPublicUser(effectiveUser),
    });
  } catch (error) {
    console.error("❌ Login error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to log in.",
    });
  }
});

// =====================================================
// AUTH: CURRENT USER
// =====================================================

app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
  return res.json({ success: true, user: req.user });
});

// =====================================================
// AUTH: UPDATE PROFILE
// =====================================================

app.put("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
  const { name, careerGoal, skillLevel } = req.body || {};

  const updated = updateUser(req.user!.id, {
    ...(name ? { name: String(name) } : {}),
    ...(careerGoal !== undefined ? { careerGoal: String(careerGoal) } : {}),
    ...(skillLevel ? { skillLevel: String(skillLevel) } : {}),
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  return res.json({ success: true, user: toPublicUser(updated) });
});

// =====================================================
// AI MENTOR / CHATBOT
// =====================================================

app.post("/api/mentor-chat", requireAuth, async (req, res) => {
  try {
    const { roadmapTitle, history, question } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({
        success: false,
        error: "Please ask a question.",
      });
    }

    const historyText = Array.isArray(history)
      ? history
          .slice(-8)
          .map(
            (m: { role: string; content: string }) =>
              `${m.role === "user" ? "Student" : "Mentor"}: ${m.content}`
          )
          .join("\n")
      : "";

    const prompt = `You are NovaPath AI Mentor, a friendly, encouraging technical mentor helping a student working on the roadmap "${
      roadmapTitle || "their learning path"
    }".

Answer the student's question clearly and concisely. Explain concepts simply,
give a short example when useful, and suggest a small next step or practice
idea when relevant. Keep the answer under 200 words unless code is required.

Conversation so far:
${historyText || "(no previous messages)"}

Student: ${question}

Respond with plain text only (no JSON, no markdown code fences unless sharing code).`;

    const response = await generateWithRetry(prompt);
    const text = response.text || "I couldn't come up with an answer just now — try rephrasing your question.";

    bumpStat("mentorMessages");

    return res.json({ success: true, answer: text.trim() });
  } catch (error) {
    console.error("❌ Mentor chat error:", error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reach the AI mentor.",
    });
  }
});

// =====================================================
// AI CAREER GUIDANCE
// =====================================================

app.post("/api/career-guidance", requireAuth, async (req, res) => {
  try {
    const { careerGoal, roadmapTitle, skillLevel, topicQuizResults, assessmentResult } =
      req.body || {};

    if (!careerGoal) {
      return res.status(400).json({
        success: false,
        error: "A career goal is required.",
      });
    }

    const weakTopics = Array.isArray(topicQuizResults)
      ? topicQuizResults
          .filter((r: any) => Number(r.percentage) < 70)
          .map((r: any) => r.topicTitle)
      : [];

    const prompt = `You are a career guidance AI for the NovaPath learning platform.

Student's target career: "${careerGoal}"
Current roadmap: "${roadmapTitle || "N/A"}"
Self-reported skill level: "${skillLevel || "Beginner"}"
Assessment summary: ${
      assessmentResult ? JSON.stringify(assessmentResult) : "not taken yet"
    }
Weak topics from recent quizzes: ${
      weakTopics.length ? weakTopics.join(", ") : "none identified"
    }

Return ONLY valid JSON (no markdown fences) matching this shape:
{
  "skillGapSummary": "2-3 sentence summary of where the student stands vs the target role",
  "prioritySkills": ["skill 1", "skill 2", "skill 3"],
  "recommendedProjects": ["project idea 1", "project idea 2"],
  "certifications": ["certification 1", "certification 2"],
  "interviewPrepTopics": ["topic 1", "topic 2", "topic 3"],
  "nextSteps": ["short actionable step 1", "short actionable step 2", "short actionable step 3"]
}`;

    const response = await generateWithRetry(prompt);
    const cleaned = cleanGeminiJson(response.text || "{}");

    let guidance;

    try {
      guidance = JSON.parse(cleaned);
    } catch {
      guidance = {
        skillGapSummary: response.text || "Unable to parse guidance.",
        prioritySkills: [],
        recommendedProjects: [],
        certifications: [],
        interviewPrepTopics: [],
        nextSteps: [],
      };
    }

    bumpStat("careerGuidanceRuns");

    return res.json({ success: true, guidance });
  } catch (error) {
    console.error("❌ Career guidance error:", error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate career guidance.",
    });
  }
});

// =====================================================
// ADMIN: PLATFORM OVERVIEW
// =====================================================

app.get(
  "/api/admin/users",
  requireAuth,
  requireAdmin,
  (_req, res) => {
    const users = getUsers().map(toPublicUser);
    return res.json({ success: true, users });
  }
);

app.get(
  "/api/admin/stats",
  requireAuth,
  requireAdmin,
  (_req, res) => {
    const users = getUsers();

    return res.json({
      success: true,
      stats: {
        ...getStats(),
        totalUsers: users.length,
        totalAdmins: users.filter((u) => u.role === "admin").length,
      },
    });
  }
);

// =====================================================
// ADMIN: UPDATE A USER'S ROLE (promote / demote)
// =====================================================
//
// Full admin authority: any admin can grant or revoke admin
// access for any other account. Admins cannot change their own
// role here, so the platform can never end up with zero admins
// through a single misclick.

app.patch(
  "/api/admin/users/:id/role",
  requireAuth,
  requireAdmin,
  (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    const { role } = req.body || {};

    if (role !== "admin" && role !== "student") {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "admin" or "student".',
      });
    }

    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: "You cannot change your own role.",
      });
    }

    const updated = updateUser(id, { role });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    return res.json({ success: true, user: toPublicUser(updated) });
  }
);

// =====================================================
// ADMIN: DELETE A USER ACCOUNT
// =====================================================

app.delete(
  "/api/admin/users/:id",
  requireAuth,
  requireAdmin,
  (req: AuthedRequest, res) => {
    const id = String(req.params.id);

    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: "You cannot delete your own account.",
      });
    }

    const removed = deleteUser(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    return res.json({ success: true });
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {
    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      "🚀 NovaPath Backend Started"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `🌐 http://localhost:${PORT}`
    );

    console.log(
      `📚 Text API: http://localhost:${PORT}/api/generate-roadmap`
    );

    console.log(
      `📷 Image API: http://localhost:${PORT}/api/analyze-roadmap-image`
    );

    console.log(
      `🎯 Personalized API: http://localhost:${PORT}/api/generate-learning-plan`
    );

    console.log(
      `🧠 Skill Assessment API: http://localhost:${PORT}/api/skill-assessment`
    );

    console.log(
      `📖 Topic Quiz API: http://localhost:${PORT}/api/topic-quiz`
    );

    console.log(
      `📊 Topic Quiz Evaluation: http://localhost:${PORT}/api/topic-quiz/evaluate`
    );

    console.log(
      `📝 Daily Quiz API: http://localhost:${PORT}/api/daily-quiz`
    );

    console.log(
      `📊 Daily Quiz Evaluation: http://localhost:${PORT}/api/daily-quiz/evaluate`
    );

    console.log(
      "=========================================="
    );

    console.log("");
  }
);