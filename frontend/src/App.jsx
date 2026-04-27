import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import RideStatusDisplay from "./components/RideStatusDisplay";
import AdminPanel from "./components/AdminPanel";
import Recommendations from "./components/Recommendations";

function AppContent() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = React.useState("user");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return null; // Auth pages handled by Router
  }

  // Only show admin panel for admins
  const isAdmin = user.role === "admin";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Top nav */}
      <nav style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 56,
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#4f46e5", marginRight: 16 }}>🎡 SmartQueue</span>
          {isAdmin && (
            <>
              {[["user", "🎢 Ride Status"], ["admin", "⚙️ Admin Panel"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{
                  padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 14,
                  background: tab === key ? "#4f46e5" : "transparent",
                  color: tab === key ? "#fff" : "#555",
                }}>
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#555", fontSize: 14 }}>👤 {user.name}</span>
          <button onClick={handleLogout} style={{
            padding: "6px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
            cursor: "pointer", fontWeight: 600, fontSize: 14,
            background: "#fff", color: "#d32f2f",
            transition: "all 0.3s"
          }}
            onMouseEnter={(e) => e.target.style.background = "#fee"}
            onMouseLeave={(e) => e.target.style.background = "#fff"}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      {isAdmin ? (
        // Admin view with tabs
        tab === "user" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "20px",
              padding: "20px",
              alignItems: "start"
            }}
          >
            <RideStatusDisplay />
            <Recommendations />
          </div>
        ) : (
          <AdminPanel />
        )
      ) : (
        // Customer view (only ride status and recommendations)
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
            padding: "20px",
            alignItems: "start"
          }}
        >
          <RideStatusDisplay />
          <Recommendations />
        </div>
      )}
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