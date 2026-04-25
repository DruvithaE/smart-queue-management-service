// src/api.js
// Central place for all ride service API calls

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${url}, got '${contentType || "unknown content type"}'`
    );
  }

  return res.json();
}

export async function getAllRides() {
  return fetchJson(`${BASE_URL}/rides/`);
}

export async function getRideById(rideId) {
  return fetchJson(`${BASE_URL}/rides/${rideId}`);
}

export async function updateRideStatus(rideId, status) {
  return fetchJson(`${BASE_URL}/rides/${rideId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function createRide(rideData) {
  return fetchJson(`${BASE_URL}/rides/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rideData),
  });
}

export async function deleteRide(rideId) {
  const res = await fetch(`${BASE_URL}/rides/${rideId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete ride");
}

export async function getAdminDashboard() {
  return fetchJson(`${BASE_URL}/admin/dashboard`);
}

export async function getPredictedWaitTime(rideId) {
  return fetchJson(`${BASE_URL}/api/wait-time/predict?rideId=${rideId}`);
}

export async function joinQueue(rideId, userId, fastPass = false) {
  return fetchJson(`${BASE_URL}/queue/joinQueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rideId, userId, fastPass }),
  });
}

export async function leaveQueue(rideId, userId) {
  return fetchJson(`${BASE_URL}/queue/leaveQueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rideId, userId }),
  });
}

export async function getQueueStatus(rideId, userId) {
  const query = new URLSearchParams({ rideId: String(rideId) });
  if (userId) query.set("userId", userId);
  return fetchJson(`${BASE_URL}/queue/queueStatus?${query.toString()}`);
}