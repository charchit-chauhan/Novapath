import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGamificationStats } from "../lib/gamification";
import { getNotifications, type NotificationItem } from "../lib/notifications";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "🗺️" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/revision", label: "Revision", icon: "🧠" },
  { to: "/mentor", label: "AI Mentor", icon: "💬" },
  { to: "/career-guidance", label: "Career Guidance", icon: "🎯" },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const stats = getGamificationStats();
    setLevel(stats.level);
    setStreak(stats.streak);
    setNotifications(getNotifications());
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#070b14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              🚀
            </div>
            <div className="text-left hidden sm:block">
              <h1 className="font-bold text-lg tracking-tight text-white">
                NovaPath
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                AI Learning
              </p>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {LINKS.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  location.pathname === link.to
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {link.icon} {link.label}
              </button>
            ))}
            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/admin")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  location.pathname === "/admin"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                🛡️ Admin
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
              <span>⭐ Lv.{level}</span>
              <span className="text-slate-600">•</span>
              <span>🔥 {streak}d</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative w-10 h-10 rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/50 transition flex items-center justify-center"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] flex items-center justify-center text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-white/10 bg-[#0b1020] shadow-2xl p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500 px-1">
                    Notifications
                  </p>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-400 px-1 py-2">
                      You're all caught up 🎉
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/5"
                      >
                        <p className="text-sm font-medium text-white">
                          {n.icon} {n.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/50 transition flex items-center justify-center"
              title={user?.name}
            >
              👤
            </button>

            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="hidden sm:flex px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-sm text-slate-300"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-1 mt-3 overflow-x-auto pb-1">
          {LINKS.concat(
            user?.role === "admin"
              ? [{ to: "/admin", label: "Admin", icon: "🛡️" }]
              : []
          ).map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                location.pathname === link.to
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 bg-white/5"
              }`}
            >
              {link.icon} {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
