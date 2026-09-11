import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginRequest,
  signupRequest,
  fetchCurrentUser,
  type AuthUser,
  type LoginPortal,
} from "../api/client";

const AUTH_KEY = "novapath_auth";

type StoredAuth = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    portal?: LoginPortal
  ) => Promise<AuthUser>;
  signup: (
    name: string,
    email: string,
    password: string,
    careerGoal?: string,
    skillLevel?: string
  ) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAuth(auth: StoredAuth | null) {
  if (!auth) {
    localStorage.removeItem(AUTH_KEY);
  } else {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();

    if (stored) {
      setToken(stored.token);
      setUser(stored.user);

      // Validate the token against the backend in the background.
      fetchCurrentUser(stored.token)
        .then((freshUser) => {
          setUser(freshUser);
          writeStoredAuth({ token: stored.token, user: freshUser });
        })
        .catch(() => {
          // Token invalid/expired — sign the user out quietly.
          writeStoredAuth(null);
          setUser(null);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(
    email: string,
    password: string,
    portal: LoginPortal = "student"
  ) {
    const { token: newToken, user: newUser } = await loginRequest(
      email,
      password,
      portal
    );

    setToken(newToken);
    setUser(newUser);
    writeStoredAuth({ token: newToken, user: newUser });

    return newUser;
  }

  async function signup(
    name: string,
    email: string,
    password: string,
    careerGoal?: string,
    skillLevel?: string
  ) {
    const { token: newToken, user: newUser } = await signupRequest(
      name,
      email,
      password,
      careerGoal,
      skillLevel
    );

    setToken(newToken);
    setUser(newUser);
    writeStoredAuth({ token: newToken, user: newUser });

    return newUser;
  }

  function logout() {
    setToken(null);
    setUser(null);
    writeStoredAuth(null);
  }

  async function refreshUser() {
    if (!token) return;
    const freshUser = await fetchCurrentUser(token);
    setUser(freshUser);
    writeStoredAuth({ token, user: freshUser });
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
