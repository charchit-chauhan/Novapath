import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { LoginPortal } from "../api/client";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [portal, setPortal] = useState<LoginPortal>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = portal === "admin";

  function switchPortal(next: LoginPortal) {
    if (next === portal) return;
    setPortal(next);
    setError("");
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password, portal);

      // The backend already refuses admin-portal logins for non-admin
      // accounts, but we double-check here so the UI never routes a
      // non-admin into the admin area.
      if (portal === "admin" && user.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }

      navigate(portal === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            NovaPath 🚀
          </h1>

          <p className="text-slate-400 mt-2">
            {isAdmin ? "Sign in to manage the platform" : "Continue your learning journey"}
          </p>
        </div>

        {/* Portal Switch */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 mb-6">
          <button
            type="button"
            onClick={() => switchPortal("student")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
              !isAdmin
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🎓 Student Login
          </button>

          <button
            type="button"
            onClick={() => switchPortal("admin")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
              isAdmin
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🛡️ Admin Login
          </button>
        </div>

        {/* Login Card */}
        <div
          className={`bg-slate-900 border rounded-2xl p-8 shadow-xl transition-colors ${
            isAdmin ? "border-amber-500/30" : "border-slate-800"
          }`}
        >

          <h2 className="text-2xl font-semibold text-white mb-2">
            {isAdmin ? "Admin Portal" : "Welcome back!"}
          </h2>

          <p className="text-slate-400 mb-6">
            {isAdmin
              ? "Restricted access. Only admin accounts can sign in here."
              : "Login to continue learning."}
          </p>

          {isAdmin && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg px-4 py-3 text-xs mb-5">
              This window is for platform administrators only. Student
              accounts will be rejected automatically.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                {isAdmin ? "Admin Email" : "Email"}
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg bg-slate-800 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                  isAdmin
                    ? "border-slate-700 focus:ring-amber-500"
                    : "border-slate-700 focus:ring-indigo-500"
                }`}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg bg-slate-800 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                  isAdmin
                    ? "border-slate-700 focus:ring-amber-500"
                    : "border-slate-700 focus:ring-indigo-500"
                }`}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg disabled:opacity-50 font-semibold transition ${
                isAdmin
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {loading
                ? "Logging in…"
                : isAdmin
                ? "Login as Admin"
                : "Login"}
            </button>

          </form>

          {!isAdmin && (
            <p className="text-center text-slate-400 text-sm mt-6">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-indigo-400 hover:text-indigo-300"
              >
                Sign up
              </Link>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

export default Login;
