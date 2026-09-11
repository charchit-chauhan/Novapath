import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Topic = {
  id: string;
  title: string;
  description: string;
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
  topics?: Topic[];
  aiRoadmap?: string;
};

const defaultTopics: Record<string, Topic[]> = {
  "AI Engineer": [
    {
      id: "ai-python",
      title: "Python Fundamentals",
      description:
        "Learn Python syntax, variables, data types, operators and control flow.",
    },
    {
      id: "ai-numpy",
      title: "NumPy",
      description:
        "Learn arrays, indexing, mathematical operations and numerical computing.",
    },
    {
      id: "ai-pandas",
      title: "Pandas",
      description:
        "Learn data manipulation, cleaning and analysis using Pandas.",
    },
    {
      id: "ai-math",
      title: "Mathematics for AI",
      description:
        "Study linear algebra, probability, statistics and calculus.",
    },
    {
      id: "ai-ml",
      title: "Machine Learning Fundamentals",
      description:
        "Understand supervised and unsupervised learning algorithms.",
    },
    {
      id: "ai-sklearn",
      title: "Scikit-learn",
      description:
        "Build, train and evaluate machine learning models.",
    },
    {
      id: "ai-dl",
      title: "Deep Learning",
      description:
        "Learn neural networks, backpropagation and deep learning concepts.",
    },
    {
      id: "ai-cv",
      title: "Computer Vision",
      description:
        "Learn image processing and computer vision fundamentals.",
    },
    {
      id: "ai-nlp",
      title: "Natural Language Processing",
      description:
        "Learn text processing, embeddings and NLP techniques.",
    },
    {
      id: "ai-genai",
      title: "Generative AI",
      description:
        "Learn LLMs, prompt engineering and generative AI systems.",
    },
  ],

  "Machine Learning": [
    {
      id: "ml-python",
      title: "Python",
      description:
        "Learn Python programming for machine learning.",
    },
    {
      id: "ml-math",
      title: "Mathematics",
      description:
        "Learn linear algebra, probability and statistics.",
    },
    {
      id: "ml-data",
      title: "Data Preprocessing",
      description:
        "Clean, transform and prepare datasets.",
    },
    {
      id: "ml-supervised",
      title: "Supervised Learning",
      description:
        "Learn regression and classification algorithms.",
    },
    {
      id: "ml-unsupervised",
      title: "Unsupervised Learning",
      description:
        "Learn clustering and dimensionality reduction.",
    },
    {
      id: "ml-evaluation",
      title: "Model Evaluation",
      description:
        "Learn accuracy, precision, recall, F1 score and cross-validation.",
    },
    {
      id: "ml-feature",
      title: "Feature Engineering",
      description:
        "Create useful features for machine learning models.",
    },
    {
      id: "ml-tuning",
      title: "Hyperparameter Tuning",
      description:
        "Improve models using parameter optimization.",
    },
    {
      id: "ml-project",
      title: "Machine Learning Project",
      description:
        "Build an end-to-end machine learning project.",
    },
  ],

  Python: [
    {
      id: "python-basics",
      title: "Python Basics",
      description:
        "Learn variables, data types, operators and syntax.",
    },
    {
      id: "python-control",
      title: "Control Flow",
      description:
        "Learn conditions, loops and logical operations.",
    },
    {
      id: "python-functions",
      title: "Functions",
      description:
        "Create reusable functions and understand parameters.",
    },
    {
      id: "python-data",
      title: "Python Data Structures",
      description:
        "Master lists, tuples, sets and dictionaries.",
    },
    {
      id: "python-oop",
      title: "Object-Oriented Programming",
      description:
        "Learn classes, objects, inheritance and polymorphism.",
    },
    {
      id: "python-files",
      title: "File Handling",
      description:
        "Read, write and manage files using Python.",
    },
    {
      id: "python-errors",
      title: "Exception Handling",
      description:
        "Handle errors using try, except and finally.",
    },
    {
      id: "python-modules",
      title: "Modules and Packages",
      description:
        "Organize Python projects using modules and packages.",
    },
    {
      id: "python-project",
      title: "Python Project",
      description:
        "Build a complete Python application.",
    },
  ],

  SQL: [
    {
      id: "sql-basics",
      title: "SQL Basics",
      description:
        "Learn databases, tables and basic SQL syntax.",
    },
    {
      id: "sql-select",
      title: "SELECT Queries",
      description:
        "Retrieve data using SELECT, WHERE and ORDER BY.",
    },
    {
      id: "sql-functions",
      title: "SQL Functions",
      description:
        "Use aggregate, string and date functions.",
    },
    {
      id: "sql-group",
      title: "GROUP BY and HAVING",
      description:
        "Group and filter aggregated data.",
    },
    {
      id: "sql-joins",
      title: "SQL Joins",
      description:
        "Learn INNER, LEFT, RIGHT and FULL joins.",
    },
    {
      id: "sql-subqueries",
      title: "Subqueries",
      description:
        "Use queries inside other queries.",
    },
    {
      id: "sql-views",
      title: "Views",
      description:
        "Create reusable database views.",
    },
    {
      id: "sql-project",
      title: "SQL Project",
      description:
        "Solve a real-world data problem using SQL.",
    },
  ],

  "Data Analyst": [
    {
      id: "da-excel",
      title: "Excel",
      description:
        "Learn formulas, functions, tables and charts.",
    },
    {
      id: "da-sql",
      title: "SQL",
      description:
        "Query and analyze relational databases.",
    },
    {
      id: "da-statistics",
      title: "Statistics",
      description:
        "Learn descriptive statistics and probability.",
    },
    {
      id: "da-python",
      title: "Python for Data Analysis",
      description:
        "Use Python for data cleaning and analysis.",
    },
    {
      id: "da-pandas",
      title: "Pandas",
      description:
        "Manipulate and analyze datasets.",
    },
    {
      id: "da-visualization",
      title: "Data Visualization",
      description:
        "Create meaningful charts and visualizations.",
    },
    {
      id: "da-powerbi",
      title: "Power BI",
      description:
        "Build interactive dashboards.",
    },
    {
      id: "da-project",
      title: "Data Analysis Project",
      description:
        "Complete an end-to-end data analysis project.",
    },
  ],

  "Data Science": [
    {
      id: "ds-python",
      title: "Python for Data Science",
      description:
        "Learn Python programming for data science.",
    },
    {
      id: "ds-statistics",
      title: "Statistics",
      description:
        "Learn statistical concepts used in data science.",
    },
    {
      id: "ds-numpy",
      title: "NumPy",
      description:
        "Learn numerical computing using NumPy.",
    },
    {
      id: "ds-pandas",
      title: "Pandas",
      description:
        "Clean and analyze data using Pandas.",
    },
    {
      id: "ds-visualization",
      title: "Data Visualization",
      description:
        "Visualize insights using charts and plots.",
    },
    {
      id: "ds-ml",
      title: "Machine Learning",
      description:
        "Learn core machine learning algorithms.",
    },
    {
      id: "ds-deep",
      title: "Deep Learning",
      description:
        "Learn neural networks and deep learning.",
    },
    {
      id: "ds-project",
      title: "Data Science Project",
      description:
        "Build an end-to-end data science project.",
    },
  ],

  "Full Stack": [
    {
      id: "fs-html",
      title: "HTML",
      description:
        "Learn semantic HTML and page structure.",
    },
    {
      id: "fs-css",
      title: "CSS",
      description:
        "Learn layouts, responsive design and styling.",
    },
    {
      id: "fs-js",
      title: "JavaScript",
      description:
        "Learn modern JavaScript fundamentals.",
    },
    {
      id: "fs-git",
      title: "Git and GitHub",
      description:
        "Learn version control and collaboration.",
    },
    {
      id: "fs-react",
      title: "React",
      description:
        "Build modern frontend applications.",
    },
    {
      id: "fs-node",
      title: "Node.js",
      description:
        "Build backend applications using Node.js.",
    },
    {
      id: "fs-express",
      title: "Express",
      description:
        "Create APIs and backend services.",
    },
    {
      id: "fs-database",
      title: "Databases",
      description:
        "Learn SQL and database concepts.",
    },
    {
      id: "fs-api",
      title: "REST APIs",
      description:
        "Build and consume REST APIs.",
    },
    {
      id: "fs-project",
      title: "Full Stack Project",
      description:
        "Build a complete full-stack application.",
    },
  ],
};

function RoadmapDetails() {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();

  const [roadmapData, setRoadmapData] =
    useState<Roadmap | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    console.log("Opening roadmap ID:", id);

    const saved =
      localStorage.getItem("novapath_roadmaps");

    if (!saved) {
      console.log("No roadmaps found");
      setLoading(false);
      return;
    }

    try {
      const roadmaps: Roadmap[] =
        JSON.parse(saved);

      console.log(
        "All saved roadmaps:",
        roadmaps
      );

      const found = roadmaps.find(
        (item) =>
          String(item.id) === String(id)
      );

      console.log(
        "Selected roadmap:",
        found
      );

      if (!found) {
        setLoading(false);
        return;
      }

      /*
       * IMPORTANT:
       * If topics are missing, automatically
       * load the predefined topics for that roadmap.
       */

      let topics: Topic[] = [];

      if (
        Array.isArray(found.topics) &&
        found.topics.length > 0
      ) {
        topics = found.topics;
      } else if (
        defaultTopics[found.roadmap]
      ) {
        topics =
          defaultTopics[found.roadmap];
      }

      const normalized: Roadmap = {
        ...found,

        topics,

        completedTopics:
          Array.isArray(
            found.completedTopics
          )
            ? found.completedTopics
            : [],

        progress:
          found.progress || 0,

        currentDay:
          found.currentDay || 1,
      };

      /*
       * Save repaired roadmap.
       */
      const updatedRoadmaps =
        roadmaps.map((item) =>
          String(item.id) ===
          String(found.id)
            ? normalized
            : item
        );

      localStorage.setItem(
        "novapath_roadmaps",
        JSON.stringify(
          updatedRoadmaps
        )
      );

      setRoadmapData(normalized);
    } catch (error) {
      console.error(
        "Failed to load roadmap:",
        error
      );
    }

    setLoading(false);
  }, [id]);

  const topics =
    roadmapData?.topics || [];

  const completedTopics =
    roadmapData?.completedTopics || [];

  const progress = useMemo(() => {
    if (topics.length === 0) {
      return 0;
    }

    return Math.round(
      (completedTopics.length /
        topics.length) *
        100
    );
  }, [
    topics.length,
    completedTopics.length,
  ]);

  const hoursPerDay = Math.max(
    1,
    Number(roadmapData?.hours || 2)
  );

  /*
   * 2 topics per hour.
   *
   * Example:
   * 1 hour = 2 topics/day
   * 2 hours = 4 topics/day
   * 3 hours = 6 topics/day
   */
  const tasksPerDay =
    hoursPerDay * 2;

  const currentDay =
    topics.length > 0 &&
    completedTopics.length >=
      topics.length
      ? Math.ceil(
          topics.length /
            tasksPerDay
        )
      : Math.floor(
          completedTopics.length /
            tasksPerDay
        ) + 1;

  const todayStart =
    (currentDay - 1) *
    tasksPerDay;

  const todaysTopics =
    topics.slice(
      todayStart,
      todayStart + tasksPerDay
    );

  const toggleTopic = (
    topicId: string
  ) => {
    if (!roadmapData) {
      return;
    }

    const completed =
      roadmapData.completedTopics || [];

    const isCompleted =
      completed.includes(topicId);

    const updatedCompleted =
      isCompleted
        ? completed.filter(
            (item) =>
              item !== topicId
          )
        : [
            ...completed,
            topicId,
          ];

    const updatedProgress =
      topics.length > 0
        ? Math.round(
            (updatedCompleted.length /
              topics.length) *
              100
          )
        : 0;

    const updatedRoadmap: Roadmap = {
      ...roadmapData,

      completedTopics:
        updatedCompleted,

      progress:
        updatedProgress,

      currentDay:
        Math.floor(
          updatedCompleted.length /
            tasksPerDay
        ) + 1,
    };

    const saved =
      JSON.parse(
        localStorage.getItem(
          "novapath_roadmaps"
        ) || "[]"
      );

    const updatedRoadmaps =
      saved.map(
        (item: Roadmap) =>
          String(item.id) ===
          String(roadmapData.id)
            ? updatedRoadmap
            : item
      );

    localStorage.setItem(
      "novapath_roadmaps",
      JSON.stringify(
        updatedRoadmaps
      )
    );

    setRoadmapData(
      updatedRoadmap
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">
            🗺️
          </div>

          <h2 className="text-xl font-semibold">
            Loading roadmap...
          </h2>
        </div>
      </div>
    );
  }

  if (!roadmapData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">
            😕
          </div>

          <h2 className="text-2xl font-bold">
            Roadmap not found
          </h2>

          <p className="text-slate-400 mt-2">
            This roadmap could not be found.
          </p>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-semibold"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            className="text-2xl font-bold"
          >
            NovaPath 🚀
          </button>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            className="text-slate-400 hover:text-white"
          >
            ← Dashboard
          </button>

        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="mb-8">

          <p className="text-indigo-400 text-sm font-semibold uppercase">
            {roadmapData.source ===
            "custom"
              ? "MY ROADMAP"
              : "ROADMAP.SH"}
          </p>

          <h1 className="text-4xl font-bold mt-2">
            {roadmapData.roadmap}
          </h1>

          <p className="text-slate-400 mt-2">
            Your personalized learning journey 🚀
          </p>

          {roadmapData.fileName && (
            <p className="text-slate-500 mt-2">
              📎 {roadmapData.fileName}
            </p>
          )}

        </div>

        {/* UPLOADED IMAGE */}
        {roadmapData.fileData && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

            <h2 className="text-xl font-bold mb-4">
              Uploaded Roadmap 🖼️
            </h2>

            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950">

              <img
                src={roadmapData.fileData}
                alt="Uploaded roadmap"
                className="w-full max-h-[700px] object-contain"
              />

            </div>

          </div>
        )}

        {/* PROGRESS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>
              <p className="text-slate-400 text-sm">
                Overall Progress
              </p>

              <p className="text-3xl font-bold mt-1">
                {progress}%
              </p>
            </div>

            <div>
              <p className="text-slate-400 text-sm">
                Current Day
              </p>

              <p className="text-3xl font-bold mt-1">
                Day {currentDay}
              </p>
            </div>

            <div>
              <p className="text-slate-400 text-sm">
                Study Time
              </p>

              <p className="text-3xl font-bold mt-1">
                {roadmapData.hours} hrs/day
              </p>
            </div>

          </div>

          {/* PROGRESS BAR */}
          <div className="mt-6">

            <div className="w-full bg-slate-800 rounded-full h-3">

              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

            <p className="text-sm text-slate-400 mt-2">
              {completedTopics.length} of{" "}
              {topics.length} topics completed
            </p>

          </div>

        </div>

        {/* TODAY'S PLAN */}
        {topics.length > 0 && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6 mb-8">

            <h2 className="text-xl font-bold">
              Today's Plan 🎯
            </h2>

            <p className="text-slate-400 mt-1 mb-5">
              Day {currentDay} •{" "}
              {tasksPerDay} topics
            </p>

            {todaysTopics.length === 0 ? (
              <p className="text-green-400 font-semibold">
                🎉 Roadmap completed!
              </p>
            ) : (
              <div className="space-y-2">

                {todaysTopics.map(
                  (topic) => (
                    <div
                      key={topic.id}
                      className="bg-slate-900 rounded-lg px-4 py-3"
                    >
                      {topic.title}
                    </div>
                  )
                )}

              </div>
            )}

          </div>
        )}

        {/* TOPICS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

          <div className="flex items-center justify-between mb-6">

            <div>
              <h2 className="text-2xl font-bold">
                Learning Topics 📚
              </h2>

              <p className="text-slate-400 mt-1">
                Complete the topics in sequence.
              </p>
            </div>

            <span className="text-slate-400">
              {topics.length} topics
            </span>

          </div>

          {topics.length === 0 ? (
            <div className="text-center py-12">

              <div className="text-5xl mb-4">
                🔍
              </div>

              <h3 className="text-xl font-semibold">
                No topics available
              </h3>

              <p className="text-slate-400 mt-2">
                Topics could not be generated for
                this roadmap.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {topics.map(
                (topic, index) => {

                  const isCompleted =
                    completedTopics.includes(
                      topic.id
                    );

                  return (
                    <div
                      key={topic.id}
                      className={`flex gap-4 p-5 rounded-xl border transition ${
                        isCompleted
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-slate-800 bg-slate-950"
                      }`}
                    >

                      {/* NUMBER */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCompleted
                            ? "bg-green-600"
                            : "bg-indigo-600"
                        }`}
                      >
                        {isCompleted
                          ? "✓"
                          : index + 1}
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1">

                        <h3
                          className={`text-lg font-semibold ${
                            isCompleted
                              ? "text-green-400 line-through"
                              : "text-white"
                          }`}
                        >
                          {topic.title}
                        </h3>

                        <p className="text-slate-400 mt-1">
                          {topic.description}
                        </p>

                      </div>

                      {/* BUTTON */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleTopic(
                            topic.id
                          )
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-semibold self-center transition ${
                          isCompleted
                            ? "bg-green-600/20 text-green-400"
                            : "bg-indigo-600 hover:bg-indigo-500"
                        }`}
                      >
                        {isCompleted
                          ? "Completed ✓"
                          : "Complete"}
                      </button>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </main>
    </div>
  );
}

export default RoadmapDetails;