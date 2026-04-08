import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class ContractStatus(enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum("Rent", "Sale", "Mortgage", name="contract_types"))
    status = Column(Enum(ContractStatus))
    signature = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="contracts")

    def __repr__(self) -> str:
        return f"<Contract(id={self.id}, type={self.type}, status={self.status})>"
