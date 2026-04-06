"""CRM domain enums — ported from clone's crm/domain/enums.py."""
from __future__ import annotations

from enum import Enum


class FileStatus(str, Enum):
    """وضعیت فایل CRM — چرخه عمر یک لید از ثبت تا انعقاد قرارداد."""
    FILE_CREATED = "FILE_CREATED"          # ثبت لید
    INFO_COMPLETED = "INFO_COMPLETED"      # تکمیل اطلاعات
    AD_REGISTERED = "AD_REGISTERED"       # ثبت آگهی
    FILE_SEARCH = "FILE_SEARCH"            # جستجوی فایل
    NEGOTIATION = "NEGOTIATION"            # مذاکره
    VISIT = "VISIT"                        # بازدید
    CONTRACT_SIGNED = "CONTRACT_SIGNED"    # انعقاد قرارداد
    CANCELLED = "CANCELLED"               # انصراف
    ARCHIVED = "ARCHIVED"                 # آرشیو


class FileType(str, Enum):
    LANDLORD = "landlord_files"
    TENANT = "tenant_files"
    REALTOR = "realtor_files"


class ListingType(str, Enum):
    SALE = "SALE"
    RENT = "RENT"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class CallStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    INPUT_CALL = "INPUT_CALL"


class FileConnectionStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED_FOR_VISIT = "APPROVED_FOR_VISIT"
    REJECTED = "REJECTED"
    SUCCESSFUL = "SUCCESSFUL"
    LANDLORD_DID_NOT_ANSWER = "LANDLORD_DID_NOT_ANSWER"
    TENANT_DID_NOT_ANSWER = "TENANT_DID_NOT_ANSWER"


class MonopolyStatus(str, Enum):
    MONOPOLY = "MONOPOLY"
    MONOPOLY_EXISTS = "MONOPOLY_EXISTS"
    NO_MONOPOLY = "NO_MONOPOLY"
    NO_COOPERATION = "NO_COOPERATION"


class SalePaymentMethod(str, Enum):
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    BOTH = "BOTH"


class RealtorType(str, Enum):
    LICENSE_HOLDER = "LICENSE_HOLDER"
    INDEPENDENT_CONSULTANT = "INDEPENDENT_CONSULTANT"
    EMPLOYED_AT_FIRM = "EMPLOYED_AT_FIRM"


# نگاشت FileStatus به LeadStatus موجود در سیستم ما
FILE_STATUS_TO_LEAD_STATUS: dict[FileStatus, str] = {
    FileStatus.FILE_CREATED: "NEW",
    FileStatus.INFO_COMPLETED: "NEW",
    FileStatus.AD_REGISTERED: "CONTACTED",
    FileStatus.FILE_SEARCH: "CONTACTED",
    FileStatus.NEGOTIATION: "NEGOTIATING",
    FileStatus.VISIT: "NEGOTIATING",
    FileStatus.CONTRACT_SIGNED: "CONTRACTED",
    FileStatus.CANCELLED: "LOST",
    FileStatus.ARCHIVED: "LOST",
}
