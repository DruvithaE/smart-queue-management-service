import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import RideStatusDisplay from "./components/RideStatusDisplay";
import AdminPanel from "./components/AdminPanel";
import Recommendations from "./components/Recommendations";
import NotificationPanel from "./components/NotificationPanel";
import "./App.css";
import UserProfile from "./components/UserProfile";

function AppContent() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("user");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="app-background">
      <div
        className="app-content"
        style={{ minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif" }}
      >
        <NotificationPanel />

        <nav
          style={{
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 56,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: "#4f46e5",
                marginRight: 16,
              }}
            >
              🎡 SmartQueue
            </span>

            {(isAdmin
              ? [
                  ["user", "🎢 Ride Status"],
                  ["admin", "⚙️ Admin Panel"],
                ]
              : [
                  ["user", "🎢 Ride Status"],
                  // ["profile", "👤 Profile"],
                ]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "6px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  background: tab === key ? "#4f46e5" : "transparent",
                  color: tab === key ? "#fff" : "#555",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (tab !== key) {
                    e.target.style.background = "#eef2ff";
                    e.target.style.color = "#4f46e5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (tab !== key) {
                    e.target.style.background = "transparent";
                    e.target.style.color = "#555";
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
  onClick={() => setTab("profile")}
  style={{
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#4f46e5",
    fontWeight: 600,
    fontSize: 14,
  }}
>
  👤 {user.name}
</button>

            <button
              onClick={handleLogout}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                background: "#fff",
                color: "#d32f2f",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#fee")}
              onMouseLeave={(e) => (e.target.style.background = "#fff")}
            >
              Logout
            </button>
          </div>
        </nav>

        {isAdmin ? (
          tab === "user" ? (
            <MainLayout />
          ) : (
            <AdminPanel />
          )
        ) : tab === "profile" ? (
          <UserProfile />
        ) : (
          <MainLayout />
        )}
      </div>
    </div>
  );
}

function MainLayout() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "3fr 1.2fr",
        gap: "20px",
        padding: "20px",
        alignItems: "start",
      }}
    >
      <div>
        <RideStatusDisplay />
      </div>

      <div
        style={{
          position: "sticky",
          top: "80px",
          maxHeight: "calc(100vh - 100px)",
          overflowY: "auto",
        }}
      >
        <Recommendations />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppContent />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}