"""Pydantic schemas for CRM tasks, stats, and reports."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class CrmTaskOut(BaseModel):
    id: str
    lead_id: str
    title: str
    due_date: Optional[str] = None
    done: bool
    created_at: str


class CrmTaskCreateBody(BaseModel):
    title: str
    due_date: Optional[str] = None  # ISO date string


class CrmTaskPatchBody(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    done: Optional[bool] = None


class CrmStatsResponse(BaseModel):
    active_leads: int
    contracted_leads: int
    total_leads: int
    conversion_rate: int  # integer percentage
    leads_this_month: int
    lost_leads: int


class CrmConversionReport(BaseModel):
    total_leads: int
    converted_leads: int
    lost_leads: int
    conversion_rate: int
    monthly_breakdown: List[Dict[str, Any]]
