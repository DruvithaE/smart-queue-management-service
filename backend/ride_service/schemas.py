from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional

class RideStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    MAINTENANCE = "MAINTENANCE"
    FULL = "FULL"

# Used when creating a new ride
class RideCreate(BaseModel):
    name: str
    description: Optional[str] = None
    capacity: int = Field(..., gt=0, description="Number of people per ride cycle")
    duration: float = Field(..., gt=0, description="Time in minutes for one cycle")
    status: RideStatus = RideStatus.OPEN

# Used when returning ride data to the client
class RideResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    capacity: int
    duration: float
    status: RideStatus

    class Config:
        from_attributes = True  # enables ORM mode (SQLAlchemy → Pydantic)

# Used to update only the status
class RideStatusUpdate(BaseModel):
    status: RideStatus

# Admin dashboard response
class AdminDashboardResponse(BaseModel):
    total_rides: int
    open_rides: int
    closed_rides: int
    maintenance_rides: int
    full_rides: int
    total_capacity: int
    rides: list[RideResponse]