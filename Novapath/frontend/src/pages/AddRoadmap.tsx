import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Topic = {
  id: string;
  title: string;
  description: string;
  day?: number;
  tasks?: string[];
  estimatedHours?: number;
  expectedOutcome?: string;
};

type Roadmap = {
  id: string;
  source: string;
  roadmap: string;
  hours: string;
  fileName: string;
  fileData?: string;
  progress: number;
  currentDay: number;
  completedTopics: string[];
  topics: Topic[];
  aiRoadmap?: string;
};

const roadmapLinks: Record<string, string> = {
  "AI Engineer": "https://roadmap.sh/ai-engineer",
  "Machine Learning": "https://roadmap.sh/machine-learning",
  "Data Analyst": "https://roadmap.sh/data-analyst",
  "Data Science": "https://roadmap.sh/ai-data-scientist",
  "Full Stack": "https://roadmap.sh/full-stack",
  Python: "https://roadmap.sh/python",
  SQL: "https://roadmap.sh/sql",
};

function AddRoadmap() {
  const navigate = useNavigate();

  const [source, setSource] = useState("");
  const [roadmap, setRoadmap] = useState("");
  const [hours, setHours] = useState("2");

  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState("");
  const [fileMimeType, setFileMimeType] = useState("");

  const [generating, setGenerating] = useState(false);

  // =====================================================
  // HANDLE IMAGE UPLOAD
  // =====================================================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please upload an image smaller than 10 MB.");
      return;
    }

    setFileName(file.name);
    setFileMimeType(file.type);

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;

      setFileData(result);

      console.log("📷 Image loaded successfully");
      console.log("File:", file.name);
      console.log("Type:", file.type);
      console.log("Size:", file.size);
    };

    reader.onerror = () => {
      alert("Failed to read the image.");
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // CONVERT GEMINI TEXT INTO TOPICS
  // =====================================================

  const createTopicsFromAI = (
    aiText: string,
    careerGoal: string,
    studyHours: number
  ): Topic[] => {
    const topics: Topic[] = [];

    if (!aiText) {
      return topics;
    }

    const lines = aiText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let currentDay = 1;

    for (const line of lines) {
      const cleanedLine = line
        .replace(/\*\*/g, "")
        .replace(/__+/g, "")
        .trim();

      // -----------------------------------------------
      // Match Day 1, Day 2, Day 3...
      // -----------------------------------------------

      const dayMatch = cleanedLine.match(
        /day\s*(\d+)/i
      );

      if (dayMatch) {
        currentDay = Number(dayMatch[1]);

        let title = cleanedLine
          .replace(
            /day\s*\d+\s*[:\-–—]?\s*/i,
            ""
          )
          .trim();

        title = title
          .replace(
            /^(topics?|topic|tasks?|task)\s*[:\-–—]?\s*/i,
            ""
          )
          .trim();

        if (
          title.length > 2 &&
          title.length < 150
        ) {
          topics.push({
            id: `ai-day-${currentDay}-${topics.length}`,
            title,
            description:
              `Learn ${title} as part of your ${careerGoal} learning path.`,
            day: currentDay,
            tasks: [
              `Study ${title}`,
              `Practice ${title}`,
            ],
            estimatedHours: studyHours,
            expectedOutcome:
              `Understand the fundamentals of ${title}.`,
          });
        }

        continue;
      }
    }

    // =================================================
    // FALLBACK: DETECT HEADINGS / TOPICS
    // =================================================

    if (topics.length === 0) {
      for (const line of lines) {
        let cleaned = line
          .replace(/^[#*\-\d.)\s]+/, "")
          .replace(/\*\*/g, "")
          .trim();

        if (
          cleaned.length < 4 ||
          cleaned.length > 120
        ) {
          continue;
        }

        if (
          /^(roadmap|career goal|skill level|available hours|estimated time|expected outcome|tasks?|topics?|learning roadmap)$/i.test(
            cleaned
          )
        ) {
          continue;
        }

        if (cleaned.split(" ").length > 15) {
          continue;
        }

        topics.push({
          id: `ai-topic-${topics.length + 1}`,
          title: cleaned,
          description:
            `Learn and practice ${cleaned}.`,
          day: topics.length + 1,
          tasks: [
            `Study ${cleaned}`,
            `Practice ${cleaned}`,
          ],
          estimatedHours: studyHours,
          expectedOutcome:
            `Build a strong understanding of ${cleaned}.`,
        });

        if (topics.length >= 30) {
          break;
        }
      }
    }

    return topics;
  };

  // =====================================================
  // NORMALIZE TOPICS RETURNED BY BACKEND
  // =====================================================

  const normalizeTopics = (
    rawTopics: any[],
    studyHours: number
  ): Topic[] => {
    return rawTopics
      .map((topic, index): Topic | null => {
        // Ignore invalid/null topics
        if (!topic || typeof topic !== "object") {
          return null;
        }

        const title =
          typeof topic.title === "string"
            ? topic.title.trim()
            : "";

        if (!title) {
          return null;
        }

        const topicDay =
          Number(topic.day) || index + 1;

        const topicTasks =
          Array.isArray(topic.tasks)
            ? topic.tasks.filter(
                (task: unknown): task is string =>
                  typeof task === "string"
              )
            : [
                `Study ${title}`,
                `Practice ${title}`,
              ];

        const estimatedHours =
          Number(topic.estimatedHours) ||
          studyHours;

        return {
          id:
            typeof topic.id === "string" &&
            topic.id.trim()
              ? topic.id
              : `topic-${index + 1}`,

          title,

          description:
            typeof topic.description === "string"
              ? topic.description
              : `Learn and practice ${title}.`,

          day: topicDay,

          tasks:
            topicTasks.length > 0
              ? topicTasks
              : [
                  `Study ${title}`,
                  `Practice ${title}`,
                ],

          estimatedHours,

          expectedOutcome:
            typeof topic.expectedOutcome ===
            "string"
              ? topic.expectedOutcome
              : `Understand and apply ${title}.`,
        };
      })
      .filter(
        (topic): topic is Topic =>
          topic !== null
      );
  };

  // =====================================================
  // CREATE ROADMAP
  // =====================================================

  const handleCreatePlan = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!source) {
      alert("Please select a roadmap source.");
      return;
    }

    if (
      source === "roadmap.sh" &&
      !roadmap
    ) {
      alert("Please select a roadmap.");
      return;
    }

    if (
      source === "custom" &&
      !fileData
    ) {
      alert("Please upload your roadmap image.");
      return;
    }

    try {
      setGenerating(true);

      let topics: Topic[] = [];
      let aiRoadmap = "";

      // =================================================
      // ROADMAP.SH
      // =================================================

      if (source === "roadmap.sh") {
        console.log(
          "🤖 Generating roadmap using Gemini..."
        );

        const response = await fetch(
          "http://localhost:5000/api/generate-roadmap",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              careerGoal: roadmap,
              skillLevel: "Beginner",
              hoursPerDay: Number(hours),
            }),
          }
        );

        const data = await response.json();

        console.log(
          "🤖 Roadmap backend response:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Failed to generate roadmap."
          );
        }

        aiRoadmap =
          typeof data.roadmap === "string"
            ? data.roadmap
            : JSON.stringify(data.roadmap);

        // -----------------------------------------------
        // Structured topics from backend
        // -----------------------------------------------

        if (
          Array.isArray(data.topics) &&
          data.topics.length > 0
        ) {
          topics = normalizeTopics(
            data.topics,
            Number(hours)
          );
        }

        // -----------------------------------------------
        // Fallback: convert text into topics
        // -----------------------------------------------

        if (topics.length === 0) {
          topics =
            createTopicsFromAI(
              aiRoadmap,
              roadmap,
              Number(hours)
            );
        }

        if (topics.length === 0) {
          throw new Error(
            "No learning topics were generated."
          );
        }

        console.log(
          "📚 Roadmap.sh topics:",
          topics
        );
      }

      // =================================================
      // CUSTOM IMAGE ROADMAP
      // =================================================

      if (source === "custom") {
        console.log(
          "📷 Sending roadmap image to Gemini..."
        );

        if (!fileData) {
          throw new Error(
            "Roadmap image is missing."
          );
        }

        /*
         * fileData looks like:
         *
         * data:image/png;base64,iVBORw0OR...
         *
         * We only send the Base64 portion
         * to the backend.
         */

        const base64Image =
          fileData.includes(",")
            ? fileData.split(",")[1]
            : fileData;

        const response = await fetch(
          "http://localhost:5000/api/analyze-roadmap-image",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              image: base64Image,

              mimeType:
                fileMimeType ||
                "image/jpeg",

              hoursPerDay:
                Number(hours),
            }),
          }
        );

        const data = await response.json();

        console.log(
          "🧠 Gemini image analysis:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gemini could not read the roadmap image."
          );
        }

        aiRoadmap =
          typeof data.roadmap === "string"
            ? data.roadmap
            : JSON.stringify(data.roadmap);

        // -----------------------------------------------
        // Structured topics from backend
        // -----------------------------------------------

        if (
          Array.isArray(data.topics) &&
          data.topics.length > 0
        ) {
          topics = normalizeTopics(
            data.topics,
            Number(hours)
          );
        }

        // -----------------------------------------------
        // Fallback: convert returned text
        // -----------------------------------------------

        if (
          topics.length === 0 &&
          aiRoadmap
        ) {
          topics =
            createTopicsFromAI(
              aiRoadmap,
              "Custom Roadmap",
              Number(hours)
            );
        }

        if (topics.length === 0) {
          throw new Error(
            "Gemini could not find any topics in this roadmap image. Please upload a clearer image."
          );
        }

        console.log(
          "📚 Extracted custom roadmap topics:",
          topics
        );
      }

      // =================================================
      // LOAD EXISTING ROADMAPS
      // =================================================

      let existingRoadmaps: Roadmap[] = [];

      try {
        existingRoadmaps =
          JSON.parse(
            localStorage.getItem(
              "novapath_roadmaps"
            ) || "[]"
          );
      } catch {
        existingRoadmaps = [];
      }

      // =================================================
      // CREATE ROADMAP OBJECT
      // =================================================

      const newRoadmap: Roadmap = {
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,

        source,

        roadmap:
          source === "custom"
            ? fileName ||
              "My Custom Roadmap"
            : roadmap,

        hours,

        fileName,

        fileData,

        progress: 0,

        currentDay: 1,

        completedTopics: [],

        topics,

        aiRoadmap,
      };

      // =================================================
      // SAVE ROADMAP
      // =================================================

      const updatedRoadmaps = [
        ...existingRoadmaps,
        newRoadmap,
      ];

      localStorage.setItem(
        "novapath_roadmaps",
        JSON.stringify(
          updatedRoadmaps
        )
      );

      console.log(
        "✅ Roadmap successfully saved:",
        newRoadmap
      );

      alert(
        `Roadmap created successfully! 🚀\n\n${topics.length} topics detected.`
      );

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "❌ Roadmap generation failed:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create roadmap."
      );
    } finally {
      setGenerating(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">

      <div className="max-w-4xl mx-auto">

        {/* HEADER */}

        <div className="text-center mb-10">

          <h1 className="text-4xl font-bold">
            Add a Roadmap 🗺️
          </h1>

          <p className="text-slate-400 mt-2">
            Choose an existing roadmap or
            bring your own.
          </p>

        </div>

        <form
          onSubmit={handleCreatePlan}
        >

          {/* SOURCE SELECTION */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            {/* ROADMAP.SH */}

            <button
              type="button"
              onClick={() => {
                setSource("roadmap.sh");
                setFileName("");
                setFileData("");
                setFileMimeType("");
              }}
              className={`text-left p-6 rounded-2xl border transition ${
                source === "roadmap.sh"
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >

              <div className="text-4xl mb-4">
                🌐
              </div>

              <h2 className="text-xl font-semibold">
                Use roadmap.sh
              </h2>

              <p className="text-slate-400 mt-2">
                Generate a personalized
                AI learning roadmap.
              </p>

            </button>

            {/* CUSTOM */}

            <button
              type="button"
              onClick={() => {
                setSource("custom");
                setRoadmap("");
              }}
              className={`text-left p-6 rounded-2xl border transition ${
                source === "custom"
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }`}
            >

              <div className="text-4xl mb-4">
                📷
              </div>

              <h2 className="text-xl font-semibold">
                My Own Roadmap
              </h2>

              <p className="text-slate-400 mt-2">
                Upload your roadmap image
                and let AI read it.
              </p>

            </button>

          </div>

          {/* ROADMAP.SH SELECTION */}

          {source === "roadmap.sh" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

              <label className="block text-sm text-slate-300 mb-2">
                Select a career roadmap
              </label>

              <select
                value={roadmap}
                onChange={(e) =>
                  setRoadmap(
                    e.target.value
                  )
                }
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >

                <option value="">
                  Choose a roadmap
                </option>

                <option value="AI Engineer">
                  AI Engineer
                </option>

                <option value="Machine Learning">
                  Machine Learning
                </option>

                <option value="Data Analyst">
                  Data Analyst
                </option>

                <option value="Data Science">
                  Data Science
                </option>

                <option value="Full Stack">
                  Full Stack
                </option>

                <option value="Python">
                  Python
                </option>

                <option value="SQL">
                  SQL
                </option>

              </select>

              {roadmap &&
                roadmapLinks[roadmap] && (
                  <a
                    href={
                      roadmapLinks[roadmap]
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 text-indigo-400 hover:text-indigo-300"
                  >
                    View official roadmap ↗
                  </a>
                )}

            </div>
          )}

          {/* CUSTOM IMAGE */}

          {source === "custom" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

              <label className="block text-sm text-slate-300 mb-4">
                Upload your roadmap image
              </label>

              <label className="block border-2 border-dashed border-slate-700 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500 transition">

                <div className="text-5xl mb-4">
                  📤
                </div>

                <p className="text-slate-300">
                  Click to upload your roadmap
                </p>

                <p className="text-slate-500 text-sm mt-2">
                  PNG, JPG or JPEG
                </p>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />

              </label>

              {fileName && (
                <div className="mt-4">

                  <p className="text-green-400">
                    ✓ {fileName}
                  </p>

                  <p className="text-slate-500 text-sm mt-1">
                    Gemini will analyze this
                    image and extract the
                    learning topics.
                  </p>

                </div>
              )}

              {fileData && (
                <div className="mt-6">

                  <p className="text-slate-300 mb-3">
                    Preview
                  </p>

                  <div className="rounded-xl overflow-hidden border border-slate-700">

                    <img
                      src={fileData}
                      alt="Roadmap preview"
                      className="w-full max-h-[500px] object-contain bg-slate-950"
                    />

                  </div>

                </div>
              )}

            </div>
          )}

          {/* HOURS */}

          {source && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

              <label className="block text-sm text-slate-300 mb-2">
                How many hours can you study per day? ⏱️
              </label>

              <select
                value={hours}
                onChange={(e) =>
                  setHours(
                    e.target.value
                  )
                }
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >

                <option value="1">
                  1 hour / day
                </option>

                <option value="2">
                  2 hours / day
                </option>

                <option value="3">
                  3 hours / day
                </option>

                <option value="4">
                  4 hours / day
                </option>

                <option value="5">
                  5+ hours / day
                </option>

              </select>

            </div>
          )}

          {/* CREATE */}

          {source && (
            <button
              type="submit"
              disabled={generating}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition ${
                generating
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >

              {generating
                ? source === "custom"
                  ? "🧠 Reading your roadmap image..."
                  : "🤖 Generating your roadmap..."
                : "Create My Learning Plan 🚀"}

            </button>
          )}

        </form>

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
          disabled={generating}
          className="w-full mt-4 py-3 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 transition"
        >
          ← Back to Dashboard
        </button>

      </div>

    </div>
  );
}

export default AddRoadmap;