import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type ProfileData = {
  name: string;
  careerGoal: string;
  skillLevel: string;
};

function Profile() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [skillLevel, setSkillLevel] = useState("Beginner");

  const [saved, setSaved] = useState(false);

  // ================= LOAD PROFILE =================

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("novapath_profile");

      if (savedProfile) {
        const profile: ProfileData = JSON.parse(savedProfile);

        setName(profile.name || "");
        setCareerGoal(profile.careerGoal || "");
        setSkillLevel(profile.skillLevel || "Beginner");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  // ================= SAVE PROFILE =================

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const profile: ProfileData = {
      name: name.trim(),
      careerGoal: careerGoal.trim(),
      skillLevel,
    };

    localStorage.setItem(
      "novapath_profile",
      JSON.stringify(profile)
    );

    setSaved(true);

    setTimeout(() => {
      navigate("/dashboard");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* ================= HEADER ================= */}

        <div className="text-center mb-8">

          <h1 className="text-4xl font-bold text-white">
            NovaPath 🚀
          </h1>

          <p className="text-slate-400 mt-2">
            Personalize your learning journey
          </p>

        </div>

        {/* ================= CARD ================= */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">

          <h2 className="text-2xl font-semibold text-white mb-2">
            Your Profile 👤
          </h2>

          <p className="text-slate-400 mb-6">
            Tell us about yourself so NovaPath can personalize
            your learning experience.
          </p>

          <form
            onSubmit={handleSaveProfile}
            className="space-y-5"
          >

            {/* ================= NAME ================= */}

            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Your Name
              </label>

              <input
                type="text"
                placeholder="e.g. Srusti"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>

            {/* ================= CAREER ================= */}

            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Career Goal
              </label>

              <input
                type="text"
                placeholder="e.g. AI/ML Engineer"
                value={careerGoal}
                onChange={(e) =>
                  setCareerGoal(e.target.value)
                }
                required
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

            </div>

            {/* ================= SKILL LEVEL ================= */}

            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Current Skill Level
              </label>

              <select
                value={skillLevel}
                onChange={(e) =>
                  setSkillLevel(e.target.value)
                }
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >

                <option value="Beginner">
                  Beginner
                </option>

                <option value="Intermediate">
                  Intermediate
                </option>

                <option value="Advanced">
                  Advanced
                </option>

              </select>

            </div>

            {/* ================= SUCCESS ================= */}

            {saved && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm">
                ✓ Profile saved successfully!
              </div>
            )}

            {/* ================= SAVE ================= */}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
            >
              Save Profile 🚀
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}
export default Profile;