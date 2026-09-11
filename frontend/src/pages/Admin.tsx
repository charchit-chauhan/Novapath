import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  fetchAdminUsers,
  fetchAdminStats,
  updateUserRole,
  deleteAdminUser,
  type AuthUser,
  type AdminStats,
} from "../api/client";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Admin() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function loadData() {
    try {
      const [u, s] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminStats(),
      ]);
      setUsers(u);
      setStats(s);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRoleToggle(target: AuthUser) {
    const nextRole = target.role === "admin" ? "student" : "admin";
    const confirmMsg =
      nextRole === "admin"
        ? `Grant admin access to ${target.name}?`
        : `Revoke admin access from ${target.name}?`;

    if (!window.confirm(confirmMsg)) return;

    setError("");
    setBusyUserId(target.id);

    try {
      const updated = await updateUserRole(target.id, nextRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      const s = await fetchAdminStats();
      setStats(s);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update user role."
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDelete(target: AuthUser) {
    if (
      !window.confirm(
        `Permanently delete ${target.name} (${target.email})? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setBusyUserId(target.id);

    try {
      await deleteAdminUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      const s = await fetchAdminStats();
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel 🛡️</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Full administrative control: registered users, roles, and
            platform-wide AI feature usage. Only accounts that log in
            through the Admin window can reach this page.
          </p>
        </div>

        {error && (
          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total users" value={stats.totalUsers} />
                <StatCard label="Admins" value={stats.totalAdmins} />
                <StatCard
                  label="Mentor messages"
                  value={stats.mentorMessages}
                />
                <StatCard
                  label="Career guidance runs"
                  value={stats.careerGuidanceRuns}
                />
              </div>
            )}

            <div className="rounded-2xl border border-white/5 bg-[#0b1020] overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h2 className="font-semibold">Registered users</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Career goal</th>
                      <th className="px-5 py-3">Joined</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const isBusy = busyUserId === u.id;

                      return (
                        <tr key={u.id}>
                          <td className="px-5 py-3 text-white">
                            {u.name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500">
                                you
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {u.email}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                u.role === "admin"
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-white/5 text-slate-400"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {u.careerGoal || "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={isSelf || isBusy}
                                onClick={() => handleRoleToggle(u)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                title={
                                  isSelf
                                    ? "You cannot change your own role"
                                    : undefined
                                }
                              >
                                {u.role === "admin"
                                  ? "Revoke admin"
                                  : "Make admin"}
                              </button>

                              <button
                                type="button"
                                disabled={isSelf || isBusy}
                                onClick={() => handleDelete(u)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                title={
                                  isSelf
                                    ? "You cannot delete your own account"
                                    : undefined
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-4">
              Note: this demo stores accounts and stats in a local JSON file
              on the backend server, so it lists everyone who has signed up
              against this backend instance. Admins cannot change their own
              role or delete their own account, to avoid accidentally
              locking everyone out.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default Admin;
