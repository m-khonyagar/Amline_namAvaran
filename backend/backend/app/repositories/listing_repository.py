from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.listing import DealType, Listing, ListingStatus, ListingVisibility
from app.schemas.v1.listings import ListingCreate, ListingUpdate


def _build_search_document(
    title: str, location_summary: str, description: str | None
) -> str | None:
    parts = [title or "", location_summary or "", (description or "").strip()]
    s = " ".join(p for p in parts if p).strip()
    return s or None


class ListingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        visibility: Optional[ListingVisibility] = None,
        status: Optional[ListingStatus] = None,
        agency_id: Optional[str] = None,
    ) -> tuple[Sequence[Listing], int]:
        filters = []
        if visibility is not None:
            filters.append(Listing.visibility == visibility)
        if status is not None:
            filters.append(Listing.status == status)
        if agency_id is not None:
            filters.append(Listing.agency_id == agency_id)
        count_stmt = select(func.count()).select_from(Listing)
        stmt = select(Listing)
        for f in filters:
            count_stmt = count_stmt.where(f)
            stmt = stmt.where(f)
        total = int(self.db.scalar(count_stmt) or 0)
        stmt = stmt.order_by(Listing.created_at.desc()).offset(skip).limit(limit)
        rows = self.db.scalars(stmt).all()
        return rows, total

    def get(self, listing_id: str) -> Optional[Listing]:
        return self.db.get(Listing, listing_id)

    def get_by_ids_ordered(self, ids: list[str]) -> list[Listing]:
        if not ids:
            return []
        stmt = select(Listing).where(Listing.id.in_(ids))
        by_id = {r.id: r for r in self.db.scalars(stmt).all()}
        return [by_id[i] for i in ids if i in by_id]

    def create(self, data: ListingCreate) -> Listing:
        now = datetime.now(timezone.utc)
        row = Listing(
            deal_type=data.deal_type,
            visibility=data.visibility,
            price_amount=Decimal(str(data.price_amount)),
            currency=data.currency,
            location_summary=data.location_summary,
            title=data.title,
            description=data.description,
            owner_id=data.owner_id,
            status=data.status,
            inventory_file_id=data.inventory_file_id,
            area_sqm=Decimal(str(data.area_sqm)) if data.area_sqm is not None else None,
            room_count=data.room_count,
            latitude=Decimal(str(data.latitude)) if data.latitude is not None else None,
            longitude=(
                Decimal(str(data.longitude)) if data.longitude is not None else None
            ),
            search_document=_build_search_document(
                data.title, data.location_summary, data.description
            ),
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def update(self, row: Listing, data: ListingUpdate) -> Listing:
        now = datetime.now(timezone.utc)
        patch = data.model_dump(exclude_none=True)
        for k, v in patch.items():
            if k == "price_amount" and v is not None:
                v = Decimal(str(v))
            if k == "area_sqm" and v is not None:
                v = Decimal(str(v))
            if k in ("latitude", "longitude") and v is not None:
                v = Decimal(str(v))
            setattr(row, k, v)
        row.search_document = _build_search_document(
            row.title, row.location_summary, row.description
        )
        row.updated_at = now
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def archive(self, row: Listing) -> Listing:
        row.status = ListingStatus.ARCHIVED
        row.updated_at = datetime.now(timezone.utc)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_public_published(
        self, *, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[Listing], int]:
        filt = (Listing.visibility == ListingVisibility.PUBLIC) & (
            Listing.status == ListingStatus.PUBLISHED
        )
        total = int(
            self.db.scalar(select(func.count()).select_from(Listing).where(filt)) or 0
        )
        stmt = (
            select(Listing)
            .where(filt)
            .order_by(Listing.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all(), total

    def avg_price_published(self, deal_type: DealType) -> Decimal | None:
        filt = (Listing.status == ListingStatus.PUBLISHED) & (
            Listing.deal_type == deal_type
        )
        v = self.db.scalar(select(func.avg(Listing.price_amount)).where(filt))
        if v is None:
            return None
        return Decimal(str(v))

    def search_listings(
        self,
        *,
        q: str | None,
        deal_type: DealType | None,
        visibility: ListingVisibility | None,
        status: ListingStatus | None,
        price_min: Decimal | None,
        price_max: Decimal | None,
        skip: int,
        limit: int,
    ) -> tuple[Sequence[Listing], int]:
        stmt = select(Listing)
        filters = []
        if deal_type is not None:
            filters.append(Listing.deal_type == deal_type)
        if visibility is not None:
            filters.append(Listing.visibility == visibility)
        if status is not None:
            filters.append(Listing.status == status)
        if price_min is not None:
            filters.append(Listing.price_amount >= price_min)
        if price_max is not None:
            filters.append(Listing.price_amount <= price_max)
        bind = self.db.get_bind()
        use_pg_fts = bind.dialect.name == "postgresql" and bool(q and q.strip())
        if use_pg_fts:
            qraw = q.strip()
            vec = func.to_tsvector("simple", func.coalesce(Listing.search_document, ""))
            tsq = func.plainto_tsquery("simple", qraw)
            filters.append(vec.op("@@")(tsq))
            rank = func.ts_rank_cd(vec, tsq)
            for f in filters:
                stmt = stmt.where(f)
            count_stmt = select(func.count()).select_from(Listing)
            for f in filters:
                count_stmt = count_stmt.where(f)
            total = int(self.db.scalar(count_stmt) or 0)
            stmt = (
                stmt.order_by(rank.desc(), Listing.updated_at.desc())
                .offset(skip)
                .limit(limit)
            )
            return self.db.scalars(stmt).all(), total

        if q and q.strip():
            tokens = [t for t in q.strip().split() if t]
            for t in tokens:
                pat = f"%{t}%"
                filters.append(
                    or_(
                        Listing.title.ilike(pat),
                        Listing.description.ilike(pat),
                        Listing.location_summary.ilike(pat),
                        func.coalesce(Listing.search_document, "").ilike(pat),
                    )
                )
        for f in filters:
            stmt = stmt.where(f)
        count_stmt = select(func.count()).select_from(Listing)
        for f in filters:
            count_stmt = count_stmt.where(f)
        total = int(self.db.scalar(count_stmt) or 0)
        stmt = stmt.order_by(Listing.updated_at.desc()).offset(skip).limit(limit)
        return self.db.scalars(stmt).all(), total

    def search_listings_map_bbox(
        self,
        *,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        deal_type: DealType | None,
        visibility: ListingVisibility | None,
        status: ListingStatus | None,
        skip: int,
        limit: int,
    ) -> tuple[Sequence[Listing], int]:
        stmt = select(Listing).where(
            Listing.latitude.isnot(None),
            Listing.longitude.isnot(None),
            Listing.latitude >= min_lat,
            Listing.latitude <= max_lat,
            Listing.longitude >= min_lng,
            Listing.longitude <= max_lng,
        )
        filters_extra = []
        if deal_type is not None:
            filters_extra.append(Listing.deal_type == deal_type)
        if visibility is not None:
            filters_extra.append(Listing.visibility == visibility)
        if status is not None:
            filters_extra.append(Listing.status == status)
        for f in filters_extra:
            stmt = stmt.where(f)
        count_stmt = (
            select(func.count())
            .select_from(Listing)
            .where(
                Listing.latitude.isnot(None),
                Listing.longitude.isnot(None),
                Listing.latitude >= min_lat,
                Listing.latitude <= max_lat,
                Listing.longitude >= min_lng,
                Listing.longitude <= max_lng,
            )
        )
        for f in filters_extra:
            count_stmt = count_stmt.where(f)
        total = int(self.db.scalar(count_stmt) or 0)
        stmt = stmt.order_by(Listing.updated_at.desc()).offset(skip).limit(limit)
        return self.db.scalars(stmt).all(), total

    def list_page_cursor(
        self,
        *,
        limit: int,
        cursor_id: Optional[str],
        visibility: Optional[ListingVisibility] = None,
        status: Optional[ListingStatus] = None,
    ) -> Tuple[List[Listing], Optional[str]]:
        filters = []
        if visibility is not None:
            filters.append(Listing.visibility == visibility)
        if status is not None:
            filters.append(Listing.status == status)
        stmt = select(Listing)
        for f in filters:
            stmt = stmt.where(f)
        if cursor_id:
            ref = self.get(cursor_id)
            if ref is not None:
                stmt = stmt.where(
                    or_(
                        Listing.created_at < ref.created_at,
                        and_(Listing.created_at == ref.created_at, Listing.id < ref.id),
                    )
                )
        stmt = stmt.order_by(Listing.created_at.desc(), Listing.id.desc()).limit(
            limit + 1
        )
        rows = list(self.db.scalars(stmt).all())
        next_cursor: Optional[str] = None
        if len(rows) > limit:
            rows = rows[:limit]
            next_cursor = rows[-1].id if rows else None
        return rows, next_cursor
