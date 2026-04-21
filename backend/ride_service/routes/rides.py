from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Ride
from schemas import RideCreate, RideResponse, RideStatusUpdate

router = APIRouter()
# Service Layer Pattern:
# This module acts as the service layer — it separates business logic
# (route handlers) from data access (SQLAlchemy ORM in models.py),
# keeping concerns cleanly separated.

# ──────────────────────────────────────────────
# POST /rides/  — Create a new ride (admin setup)
# ──────────────────────────────────────────────
@router.post("/", response_model=RideResponse, status_code=201)
def create_ride(ride_data: RideCreate, db: Session = Depends(get_db)):
    new_ride = Ride(**ride_data.model_dump())
    db.add(new_ride)
    db.commit()
    db.refresh(new_ride)
    return new_ride

# ──────────────────────────────────────────────
# GET /rides/  — List all rides (user-facing display)
# ──────────────────────────────────────────────
@router.get("/", response_model=list[RideResponse])
def get_all_rides(db: Session = Depends(get_db)):
    return db.query(Ride).all()

# ──────────────────────────────────────────────
# GET /rides/{ride_id}  — Get single ride details
# This is the API your friend's wait-time service will call
# Returns: id, name, capacity, duration, status
# ──────────────────────────────────────────────
@router.get("/{ride_id}", response_model=RideResponse)
def get_ride(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail=f"Ride with id {ride_id} not found")
    return ride

# ──────────────────────────────────────────────
# PUT /rides/{ride_id}/status  — Update ride status
# Admin uses this to mark rides OPEN/CLOSED/MAINTENANCE/FULL
# ──────────────────────────────────────────────
@router.put("/{ride_id}/status", response_model=RideResponse)
def update_ride_status(ride_id: int, update: RideStatusUpdate, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail=f"Ride with id {ride_id} not found")
    ride.status = update.status
    db.commit()
    db.refresh(ride)
    return ride

# ──────────────────────────────────────────────
# DELETE /rides/{ride_id}  — Remove a ride (admin only)
# ──────────────────────────────────────────────
@router.delete("/{ride_id}", status_code=204)
def delete_ride(ride_id: int, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail=f"Ride with id {ride_id} not found")
    db.delete(ride)
    db.commit()