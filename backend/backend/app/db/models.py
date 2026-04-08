from __future__ import annotations

from app.db.base import Base

# Import all models here so Alembic can discover them
from app.models.user import User  # noqa: F401
from app.models.property import Property  # noqa: F401
from app.models.contract import Contract  # noqa: F401
from app.models.contract_signature import ContractSignature  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.wallet import Wallet  # noqa: F401
from app.models.wallet_transaction import WalletTransaction  # noqa: F401
from app.models.referral import Referral  # noqa: F401
from app.models.campaign import Campaign  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.arbitration import Arbitration  # noqa: F401
from app.models.tenant_score_event import TenantScoreEvent  # noqa: F401
from app.models.arbitration_message import ArbitrationMessage  # noqa: F401
from app.models.arbitration_attachment import ArbitrationAttachment  # noqa: F401
from app.models.contract_wizard import WizardContract  # noqa: F401
from app.models.crm import CrmActivity, CrmLead  # noqa: F401
from app.models.crm_lead import CrmTask  # noqa: F401
from app.models.role import Role  # noqa: F401
from app.models.consultant_profile import ConsultantProfile  # noqa: F401
from app.models.market_requirement import MarketRequirement, PromoCode  # noqa: F401
