from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Ride, RideStatus
from schemas import AdminDashboardResponse, RideResponse

router = APIRouter()
# Service Layer Pattern:
# This module acts as the service layer — it separates business logic
# (route handlers) from data access (SQLAlchemy ORM in models.py),
# keeping concerns cleanly separated.

# ──────────────────────────────────────────────
# GET /admin/dashboard  — Analytics overview for admin panel
# Returns counts by status, total capacity, and full ride list
# ──────────────────────────────────────────────
@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)):
    all_rides = db.query(Ride).all()

    open_rides = [r for r in all_rides if r.status == RideStatus.OPEN]
    closed_rides = [r for r in all_rides if r.status == RideStatus.CLOSED]
    maintenance_rides = [r for r in all_rides if r.status == RideStatus.MAINTENANCE]
    full_rides = [r for r in all_rides if r.status == RideStatus.FULL]
    total_capacity = sum(r.capacity for r in all_rides)

    return AdminDashboardResponse(
        total_rides=len(all_rides),
        open_rides=len(open_rides),
        closed_rides=len(closed_rides),
        maintenance_rides=len(maintenance_rides),
        full_rides=len(full_rides),
        total_capacity=total_capacity,
        rides=all_rides,
    )