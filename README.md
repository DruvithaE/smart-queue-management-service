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
