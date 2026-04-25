const request = require("supertest");
const app = require("../app");
const { pool, initTable } = require("../config/db");

beforeAll(async () => {
  await initTable();
});

beforeEach(async () => {
  await pool.query("DELETE FROM queue_entries");
  await pool.query("DELETE FROM rides");
  await pool.query("ALTER SEQUENCE rides_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE queue_entries_id_seq RESTART WITH 1");
});

afterAll(async () => {
  await pool.end();
});

async function createRide() {
  const res = await request(app).post("/rides").send({
    name: "Queue Ride",
    description: "Queue test ride",
    capacity: 32,
    duration: 3.5,
    status: "OPEN",
  });
  return res.body;
}

test("POST /queue/joinQueue assigns increasing positions", async () => {
  const ride = await createRide();

  const one = await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "u1" });
  const two = await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "u2" });

  expect(one.status).toBe(201);
  expect(one.body.position).toBe(1);
  expect(two.status).toBe(201);
  expect(two.body.position).toBe(2);
});

test("POST /queue/joinQueue rejects duplicate active user", async () => {
  const ride = await createRide();

  const first = await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "same-user" });
  const second = await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "same-user" });

  expect(first.status).toBe(201);
  expect(second.status).toBe(409);
});

test("POST /queue/leaveQueue removes active entry", async () => {
  const ride = await createRide();

  await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "u1" });

  const left = await request(app).post("/queue/leaveQueue").send({ rideId: ride.id, userId: "u1" });
  const status = await request(app).get(`/queue/queueStatus?rideId=${ride.id}&userId=u1`);

  expect(left.status).toBe(200);
  expect(status.body.userInQueue).toBe(false);
});

test("Fast pass users are prioritized ahead of standard users", async () => {
  const ride = await createRide();

  const standard = await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "std-1", fastPass: false });
  const fast = await request(app).post("/queue/joinQueue").send({ rideId: ride.id, userId: "fp-1", fastPass: true });

  const standardStatus = await request(app).get(`/queue/queueStatus?rideId=${ride.id}&userId=std-1`);
  const fastStatus = await request(app).get(`/queue/queueStatus?rideId=${ride.id}&userId=fp-1`);

  expect(standard.status).toBe(201);
  expect(fast.status).toBe(201);
  expect(fastStatus.body.position).toBeLessThan(standardStatus.body.position);
});

test("Concurrency: multiple users join with contiguous unique positions", async () => {
  const ride = await createRide();

  const totalUsers = 20;
  const joins = await Promise.all(
    Array.from({ length: totalUsers }, (_, i) =>
      request(app)
        .post("/queue/joinQueue")
        .send({ rideId: ride.id, userId: `user-${i + 1}` })
    )
  );

  const positions = joins.map((r) => r.body.position).sort((a, b) => a - b);
  expect(joins.every((r) => r.status === 201)).toBe(true);
  expect(positions).toEqual(Array.from({ length: totalUsers }, (_, i) => i + 1));
});

test("Accuracy validation: reported position remains within +/-1", async () => {
  const ride = await createRide();

  await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      request(app)
        .post("/queue/joinQueue")
        .send({ rideId: ride.id, userId: `acc-${i + 1}` })
    )
  );

  const checks = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      request(app).get(`/queue/queueStatus?rideId=${ride.id}&userId=acc-${i + 1}`)
    )
  );

  const positions = checks.map((r) => r.body.position).sort((a, b) => a - b);
  positions.forEach((position, index) => {
    const expected = index + 1;
    expect(Math.abs(position - expected)).toBeLessThanOrEqual(1);
  });
});
