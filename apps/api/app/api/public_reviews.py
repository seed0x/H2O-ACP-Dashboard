from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from .. import crud_reviews, schemas

router = APIRouter(prefix="/public/reviews", tags=["public-reviews"])

@router.post("", response_model=schemas.ReviewOut, status_code=status.HTTP_201_CREATED)
async def submit_review(
    review_in: schemas.PublicReviewCreate,
    db: AsyncSession = Depends(get_session),
):
    """Submit a public review using a review request token"""
    try:
        review = await crud_reviews.create_review(db, review_in, changed_by="customer")
        return review
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("", response_model=list[schemas.ReviewOut])
async def get_public_reviews(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_session),
):
    """Get public reviews (for display on public review page)"""
    reviews = await crud_reviews.list_reviews(
        db, tenant_id=None, is_public=True, limit=limit, offset=offset
    )
    return reviews







