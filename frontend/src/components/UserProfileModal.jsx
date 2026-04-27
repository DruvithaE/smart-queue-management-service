import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const BASE_URL = `http://localhost:${process.env.REACT_APP_BACKEND_PORT || 3000}`;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

const STATUS_COLORS = {
  ACTIVE:    { bg: "#dcfce7", color: "#15803d" },
  COMPLETED: { bg: "#e0e7ff", color: "#4338ca" },
  LEFT:      { bg: "#fee2e2", color: "#b91c1c" },
};

export default function UserProfileModal({ onClose }) {
  const { user, token } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/users/ride-history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load ride history");
        setLoading(false);
      });
  }, [token]);

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center"
      }}
    >
      {/* Modal box — stop click from closing when clicking inside */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520,
          maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'Segoe UI', sans-serif"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #f1f5f9",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>👤 My Profile</div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 20,
            cursor: "pointer", color: "#888", lineHeight: 1
          }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* User details card */}
          <div style={{
            background: "#f8fafc", borderRadius: 12, padding: "16px 20px",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Full Name", user?.name],
                ["Email", user?.email],
                ["Role", user?.role?.toUpperCase()],
                ["Member Since", formatDate(user?.created_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase",
                    letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ride history */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 12 }}>
              🎢 Ride History
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: 24, color: "#888" }}>Loading...</div>
            )}

            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c",
                padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                {error}
              </div>
            )}

            {!loading && !error && history.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: "#aaa", fontSize: 14 }}>
                No ride history yet. Join a queue to get started!
              </div>
            )}

            {!loading && history.map(entry => {
              const statusCfg = STATUS_COLORS[entry.status] || { bg: "#f4f4f5", color: "#555" };
              return (
                <div key={entry.id} style={{
                  background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10,
                  padding: "12px 16px", marginBottom: 10,
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                      {entry.ride_name}
                      {entry.priority && (
                        <span style={{ marginLeft: 6, fontSize: 11, background: "#fef9c3",
                          color: "#a16207", borderRadius: 999, padding: "2px 8px" }}>
                          ⚡ Fast Pass
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                      {formatDate(entry.joined_at)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, borderRadius: 999,
                    padding: "4px 10px", background: statusCfg.bg, color: statusCfg.color
                  }}>
                    {entry.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}