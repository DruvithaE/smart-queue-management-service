const { pool } = require("../../config/db");

class QueueManager {
  static instance;

  static getInstance() {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async joinQueue({ rideId, userId, fastPass = false }) {
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
        `INSERT INTO queue_entries (ride_id, user_id, priority, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         RETURNING id, ride_id, user_id, priority, joined_at`,
        [rideId, userId, Boolean(fastPass)]
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
           COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS total_active,
           COUNT(*) FILTER (WHERE status = 'ACTIVE' AND priority = TRUE)::int AS priority_active,
           COUNT(*) FILTER (WHERE status = 'ACTIVE' AND priority = FALSE)::int AS regular_active
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

  async _getPositionByEntryId(client, entryId) {
    const positionResult = await client.query(
      `SELECT COUNT(*)::int AS position
       FROM queue_entries q
       JOIN queue_entries me ON me.id = $1
       WHERE q.ride_id = me.ride_id
         AND q.status = 'ACTIVE'
         AND (
           (q.priority = TRUE AND me.priority = FALSE)
           OR (
             q.priority = me.priority
             AND (
               q.joined_at < me.joined_at
               OR (q.joined_at = me.joined_at AND q.id <= me.id)
             )
           )
         )`,
      [entryId]
    );

    return positionResult.rows[0].position;
  }
}

module.exports = QueueManager;
