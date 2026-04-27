// src/components/AdminPanel.jsx
// Admin panel: view analytics dashboard, change ride status, add/delete rides

import { useEffect, useState } from "react";
import {
  getAdminDashboard,
  updateRideStatus,
  createRide,
  deleteRide,
  searchQueueEntriesByUserId,
  adminRemoveQueueEntry,
} from "../api";

const STATUSES = ["OPEN", "CLOSED", "MAINTENANCE", "FULL"];

const STATUS_COLORS = {
  OPEN: "#16a34a", CLOSED: "#dc2626", MAINTENANCE: "#ca8a04", FULL: "#ea580c"
};

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "18px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0",
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function AddRideForm({ onAdd }) {
  const [form, setForm] = useState({ name: "", description: "", capacity: "", duration: "", status: "OPEN" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.capacity || !form.duration) {
      setErr("Name, capacity and duration are required.");
      return;
    }
    try {
      setLoading(true);
      await createRide({ ...form, capacity: Number(form.capacity), duration: Number(form.duration) });
      setForm({ name: "", description: "", capacity: "", duration: "", status: "OPEN" });
      setErr("");
      onAdd();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px" }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#1e293b" }}>➕ Add New Ride</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <input placeholder="Ride Name *" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <input placeholder="Description (optional)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
        </div>
        <input placeholder="Capacity (people/cycle) *" type="number" value={form.capacity}
          onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} style={inputStyle} />
        <input placeholder="Duration (minutes/cycle) *" type="number" step="0.1" value={form.duration}
          onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} style={inputStyle} />
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          style={{ ...inputStyle }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {err && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{err}</div>}
      <button onClick={handleSubmit} disabled={loading} style={{
        marginTop: 14, padding: "9px 22px", background: "#4f46e5", color: "#fff",
        border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
        opacity: loading ? 0.6 : 1,
      }}>
        {loading ? "Adding..." : "Add Ride"}
      </button>
    </div>
  );
}

function RideRow({ ride, onStatusChange, onDelete }) {
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: ride.name,
    description: ride.description || "",
    capacity: ride.capacity,
    duration: ride.duration,
    status: ride.status, // ✅ now included
  });

  const handleDelete = async () => {
    if (!window.confirm(`Delete ride "${ride.name}"?`)) return;
    await deleteRide(ride.id);
    onDelete();
  };

  const handleSave = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`http://localhost:${process.env.REACT_APP_BACKEND_PORT}/rides/${ride.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          capacity: Number(form.capacity),
          duration: Number(form.duration),
          status: form.status,
        }),
      });

      const data = await res.json();   // ✅ ADD THIS
      console.log("UPDATED:", data);   // ✅ ADD THIS

      setEditing(false);
      onStatusChange();
    } catch (e) {
      console.error(e);
      alert("Backend not reachable or API missing");
    } finally {
      setUpdating(false);
    }
  };

  const inputStyle = {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    width: "100%",
  };

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{ride.id}</td>

      <td style={{ padding: "12px 16px" }}>
        {editing ? (
          <input value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={inputStyle} />
        ) : ride.name}
      </td>

      <td style={{ padding: "12px 16px" }}>
        {editing ? (
          <input type="number"
            value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
            style={inputStyle} />
        ) : <span style={{ color: "#4f46e5", fontWeight: 700 }}>{ride.capacity}</span>}
      </td>

      <td style={{ padding: "12px 16px" }}>
        {editing ? (
          <input type="number" step="0.1"
            value={form.duration}
            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
            style={inputStyle} />
        ) : <span style={{ color: "#0891b2", fontWeight: 700 }}>{ride.duration} min</span>}
      </td>

      {/* ✅ STATUS now editable but NOT saved instantly */}
      <td style={{ padding: "12px 16px" }}>
        {editing ? (
          <select value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            style={{
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontWeight: 700,
              fontSize: 13,
            }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <span style={{
            background: STATUS_COLORS[ride.status] + "20",
            color: STATUS_COLORS[ride.status],
            padding: "4px 10px",
            borderRadius: 8,
            fontWeight: 700,
          }}>
            {ride.status}
          </span>
        )}
      </td>

      <td style={{ padding: "12px 16px", display: "flex", gap: 6 }}>
        {editing ? (
          <button onClick={handleSave} disabled={updating}
            style={{ background: "#dcfce7", color: "#16a34a", border: "none",
              borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
            Save
          </button>
        ) : (
          <button onClick={() => setEditing(true)}
            style={{ background: "#e0e7ff", color: "#4f46e5", border: "none",
              borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
            Edit
          </button>
        )}

        <button onClick={handleDelete}
          style={{ background: "#fee2e2", color: "#dc2626", border: "none",
            borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
          Delete
        </button>
      </td>
    </tr>
  );
}
function QueueModeration({ rides }) {
  const [queryUserId, setQueryUserId] = useState("");
  const [selectedRideId, setSelectedRideId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const runSearch = async (override = {}) => {
    const searchTerm =
      override.searchTerm !== undefined ? override.searchTerm : queryUserId.trim();
    const rideFilter =
      override.rideId !== undefined ? override.rideId : selectedRideId;

    setLoading(true);
    setError("");
    setActionMessage("");

    try {
      const data = await searchQueueEntriesByUserId(
        searchTerm,
        rideFilter ? Number(rideFilter) : null,
        100
      );
      setEntries(data.entries || []);
    } catch (e) {
      setError(e.message || "Search failed");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (rideId, userId) => {
    const ok = window.confirm(
      `Remove user '${userId}' from ride ${rideId} queue?`
    );
    if (!ok) {
      return;
    }

    setError("");
    setActionMessage("");

    try {
      await adminRemoveQueueEntry(rideId, userId);
      setActionMessage(`Removed ${userId} from ride ${rideId} queue.`);
      await runSearch();
    } catch (e) {
      setError(e.message || "Failed to remove user from queue");
    }
  };

  useEffect(() => {
    runSearch();
  }, []);

  useEffect(() => {
    runSearch({ rideId: selectedRideId });
  }, [selectedRideId]);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      border: "1px solid #f0f0f0",
      overflow: "hidden",
      marginBottom: 24,
    }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Queue Moderation</div>
        <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
          Search by user ID, name, or email. Leave blank to list all active queue entries.
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1.5fr 1fr auto", gap: 10, alignItems: "center" }}>
        <input
          value={queryUserId}
          onChange={(e) => setQueryUserId(e.target.value)}
          placeholder="Search user ID, name, or email"
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        <select
          value={selectedRideId}
          onChange={(e) => setSelectedRideId(e.target.value)}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            background: "#fff",
          }}
        >
          <option value="">All rides</option>
          {rides.map((ride) => (
            <option key={ride.id} value={ride.id}>
              {ride.id} - {ride.name}
            </option>
          ))}
        </select>

        <button
          onClick={runSearch}
          disabled={loading}
          style={{
            padding: "9px 14px",
            background: "#0f766e",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", fontSize: 13, padding: "0 20px 10px" }}>{error}</div>}
      {actionMessage && <div style={{ color: "#166534", fontSize: 13, padding: "0 20px 10px" }}>{actionMessage}</div>}

      <div style={{ overflowX: "auto", padding: "0 0 8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#555" }}>
              {["Ride", "User", "Priority", "Position", "Joined", "Action"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                  No active queue entries found.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.entryId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px" }}>
                    {entry.rideId} - {entry.rideName}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 12 }}>{entry.userId}</div>
                    {(entry.userName || entry.userEmail) && (
                      <div style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>
                        {entry.userName || "Unknown"}
                        {entry.userEmail ? ` (${entry.userEmail})` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>{entry.isPriority ? "FAST PASS" : "REGULAR"}</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700 }}>{entry.position}</td>
                  <td style={{ padding: "10px 16px" }}>
                    {new Date(entry.joinedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <button
                      onClick={() => handleRemove(entry.rideId, entry.userId)}
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: 6,
                        padding: "5px 10px",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default function AdminPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getAdminDashboard();
      setDashboard(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", padding: 40, textAlign: "center", color: "#888" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #e5e7eb",
        borderTopColor: "#4f46e5", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
      Loading dashboard...
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", padding: 40 }}>
      <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "14px 18px", borderRadius: 10 }}>
        ⚠️ Cannot connect to backend: {error}
        <br /><small>Make sure FastAPI is running on http://localhost:8000</small>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#faf7f7ff" }}>ADMIN DASHBOARD</h2>
        <p style={{ margin: "6px 0 0", color: "#f3efefff", fontSize: 14 }}>Ride management & analytics</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Rides" value={dashboard.total_rides} color="#4f46e5" />
        <StatCard label="Open" value={dashboard.open_rides} color="#16a34a" />
        <StatCard label="Full" value={dashboard.full_rides} color="#ea580c" />
        <StatCard label="Maintenance" value={dashboard.maintenance_rides} color="#ca8a04" />
        <StatCard label="Closed" value={dashboard.closed_rides} color="#dc2626" />
        <StatCard label="Total Capacity" value={dashboard.total_capacity} color="#0891b2" />
      </div>

      {/* Add ride form */}
      <div style={{ marginBottom: 24 }}>
        <AddRideForm onAdd={load} />
      </div>

      <QueueModeration rides={dashboard.rides || []} />

      {/* Rides table */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 15 }}>
          All Rides ({dashboard.total_rides})
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#555" }}>
                {["ID", "Name", "Capacity", "Duration", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 12,
                    textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.rides.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>
                  No rides yet. Add one above.
                </td></tr>
              ) : (
                dashboard.rides.map(ride => (
                  <RideRow key={ride.id} ride={ride} onStatusChange={load} onDelete={load} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}