// src/api.js
// Central place for all ride service API calls

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

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
  return fetchJson(`${BASE_URL}/admin/dashboard`, {
    headers: { ...getAuthHeaders() },
  });
}

export async function getPredictedWaitTime(
  rideId,
  userId
) {
  let url =
    `${BASE_URL}/api/wait-time/predict?rideId=${rideId}`;

  if (userId) {
    url += `&userId=${userId}`;
  }
  console.log("Fetching predicted wait time from URL:", url);

  return fetchJson(url);
}

export const joinQueue = async (rideId, userId, priority = false, members = []) => {
  return fetchJson(`${BASE_URL}/queue/joinQueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rideId,
      userId,
      priority,
      members,
    }),
  });
};

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

export async function getRecommendations(strategy = "BALANCED") {
  return fetchJson(
    `${BASE_URL}/recommendation/recommendRides?strategy=${strategy}`
  );
}

export async function getQueueOptimization() {
  return fetchJson(`${BASE_URL}/recommendation/optimizeQueue`);
}

export async function searchQueueEntriesByUserId(searchTerm, rideId, limit = 50) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (searchTerm && String(searchTerm).trim()) {
    query.set("search", String(searchTerm).trim());
  }
  if (rideId) {
    query.set("rideId", String(rideId));
  }

  return fetchJson(`${BASE_URL}/queue/admin/search?${query.toString()}`, {
    headers: { ...getAuthHeaders() },
  });
}

export async function adminRemoveQueueEntry(rideId, userId) {
  return fetchJson(`${BASE_URL}/queue/admin/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ rideId, userId }),
  });
}

export const getUserProfile = async (userId) => {
  const res = await fetch(`http://localhost:3000/users/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
};

export const updateUserMembers = async (userId, members) => {
  const res = await fetch(`http://localhost:3000/users/${userId}/members`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(members),
  });

  if (!res.ok) throw new Error("Failed to update members");
  return res.json();
};