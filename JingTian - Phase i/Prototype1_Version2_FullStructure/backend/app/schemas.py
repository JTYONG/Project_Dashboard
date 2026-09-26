"""EVA SQUARE — Pydantic request/response schemas.

Complex nested payloads (profile, labs, analysis results) are typed as
`dict` on purpose: their shape is defined by the engine modules (see
app/engines/) and documented in the top-level README rather than
duplicated here field-by-field. Request bodies that a human actually fills
in (register, login, verify edits, questionnaire answers) are fully typed
so FastAPI validates them and generates accurate OpenAPI docs at /docs.
"""
from typing import Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    fullName: str
    email: EmailStr
    password: str = Field(min_length=4)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    token: str
    user: dict


class ConsentPatch(BaseModel):
    kind: str  # "required" | "optional"
    id: str
    value: bool


class AcceptTermsIn(BaseModel):
    pass


class SampleReportIn(BaseModel):
    scenario: str  # "routine" | "urgent"
    fileName: Optional[str] = None
    fullPipeline: bool = False  # true = also verify + seed questionnaire + run analysis


class VerifyIn(BaseModel):
    values: Dict[str, float]


class AnswersPatch(BaseModel):
    patch: Dict[str, Any]


class SettingsPatch(BaseModel):
    units: Optional[str] = None
    notifications: Optional[bool] = None
    theme: Optional[str] = None


class ActionToggleIn(BaseModel):
    code: str
