import React, { useEffect, useState, useCallback } from "react";
import { getRecommendations } from "../api";

const Recommendations = () => {
  const [rides, setRides] = useState([]);
  const [strategy, setStrategy] = useState("BALANCED");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRecommendations(strategy);
      setRides(data.recommendations || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
    } finally {
      setLoading(false);
    }
  }, [strategy]);

  useEffect(() => {
    // Initial fetch
    fetchRecommendations();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchRecommendations, 10000);

    // Cleanup
    return () => clearInterval(interval);
  }, [fetchRecommendations]);

  // Only show OPEN rides
  const visibleRides = rides.filter((r) => r.status === "OPEN");

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        height: "fit-content",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "12px" }}>
        <h3 style={{ margin: 0 }}>Recommended Rides</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          Optimized based on wait time & crowd levels
        </p>
        <p style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
          Last updated:{" "}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : "--"}
        </p>
      </div>

      {/* Strategy Selector */}
      <select
        value={strategy}
        onChange={(e) => setStrategy(e.target.value)}
        style={{
          marginBottom: "14px",
          padding: "6px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          width: "100%",
        }}
      >
        <option value="BALANCED">Balanced (Recommended)</option>
        <option value="LOW_WAIT">Low Wait Time</option>
        <option value="POPULAR">Popular Rides</option>
      </select>

      {/* Content */}
      {loading ? (
        <p style={{ color: "#888" }}>Loading recommendations...</p>
      ) : visibleRides.length === 0 ? (
        <p style={{ color: "#888" }}>No recommendations available</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {visibleRides.map((ride, index) => (
            <li
              key={ride.id}
              style={{
                padding: "12px",
                marginBottom: "8px",
                borderRadius: "8px",
                background: index === 0 ? "#eef6ff" : "#fafafa",
                border:
                  index === 0
                    ? "1px solid #4f46e5"
                    : "1px solid #eee",
                transition: "0.2s",
              }}
            >
              {/* Ride Name */}
              <div style={{ fontWeight: "600" }}>
                {index === 0 && "⭐ "}
                {ride.name}
              </div>

              {/* Info */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#555",
                  marginTop: "4px",
                }}
              >
                ⏱ {ride.waitTime} mins &nbsp; | &nbsp; 👥{" "}
                {ride.queueLength} in queue
              </div>

              {/* Why Recommended */}
              <div
                style={{
                  fontSize: "11px",
                  color: "#777",
                  marginTop: "4px",
                }}
              >
                {index === 0
                  ? "Best choice right now based on minimal wait and balanced crowd"
                  : "Good option with manageable wait time"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Recommendations;