"""
Tests for Ride Management Service
Run with:  pytest test_rides.py -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db

# Use an in-memory SQLite database for tests (no PostgreSQL needed)
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# ─── Helper ────────────────────────────────────────────────────────────────

def create_sample_ride(name="Thunder Mountain", capacity=40, duration=3.5, status="OPEN"):
    return client.post("/rides/", json={
        "name": name,
        "description": "A thrilling ride",
        "capacity": capacity,
        "duration": duration,
        "status": status,
    })

# ─── Ride CRUD Tests ────────────────────────────────────────────────────────

def test_create_ride():
    res = create_sample_ride()
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Thunder Mountain"
    assert data["capacity"] == 40
    assert data["duration"] == 3.5
    assert data["status"] == "OPEN"
    assert "id" in data

def test_get_ride_by_id():
    created = create_sample_ride().json()
    res = client.get(f"/rides/{created['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == created["id"]
    assert data["capacity"] == 40
    assert data["duration"] == 3.5
    assert data["status"] == "OPEN"

def test_get_ride_not_found():
    res = client.get("/rides/9999")
    assert res.status_code == 404

def test_get_all_rides():
    create_sample_ride("Ride A")
    create_sample_ride("Ride B")
    res = client.get("/rides/")
    assert res.status_code == 200
    assert len(res.json()) == 2

def test_update_ride_status():
    created = create_sample_ride().json()
    res = client.put(f"/rides/{created['id']}/status", json={"status": "CLOSED"})
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"

def test_update_ride_status_to_maintenance():
    created = create_sample_ride().json()
    res = client.put(f"/rides/{created['id']}/status", json={"status": "MAINTENANCE"})
    assert res.status_code == 200
    assert res.json()["status"] == "MAINTENANCE"

def test_update_ride_status_invalid():
    created = create_sample_ride().json()
    res = client.put(f"/rides/{created['id']}/status", json={"status": "BROKEN"})
    assert res.status_code == 422  # Pydantic validation error

def test_delete_ride():
    created = create_sample_ride().json()
    res = client.delete(f"/rides/{created['id']}")
    assert res.status_code == 204
    # Confirm it's gone
    res = client.get(f"/rides/{created['id']}")
    assert res.status_code == 404

# ─── Admin Dashboard Tests ──────────────────────────────────────────────────

def test_admin_dashboard_empty():
    res = client.get("/admin/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["total_rides"] == 0
    assert data["total_capacity"] == 0

def test_admin_dashboard_counts():
    create_sample_ride("Ride 1", capacity=50, status="OPEN")
    create_sample_ride("Ride 2", capacity=30, status="CLOSED")
    create_sample_ride("Ride 3", capacity=20, status="MAINTENANCE")
    create_sample_ride("Ride 4", capacity=40, status="FULL")

    res = client.get("/admin/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["total_rides"] == 4
    assert data["open_rides"] == 1
    assert data["closed_rides"] == 1
    assert data["maintenance_rides"] == 1
    assert data["full_rides"] == 1
    assert data["total_capacity"] == 140  # 50+30+20+40

def test_admin_dashboard_has_rides_list():
    create_sample_ride("Splash Zone")
    res = client.get("/admin/dashboard")
    assert res.status_code == 200
    assert len(res.json()["rides"]) == 1
    assert res.json()["rides"][0]["name"] == "Splash Zone"

# ─── Data Consistency Tests ─────────────────────────────────────────────────

def test_ride_capacity_must_be_positive():
    res = client.post("/rides/", json={
        "name": "Bad Ride",
        "capacity": 0,       # invalid
        "duration": 3.0,
        "status": "OPEN",
    })
    assert res.status_code == 422

def test_ride_duration_must_be_positive():
    res = client.post("/rides/", json={
        "name": "Bad Ride",
        "capacity": 10,
        "duration": -1,      # invalid
        "status": "OPEN",
    })
    assert res.status_code == 422

def test_status_persists_after_update():
    """Ensure status change is actually saved to DB (data consistency check)."""
    created = create_sample_ride().json()
    client.put(f"/rides/{created['id']}/status", json={"status": "MAINTENANCE"})
    fetched = client.get(f"/rides/{created['id']}").json()
    assert fetched["status"] == "MAINTENANCE"