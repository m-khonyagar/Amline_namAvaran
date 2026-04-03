# noqa: F401 — historical reference only; DO NOT import from application code.
# Migrated from app/models/listing.py (Django orphan). Kept for audit; stack is FastAPI + SQLAlchemy.

from django.contrib.auth.models import User
from django.db import models


class Listing(models.Model):
    PROPERTY_TYPE_CHOICES = [
        ("rent", "Rent"),
        ("sale", "Sale"),
    ]

    property_type = models.CharField(max_length=4, choices=PROPERTY_TYPE_CHOICES)
    features = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listings")

    def __str__(self):
        return f"{self.property_type.capitalize()} Listing in {self.location} for ${self.price}"
