const { pool } = require("../../config/db");

class QueueManager {
  static instance;

  static getInstance() {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async joinQueue({ rideId, userId, fastPass = false, members = [], groupSize = 1  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const rideResult = await client.query(
        "SELECT id, status FROM rides WHERE id = $1 FOR UPDATE",
        [rideId]
      );
      if (rideResult.rowCount === 0) {
        throw new Error("Ride not found");
      }
      if (rideResult.rows[0].status !== "OPEN") {
        throw new Error("Ride is not open for queueing");
      }

      const duplicate = await client.query(
        `SELECT id
         FROM queue_entries
         WHERE ride_id = $1 AND user_id = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [rideId, userId]
      );
      if (duplicate.rowCount > 0) {
        throw new Error("User already has an active queue entry for this ride");
      }

      const inserted = await client.query(
        `INSERT INTO queue_entries (ride_id, user_id, priority, group_size, selected_members, status)
VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         RETURNING id, ride_id, user_id, priority, joined_at`,
        [rideId, userId, Boolean(fastPass), groupSize, JSON.stringify(members)]
      );

      const entry = inserted.rows[0];
      const position = await this._getPositionByEntryId(client, entry.id);

      await client.query("COMMIT");

      return {
        rideId: Number(entry.ride_id),
        userId: entry.user_id,
        isPriority: entry.priority,
        position,
        peopleAhead: position - 1,
        joinedAt: entry.joined_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async leaveQueue({ rideId, userId }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const left = await client.query(
        `WITH target AS (
           SELECT id
           FROM queue_entries
           WHERE ride_id = $1 AND user_id = $2 AND status = 'ACTIVE'
           ORDER BY joined_at ASC, id ASC
           LIMIT 1
           FOR UPDATE
         )
         UPDATE queue_entries
         SET status = 'LEFT', left_at = NOW()
         WHERE id = (SELECT id FROM target)
         RETURNING id, ride_id, user_id, priority, joined_at, left_at`,
        [rideId, userId]
      );

      if (left.rowCount === 0) {
        throw new Error("No active queue entry found for this user");
      }

      await client.query("COMMIT");

      return {
        rideId: Number(left.rows[0].ride_id),
        userId: left.rows[0].user_id,
        leftAt: left.rows[0].left_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async queueStatus({ rideId, userId }) {
    const client = await pool.connect();
    try {
      const totalsResult = await client.query(
        `SELECT
           COALESCE(SUM(group_size) FILTER (WHERE status = 'ACTIVE'), 0)::int AS total_active,
            COALESCE(SUM(group_size) FILTER (WHERE status = 'ACTIVE' AND priority = TRUE), 0)::int AS priority_active,
            COALESCE(SUM(group_size) FILTER (WHERE status = 'ACTIVE' AND priority = FALSE), 0)::int AS regular_active
         FROM queue_entries
         WHERE ride_id = $1`,
        [rideId]
      );

      const totals = totalsResult.rows[0];
      const response = {
        rideId: Number(rideId),
        totalActive: totals.total_active,
        priorityActive: totals.priority_active,
        regularActive: totals.regular_active,
        userInQueue: false,
      };

      if (userId) {
        const current = await client.query(
          `SELECT id, priority, joined_at
           FROM queue_entries
           WHERE ride_id = $1 AND user_id = $2 AND status = 'ACTIVE'
           ORDER BY joined_at ASC, id ASC
           LIMIT 1`,
          [rideId, userId]
        );

        if (current.rowCount > 0) {
          const currentEntry = current.rows[0];
          const position = await this._getPositionByEntryId(client, currentEntry.id);
          response.userInQueue = true;
          response.userId = userId;
          response.position = position;
          response.peopleAhead = position - 1;
          response.isPriority = currentEntry.priority;
          response.joinedAt = currentEntry.joined_at;
        }
      }

      return response;
    } finally {
      client.release();
    }
  }

  async searchActiveQueueEntries({ searchTerm = "", rideId = null, limit = 50 }) {
    const client = await pool.connect();
    try {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
      const hasRideFilter = Number.isInteger(rideId) && rideId > 0;
      const normalizedSearchTerm = String(searchTerm || "").trim();

      const params = hasRideFilter
        ? [normalizedSearchTerm, rideId, safeLimit]
        : [normalizedSearchTerm, safeLimit];

      const rideFilterClause = hasRideFilter ? "AND qe.ride_id = $2" : "";
      const rideFilterClauseOuter = hasRideFilter ? "AND ride_id = $2" : "";
      const limitParam = hasRideFilter ? "$3" : "$2";

      const result = await client.query(
        `WITH ordered AS (
           SELECT
             qe.id,
             qe.ride_id,
             r.name AS ride_name,
             qe.user_id,
             u.name AS user_name,
             u.email AS user_email,
             qe.priority,
             qe.joined_at,
             ROW_NUMBER() OVER (
               PARTITION BY qe.ride_id
               ORDER BY qe.priority DESC, qe.joined_at ASC, qe.id ASC
             ) AS position
           FROM queue_entries qe
           JOIN rides r ON r.id = qe.ride_id
           LEFT JOIN users u ON u.id = CASE
             WHEN qe.user_id ~ '^[0-9]+$' THEN qe.user_id::int
             ELSE NULL
           END
           WHERE qe.status = 'ACTIVE'
           ${rideFilterClause}
         )
         SELECT id, ride_id, ride_name, user_id, user_name, user_email, priority, joined_at, position
         FROM ordered
         WHERE (
           $1 = ''
           OR user_id ILIKE ('%' || $1 || '%')
           OR COALESCE(user_name, '') ILIKE ('%' || $1 || '%')
           OR COALESCE(user_email, '') ILIKE ('%' || $1 || '%')
         )
         ${rideFilterClauseOuter}
         ORDER BY joined_at ASC, id ASC
         LIMIT ${limitParam}`,
        params
      );

      return result.rows.map((row) => ({
        entryId: Number(row.id),
        rideId: Number(row.ride_id),
        rideName: row.ride_name,
        userId: row.user_id,
        userName: row.user_name || null,
        userEmail: row.user_email || null,
        isPriority: row.priority,
        joinedAt: row.joined_at,
        position: Number(row.position),
      }));
    } finally {
      client.release();
    }
  }

  async adminRemoveUserFromQueue({ rideId, userId, removedBy }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const left = await client.query(
        `WITH target AS (
           SELECT id
           FROM queue_entries
           WHERE ride_id = $1 AND user_id = $2 AND status = 'ACTIVE'
           ORDER BY joined_at ASC, id ASC
           LIMIT 1
           FOR UPDATE
         )
         UPDATE queue_entries
         SET status = 'LEFT', left_at = NOW()
         WHERE id = (SELECT id FROM target)
         RETURNING id, ride_id, user_id, priority, joined_at, left_at`,
        [rideId, userId]
      );

      if (left.rowCount === 0) {
        throw new Error("No active queue entry found for this user");
      }

      await client.query("COMMIT");

      return {
        rideId: Number(left.rows[0].ride_id),
        userId: left.rows[0].user_id,
        leftAt: left.rows[0].left_at,
        removedBy: removedBy || null,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

async _getPositionByEntryId(client, entryId) {
  // Step 1: get current entry info
  const current = await client.query(
    `SELECT ride_id, priority, joined_at, id
     FROM queue_entries
     WHERE id = $1`,
    [entryId]
  );

  if (current.rowCount === 0) return 0;

  const { ride_id, priority, joined_at, id } = current.rows[0];

  // Step 2: calculate people ahead
  const result = await client.query(
    `SELECT COALESCE(SUM(group_size), 0)::int AS people_ahead
     FROM queue_entries
     WHERE ride_id = $1
       AND status = 'ACTIVE'
       AND (
         (priority = TRUE AND $2 = FALSE)
         OR
         (priority = $2 AND joined_at < $3)
         OR
         (priority = $2 AND joined_at = $3 AND id < $4)
       )`,
    [ride_id, priority, joined_at, id]
  );

  const peopleAhead = Number(result.rows[0]?.people_ahead || 0);
  return peopleAhead + 1;
}
}

module.exports = QueueManager;
