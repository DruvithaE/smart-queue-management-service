// src/components/RideStatusDisplay.jsx
// User-facing: shows all rides with live status, capacity, and wait info

import { useEffect, useState } from "react";
import { getAllRides } from "../api";

const STATUS_CONFIG = {
  OPEN:        { label: "Open",        bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  CLOSED:      { label: "Closed",      bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
  MAINTENANCE: { label: "Maintenance", bg: "#fef9c3", color: "#a16207", dot: "#eab308" },
  FULL:        { label: "Full",        bg: "#ffedd5", color: "#c2410c", dot: "#f97316" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.CLOSED;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: cfg.bg, color: cfg.color,
      borderRadius: 999, padding: "4px 12px", fontWeight: 700, fontSize: 13,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: cfg.dot,
        boxShadow: status === "OPEN" ? `0 0 6px ${cfg.dot}` : "none",
        animation: status === "OPEN" ? "pulse 1.5s infinite" : "none",
      }} />
      {cfg.label}
    </span>
  );
}

function RideCard({ ride }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: "20px 24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #f0f0f0",
      display: "flex", flexDirection: "column", gap: 12,
      opacity: ride.status === "CLOSED" ? 0.65 : 1,
      transition: "transform 0.2s",
    }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: "#111", marginBottom: 2 }}>
            {ride.name}
          </div>
          {ride.description && (
            <div style={{ fontSize: 13, color: "#888" }}>{ride.description}</div>
          )}
        </div>
        <StatusBadge status={ride.status} />
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5" }}>{ride.capacity}</div>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Capacity / Cycle
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0891b2" }}>{ride.duration} min</div>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Cycle Duration
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>#{ride.id}</div>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Ride ID
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RideStatusDisplay() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const loadRides = async () => {
    try {
      setLoading(true);
      const data = await getAllRides();
      setRides(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRides();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRides, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "ALL" ? rides : rides.filter(r => r.status === filter);
  const counts = Object.fromEntries(
    ["OPEN", "CLOSED", "MAINTENANCE", "FULL"].map(s => [s, rides.filter(r => r.status === s).length])
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#111" }}>🎢 Ride Status</h2>
        <p style={{ margin: "6px 0 0", color: "#666", fontSize: 14 }}>
          Live status — refreshes every 30 seconds
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[["ALL", rides.length, "#4f46e5"], ["OPEN", counts.OPEN, "#16a34a"],
          ["FULL", counts.FULL, "#ea580c"], ["MAINTENANCE", counts.MAINTENANCE, "#ca8a04"],
          ["CLOSED", counts.CLOSED, "#dc2626"]].map(([key, count, col]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "7px 16px", borderRadius: 999, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13,
            background: filter === key ? col : "#f4f4f5",
            color: filter === key ? "#fff" : "#555",
            transition: "all 0.15s",
          }}>
            {key} ({count})
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "#888" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #e5e7eb",
            borderTopColor: "#4f46e5", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          Loading rides...
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "14px 18px", borderRadius: 10 }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {filtered.length === 0
            ? <div style={{ color: "#888", gridColumn: "1/-1", textAlign: "center", padding: 32 }}>
                No rides match this filter.
              </div>
            : filtered.map(ride => <RideCard key={ride.id} ride={ride} />)
          }
        </div>
      )}
    </div>
  );
}