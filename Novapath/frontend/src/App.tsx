import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import AddRoadmap from "./pages/AddRoadmap";
import RoadmapDetails from "./pages/RoadmapDetails";
import PersonalizedLearning from "./pages/PersonalizedLearning";
import SkillAssessment from "./pages/SkillAssessment";
import TopicQuiz from "./pages/TopicQuiz";
import DailyQuiz from "./pages/DailyQuiz";
import Mentor from "./pages/Mentor";
import Analytics from "./pages/Analytics";
import Revision from "./pages/Revision";
import CareerGuidance from "./pages/CareerGuidance";
import Admin from "./pages/Admin";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Default Route */}
          <Route
            path="/"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

          {/* Authentication */}
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<Signup />}
          />

          {/* User Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Add Roadmap */}
          <Route
            path="/add-roadmap"
            element={
              <ProtectedRoute>
                <AddRoadmap />
              </ProtectedRoute>
            }
          />

          {/* Roadmap Details */}
          <Route
            path="/roadmap-details/:id"
            element={
              <ProtectedRoute>
                <RoadmapDetails />
              </ProtectedRoute>
            }
          />

          {/* Personalized Learning */}
          <Route
            path="/personalized-learning"
            element={
              <ProtectedRoute>
                <PersonalizedLearning />
              </ProtectedRoute>
            }
          />

          {/* AI Skill Assessment */}
          <Route
            path="/skill-assessment"
            element={
              <ProtectedRoute>
                <SkillAssessment />
              </ProtectedRoute>
            }
          />

          {/* Topic-wise Quiz */}
          <Route
            path="/topic-quiz"
            element={
              <ProtectedRoute>
                <TopicQuiz />
              </ProtectedRoute>
            }
          />

          {/* Daily Quiz */}
          <Route
            path="/daily-quiz"
            element={
              <ProtectedRoute>
                <DailyQuiz />
              </ProtectedRoute>
            }
          />

          {/* AI Mentor */}
          <Route
            path="/mentor"
            element={
              <ProtectedRoute>
                <Mentor />
              </ProtectedRoute>
            }
          />

          {/* Progress & Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* Smart Revision */}
          <Route
            path="/revision"
            element={
              <ProtectedRoute>
                <Revision />
              </ProtectedRoute>
            }
          />

          {/* AI Career Guidance */}
          <Route
            path="/career-guidance"
            element={
              <ProtectedRoute>
                <CareerGuidance />
              </ProtectedRoute>
            }
          />

          {/* Admin Panel */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* Unknown Routes */}
          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
