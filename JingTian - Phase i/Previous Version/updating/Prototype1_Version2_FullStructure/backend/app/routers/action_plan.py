"""EVA SQUARE — action plan completion-state endpoints (global per user,
matching frontend-v2's store.js#actionPlanDone shape: a flat {code: bool})."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/action-plan", tags=["action-plan"])


@router.get("")
def get_action_plan(user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    items = db.query(models.ActionPlanItem).filter_by(user_id=user.id).all()
    return {"done": {i.rec_code: i.done for i in items}}


@router.post("/toggle")
def toggle(body: schemas.ActionToggleIn, user: models.User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    item = db.query(models.ActionPlanItem).filter_by(user_id=user.id, rec_code=body.code).first()
    if not item:
        item = models.ActionPlanItem(user_id=user.id, rec_code=body.code, done=True)
        db.add(item)
    else:
        item.done = not item.done
    db.commit()
    items = db.query(models.ActionPlanItem).filter_by(user_id=user.id).all()
    return {"done": {i.rec_code: i.done for i in items}}
