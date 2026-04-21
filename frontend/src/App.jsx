// src/App.jsx
import { useState } from "react";
import RideStatusDisplay from "./components/RideStatusDisplay";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [tab, setTab] = useState("user");

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Top nav */}
      <nav style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "0 24px", display: "flex", alignItems: "center", gap: 8, height: 56,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: "#4f46e5", marginRight: 16 }}>🎡 SmartQueue</span>
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
      </nav>

      {tab === "user" ? <RideStatusDisplay /> : <AdminPanel />}
    </div>
  );
}