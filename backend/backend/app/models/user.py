from enum import Enum

class UserRole(Enum):
    USER = 'USER'
    CONSULTANT = 'CONSULTANT'
    EXPERT = 'EXPERT'
    ADMIN = 'ADMIN'

class UserStatus(Enum):
    ACTIVE = 'ACTIVE'
    SUSPENDED = 'SUSPENDED'
    DELETED = 'DELETED'

class User:
    def __init__(self, phone_number, email, profile_picture, national_id, otp, status=UserStatus.ACTIVE, role=UserRole.USER):
        self.phone_number = phone_number
        self.email = email
        self.profile_picture = profile_picture
        self.national_id = national_id
        self.otp = otp
        self.status = status
        self.role = role
        self.contracts = []  # Placeholder for contracts relationship
        self.listings = []  # Placeholder for listings relationship

    def __repr__(self):
        return f'<User {self.phone_number}, {self.email}, {self.role}, {self.status}>\nContracts: {self.contracts}\nListings: {self.listings}'
