from sqlalchemy import Column, Integer, String, Float, Enum
from database import Base
import enum

class RideStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    MAINTENANCE = "MAINTENANCE"
    FULL = "FULL"

class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Fields requested by your friend
    capacity = Column(Integer, nullable=False)   # number of people per ride cycle
    duration = Column(Float, nullable=False)     # time in minutes for one cycle
    status = Column(Enum(RideStatus), default=RideStatus.OPEN, nullable=False)