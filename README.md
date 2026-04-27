# Smart Queue Management Service

Smart Queue Management Service is a full-stack ride queue system built with a React frontend, an Express backend, and PostgreSQL.

The project supports live ride status, queue tracking, wait-time prediction, recommendations, and an admin dashboard for ride and queue moderation.

## Project Structure

- `backend/` - Express API, PostgreSQL access, queue logic, auth, and admin controls
- `frontend/` - React UI for customers and admins
- `backend/config/db.js` - database connection and table initialization
- `backend/services/queue_service/` - queue controller logic and concurrency handling
- `frontend/src/components/` - ride status, queue UI, admin panel, and recommendations

## Member 1: Queue Management Service

This module owns the virtual queue system. It is responsible for:

- join, leave, and track queue actions
- queue position calculation with priority handling
- Fast Pass support using a priority queue flow
- concurrency-safe updates so multiple users can join safely
- live queue status for both users and admins

### Design Pattern

The queue logic uses a Singleton pattern through a central queue controller. This keeps queue operations consistent and ensures all requests go through the same service instance.

### API Endpoints

- `POST /queue/joinQueue`
- `POST /queue/leaveQueue`
- `GET /queue/queueStatus`

### How the Queue Works

When a user joins a queue, the system stores the queue entry in PostgreSQL inside the `queue_entries` table. Each record keeps the ride id, the queue user id, priority flag, queue status, and timestamps.

Queue position is calculated from the active entries for that ride. Fast Pass users are placed ahead of regular users, and positions are recomputed in a deterministic order so the displayed position stays accurate.

Leaving the queue marks the active queue entry as `LEFT` instead of deleting it. This preserves queue history and makes moderation easier.

### Frontend Features

- queue join and leave controls inside the ride card
- live queue position display for the current user
- Fast Pass toggle during join
- active queue totals and people-ahead display

### Admin Queue Moderation

The admin panel includes a queue moderation section that can:

- search active queue entries by user id, name, or email
- filter by ride
- remove a user from an active queue entry

This is useful when a visitor leaves a ride or needs to be removed manually by staff.

### User Identity Handling

Queue entries store the user id in the database in `queue_entries.user_id`.

If the user id corresponds to an authenticated app user, the admin search also joins the `users` table so the admin can see the visitor name and email when available.

### Testing

The queue module includes tests for:

- multiple concurrent joins
- duplicate queue rejection
- leave queue behavior
- Fast Pass ordering
- queue accuracy validation within one position

## Running the Project

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Default Ports

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`

If port 3000 is busy, React may offer another port such as 3001.

## Login

Admin login is handled through the auth system. The admin dashboard is shown when the logged-in user has the `admin` role.

## Notes

- Backend queue data is persisted in PostgreSQL.
- Queue entries are not deleted when a user leaves; they are marked as inactive for history and auditing.
- The frontend polls ride status and queue status so the UI stays live.



## TESTING:


# Latency (NFR) Evaluation

**NFR Targets**

- **Queue updates reflected:** ≤ **200 ms** at **95th percentile (p95)**
- **Notifications delivered:** ≤ **2 seconds**

**Test Date:** 2026-04-27  
**System Under Test:** `smart-queue-management-service` (local run)  
**Backend Base URL:** `http://localhost:3000`

---

## 1) Queue Updates Reflected Latency (Read Path)

### Definition (what “reflected” means in this test)

A “queue update is reflected” when the client can fetch the latest queue state from the backend.

Therefore, we measure the latency of:

- `GET /queue/queueStatus?rideId=1&userId=4`

This endpoint is also used by the frontend API client:

- `frontend/src/api.js` → function `getQueueStatus(rideId, userId)` (calls `GET /queue/queueStatus`)

### Tooling

- Load testing tool: **autocannon**
- Command executed:

```bash
npx autocannon -c 50 -d 30 \
  "http://localhost:3000/queue/queueStatus?rideId=1&userId=4"
```

**Load profile**

- Concurrency (`-c`): **50 simultaneous connections**
- Duration (`-d`): **30 seconds**

### Results 

![alt text](image.png)

From the autocannon output:

- **Median (p50): 19 ms**
- **p97.5: 81 ms**
- **p99: 107 ms**
- **Max: 165 ms**
- **Average throughput:** ~**2029 requests/sec** (Avg Req/Sec)

> Note: autocannon prints percentiles at 2.5%, 50%, 97.5%, 99%.  
> Since **p97.5 = 81 ms**, it implies **p95 ≤ 81 ms** (p95 is always ≤ p97.5).

### Conclusion vs NFR

- **Measured:** p95 ≤ **81 ms**
- **Target:** p95 ≤ **200 ms**

✅ **PASS** — Queue update reflection latency meets the NFR under the tested load.

---

## 2) Notification Delivery Latency (Socket.IO)

### NFR Target
- **Notifications delivered within ≤ 2 seconds (p95)**

---

### Definition (what “notification delivered” means)
A notification is considered **delivered** when it is received by the Socket.IO client event handler:

- `socket.on("notification", (data) => { ... })`

We measure end-to-end notification delivery latency as:

> **Notification latency (ms) = client_receive_time_ms − server_emit_time_ms**

Where:
- `server_emit_time_ms` comes from the backend payload field `timestamp`
- `client_receive_time_ms` is measured using `Date.now()` at the instant the client receives the event

---

### Implementation reference (code evidence / used code lines)

**(a) Backend emits notification with a timestamp (used as server emit time)**
- File: `backend/services/notification_service/notificationService.js`
- Function: `sendNotification(userId, message)`
- The payload includes `timestamp: new Date()`:

https://github.com/DruvithaE/smart-queue-management-service/blob/ba3f620ecff973dec4e1c223e6a68c13f8a32ae5/backend/services/notification_service/notificationService.js#L9-L18

**(b) Socket room registration (ensures notifications go to the correct user room)**
- File: `backend/services/notification_service/socketHandler.js`
- On `register`, server joins room `String(userId)`:

https://github.com/DruvithaE/smart-queue-management-service/blob/ba3f620ecff973dec4e1c223e6a68c13f8a32ae5/backend/services/notification_service/socketHandler.js#L11-L22

**(c) Notification API route (used to trigger notifications during testing)**
- The notification routes are mounted at `/api/notifications`:

https://github.com/DruvithaE/smart-queue-management-service/blob/f801c193dc0b24f686c8375a902cb14a74f693e8/backend/app.js#L17-L24

- And the route `POST /notify` is defined here:

https://github.com/DruvithaE/smart-queue-management-service/blob/ba3f620ecff973dec4e1c223e6a68c13f8a32ae5/backend/routes/notificationRoutes.js#L1-L12

So the full trigger endpoint is:

- `POST /api/notifications/notify`

---

### Tooling & Test Method

**Measurement approach (terminal-based Socket.IO client)**  
A Node.js script was used to:
1. Connect to Socket.IO server at `http://localhost:3000`
2. Register user room with `register(userId = "4")`
3. Trigger notifications by calling `POST /api/notifications/notify` 100 times
4. Compute latency on each received `"notification"` event:
   - `latencyMs = Date.now() - new Date(data.timestamp).getTime()`
5. Calculate percentiles from collected samples

**Test configuration**
- Sample size: **N = 100** notifications
- Target user room: **userId = "4"**
- Backend base URL: `http://localhost:3000`

(Attach screenshot of the terminal output from running the script.)

---

### Results

![alt text](image-1.png)
![alt text](image-2.png)

From the terminal summary:

- Samples: **100**
- **p50:** 1 ms
- **p95:** 5 ms
- **p99:** 18 ms
- **max:** 18 ms

---

### Conclusion vs NFR

- **Measured:** p95 = **5 ms**
- **Target:** p95 ≤ **2000 ms**

✅ **PASS** — Notification delivery latency meets the NFR in the tested environment.


# Reliability Testing  
---

## Objective
The goal of this test suite is to validate the system’s **reliability guarantees**, specifically:
- **Zero Data Loss**
- **99.9% Uptime**
- **Consistency under concurrent operations**
- **Idempotency and fault tolerance**

---

## Test Environment
- **Framework:** Jest  
- **HTTP Testing:** Supertest  
- **Database:** PostgreSQL (via connection pool)  
- **Mocking:** Notification service (`io.emit`) mocked to avoid runtime errors  

---

## Test Setup

### Pre-Test Initialization (`beforeAll`)
- Mocked notification service to prevent socket errors.
- Inserted 8 test rides into the database.
- Ensured no duplication using `ON CONFLICT DO NOTHING`.

### Before Each Test (`beforeEach`)
- Cleared `queue_entries` table to maintain test isolation.

### Cleanup (`afterAll`)
- Deleted all test queue entries and rides.
- Closed database connection.

---

## Test Cases Summary

### ✅ RF-001: Idempotency (Duplicate Requests)
**Goal:** Ensure duplicate `joinQueue` requests do not create multiple entries.

- First request → **201 Created**
- Second request → **500 Error**
- Database verification → Only **1 ACTIVE entry**

✔️ **Result:** Passed  
✔️ **Guarantee:** Idempotent operations enforced

---

### ✅ RF-002: Data Persistence (Atomicity)
**Goal:** Ensure data persists even after simulated failure.

- Entry inserted successfully  
- Verified before and after "crash simulation"

✔️ **Result:** Passed  
✔️ **Guarantee:** No data loss (atomic transactions)

---

### ✅ RF-003: Concurrent Joins
**Goal:** Validate queue consistency under concurrent requests.

- 10 parallel join requests executed  
- Positions verified using `ROW_NUMBER()`

✔️ **Result:** Passed  

✔️ **Guarantee:**  
- No gaps in queue  
- Position accuracy within ±1 tolerance  

---

### ✅ RF-004: Safe Leave Operation
**Goal:** Ensure leaving the queue does not delete data.

- Entry status changed from `ACTIVE` → `LEFT`  
- Record still exists in database  

✔️ **Result:** Passed  
✔️ **Guarantee:** No data loss on user exit  

---

### ✅ RF-005: Retry Safety
**Goal:** Prevent duplicate entries during retries.

- 5 rapid retry attempts  
- Only 1 ACTIVE entry present  

✔️ **Result:** Passed  
✔️ **Guarantee:** Retry-safe system (idempotent behavior)  

---

### ✅ RF-006: Mixed Operations (Join + Leave)
**Goal:** Maintain consistency with mixed operations.

- 5 users joined  
- 2 users left  

✔️ **Result:** Passed  

✔️ **Final State:**
- ACTIVE → 3 users  
- LEFT → 2 users  

✔️ **Guarantee:** Accurate state transitions  

---

### ✅ RF-007: Sequential Operations
**Goal:** Validate consistency over multiple operations.

- 20 sequential joins executed  

✔️ **Result:** Passed  
✔️ **Guarantee:** System handles sustained load correctly  

---

### ✅ RF-008: Rejoin After Leaving
**Goal:** Ensure users can rejoin without data corruption.

- User joins → leaves → rejoins  

✔️ **Result:** Passed  

✔️ **Final State:**
- 1 ACTIVE entry  
- 1 LEFT entry  

✔️ **Guarantee:** No orphaned or duplicate active entries  

---

## Performance Summary

| Metric | Value |
|------|------|
| Total Test Suites | 1 |
| Total Tests | 8 |
| Passed | 8 |
| Failed | 0 |
| Execution Time | 4.421 seconds |

---

## Key Reliability Guarantees Achieved

### 1. Zero Data Loss
- All operations preserve historical data  
- No deletion of records; only status transitions  

---

### 2. Idempotency
- Duplicate and retry requests do not create inconsistencies  

---

### 3. Concurrency Safety
- Queue ordering remains stable under concurrent access  
- No race-condition-induced corruption observed  

---

### 4. Fault Tolerance
- System maintains consistency even under simulated failures  

---

### 5. Data Integrity
- Accurate tracking of ACTIVE vs LEFT entries  
- No orphaned or duplicate active records  

## Conclusion

The system successfully meets the reliability requirements:

- **Zero data loss is ensured through persistent state management**
- **High availability is supported via consistent handling of concurrent and sequential operations**
- **Robustness against retries, failures, and edge cases is verified**

Overall, the Smart Queue Management System demonstrates **strong reliability, consistency, and fault tolerance**, making it suitable for real-world deployment scenarios.

