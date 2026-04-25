// src/api.js
// Central place for all ride service API calls

const BASE_URL = "http://localhost:3000";

export async function getAllRides() {
  const res = await fetch(`${BASE_URL}/rides/`);
  if (!res.ok) throw new Error("Failed to fetch rides");
  return res.json();
}

export async function getRideById(rideId) {
  const res = await fetch(`${BASE_URL}/rides/${rideId}`);
  if (!res.ok) throw new Error(`Ride ${rideId} not found`);
  return res.json();
}

export async function updateRideStatus(rideId, status) {
  const res = await fetch(`${BASE_URL}/rides/${rideId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function createRide(rideData) {
  const res = await fetch(`${BASE_URL}/rides/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rideData),
  });
  if (!res.ok) throw new Error("Failed to create ride");
  return res.json();
}

export async function deleteRide(rideId) {
  const res = await fetch(`${BASE_URL}/rides/${rideId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete ride");
}

export async function getAdminDashboard() {
  const res = await fetch(`${BASE_URL}/admin/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function getPredictedWaitTime(rideId) {
  const res = await fetch(
    `${BASE_URL}/api/wait-time/predict?rideId=${rideId}`
  );

  if (!res.ok) throw new Error("Failed");

  return res.json();
}