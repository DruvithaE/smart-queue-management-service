const { io } = require("socket.io-client");

const API_BASE = "http://localhost:3000";
const USER_ID = "4";   // must match the user that registers to the socket room
const N = 100;         // number of notifications to measure
const GAP_MS = 30;     // delay between sends (avoid flooding)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postNotify(i) {
  const res = await fetch(`${API_BASE}/api/notifications/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, message: `test-${i}` }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`notify failed: ${res.status} ${text}`);
  }
}

async function main() {
  const socket = io(API_BASE, { transports: ["websocket"] });

  const latencies = [];
  let received = 0;

  socket.on("connect", () => {
    console.log("socket connected:", socket.id);
    socket.emit("register", String(USER_ID));
    console.log("registered user:", USER_ID);
  });

  socket.on("notification", (data) => {
    const serverTs = data?.timestamp ? new Date(data.timestamp).getTime() : null;
    if (!serverTs) return;

    const latencyMs = Date.now() - serverTs;
    latencies.push(latencyMs);
    received++;

    console.log(`notification ${received}/${N} latency(ms):`, latencyMs);
  });

  // wait for socket connection + register to complete
  await sleep(500);

  // send N notifications
  for (let i = 0; i < N; i++) {
    await postNotify(i);
    await sleep(GAP_MS);
  }

  // wait until all are received
  const deadline = Date.now() + 15000; // 15s safety limit
  while (received < N && Date.now() < deadline) {
    await sleep(100);
  }

  if (received < N) {
    console.log(`\nWARNING: received only ${received}/${N} notifications`);
  }

  // compute percentiles
  latencies.sort((a, b) => a - b);
  const p = (x) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * x))];

  const p50 = p(0.50);
  const p95 = p(0.95);
  const p99 = p(0.99);
  const max = latencies[latencies.length - 1];

  console.log("\nSummary (ms):");
  console.log("samples:", latencies.length);
  console.log("p50:", p50);
  console.log("p95:", p95);
  console.log("p99:", p99);
  console.log("max:", max);

  console.log("\nNFR check (p95 <= 2000ms):", p95 <= 2000 ? "PASS" : "FAIL");

  socket.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});