"""ORM models — import side effects register tables on Base.metadata (Alembic)."""

from app.models.audit_log import AuditLog, AuditLogEntry
from app.models.contract_flow import (
    ContractFlowParty,
    ContractFlowPartyRole,
    ContractFlowPersonType,
    ContractFlowRecord,
    ContractFlowSigningStatus,
    DatingInfo,
    HomeInfo,
    MortgageInfo,
    RentingInfo,
    Signing,
    Witness,
)
from app.models.contract_commission import (
    CommissionPaidBy,
    CommissionPaymentMethod,
    CommissionRecordStatus,
    ContractCommission,
    ContractCommissionType,
)
from app.models.crm import CrmActivity, CrmActivityType, CrmLead, CrmLeadSource
from app.models.dispute import (
    Dispute,
    DisputeCategory,
    DisputeEvidence,
    DisputeEvidenceType,
    DisputeResolutionType,
    DisputeStatus,
    LedgerHold,
)
from app.models.geo import City, Province
from app.models.growth import (
    AnalyticsEvent,
    Conversation,
    Message,
    PropertyRequirement,
    Rating,
    RatingTargetType,
    RequirementStatus,
)
from app.models.launch import (
    Agency,
    BetaInvitation,
    ClientErrorReport,
    OnboardingEvent,
    Region,
    SubscriptionPlan,
    SupportMessage,
    SupportTicket,
    UserGamification,
    UserSubscription,
)
from app.models.legal import LegalReview, LegalReviewStatus
from app.models.listing import DealType, Listing, ListingStatus, ListingVisibility
from app.models.notification_event import (
    NotificationChannel,
    NotificationEvent,
    NotificationStatus,
)
from app.models.payment import PaymentIntent, PaymentIntentStatus
from app.models.rbac import RbacRole, UserRole
from app.models.registry_job import RegistryJob, RegistryJobStatus
from app.models.visit import Visit, VisitOutcome, VisitStatus
from app.models.wallet import LedgerEntryType, WalletAccount, WalletLedgerEntry

__all__ = [
    "ContractFlowRecord",
    "ContractFlowParty",
    "ContractFlowPartyRole",
    "ContractFlowPersonType",
    "ContractFlowSigningStatus",
    "HomeInfo",
    "DatingInfo",
    "MortgageInfo",
    "RentingInfo",
    "Signing",
    "Witness",
    "Listing",
    "DealType",
    "ListingVisibility",
    "ListingStatus",
    "CrmLead",
    "CrmActivity",
    "CrmLeadSource",
    "CrmActivityType",
    "Visit",
    "VisitStatus",
    "VisitOutcome",
    "WalletAccount",
    "WalletLedgerEntry",
    "LedgerEntryType",
    "PaymentIntent",
    "PaymentIntentStatus",
    "LegalReview",
    "LegalReviewStatus",
    "RegistryJob",
    "RegistryJobStatus",
    "NotificationEvent",
    "NotificationChannel",
    "NotificationStatus",
    "Province",
    "City",
    "RbacRole",
    "UserRole",
    "AuditLog",
    "AuditLogEntry",
    "PropertyRequirement",
    "RequirementStatus",
    "Conversation",
    "Message",
    "Rating",
    "RatingTargetType",
    "AnalyticsEvent",
    "Agency",
    "Region",
    "BetaInvitation",
    "OnboardingEvent",
    "SupportTicket",
    "SupportMessage",
    "SubscriptionPlan",
    "UserSubscription",
    "UserGamification",
    "ClientErrorReport",
    "Dispute",
    "DisputeCategory",
    "DisputeStatus",
    "DisputeResolutionType",
    "DisputeEvidence",
    "DisputeEvidenceType",
    "LedgerHold",
    "ContractCommission",
    "ContractCommissionType",
    "CommissionPaidBy",
    "CommissionRecordStatus",
    "CommissionPaymentMethod",
]
