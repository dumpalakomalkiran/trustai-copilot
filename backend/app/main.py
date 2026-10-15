from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.investigation import explain_investigation


app = FastAPI(
    title="TrustAI Copilot API",
    description="Prototype API for explainable payment-risk investigations.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Synthetic examples only. These are not real transactions or PayPal risk signals.
TRANSACTIONS = [
    {
        "id": "TX-DEMO-1001",
        "customer": "A. Sharma",
        "amount": 89.99,
        "currency": "USD",
        "status": "COMPLETED",
        "attempts_24h": 1,
        "customer_age_days": 420,
        "shipping_billing_match": True,
        "order_value_vs_customer_avg": 1.1,
        "created_at": "2026-10-13T10:20:00Z",
    },
    {
        "id": "TX-DEMO-1002",
        "customer": "J. Patel",
        "amount": 1249.00,
        "currency": "USD",
        "status": "COMPLETED",
        "attempts_24h": 5,
        "customer_age_days": 3,
        "shipping_billing_match": False,
        "order_value_vs_customer_avg": 6.8,
        "created_at": "2026-10-13T11:05:00Z",
    },
    {
        "id": "TX-DEMO-1003",
        "customer": "M. Chen",
        "amount": 245.50,
        "currency": "USD",
        "status": "PENDING_REVIEW",
        "attempts_24h": 3,
        "customer_age_days": 22,
        "shipping_billing_match": True,
        "order_value_vs_customer_avg": 3.2,
        "created_at": "2026-10-13T12:40:00Z",
    },
    {
        "id": "TX-DEMO-1004",
        "customer": "R. Wilson",
        "amount": 59.00,
        "currency": "USD",
        "status": "COMPLETED",
        "attempts_24h": 1,
        "customer_age_days": 800,
        "shipping_billing_match": True,
        "order_value_vs_customer_avg": 0.9,
        "created_at": "2026-10-13T13:15:00Z",
    },
]



class InvestigationRequest(BaseModel):
    question: str = Field(
        default="Explain this transaction's risk assessment.",
        min_length=1,
        max_length=1000,
    )


class ReviewRequest(BaseModel):
    status: str = Field(
        ...,
        pattern="^(approved|rejected|escalated)$",
    )
    note: str = Field(default="", max_length=1000)



def assess(tx: dict) -> dict:
    score = 0
    evidence = []

    def add_signal(signal: str, detail: str, points: int):
        nonlocal score
        score += points
        evidence.append({
            "signal": signal,
            "detail": detail,
            "points": points,
        })

    # Rule 1: Repeated payment attempts
    attempts = tx["attempts_24h"]
    if attempts >= 4:
        add_signal(
            "Repeated payment attempts",
            f"{attempts} attempts in 24 hours.",
            30,
        )
    elif attempts >= 3:
        add_signal(
            "Elevated payment attempts",
            f"{attempts} attempts in 24 hours; investigate whether retries are expected.",
            15,
        )

    # Rule 2: Customer profile age
    age = tx["customer_age_days"]
    if age < 7:
        add_signal(
            "Very new customer profile",
            f"Profile age is {age} days.",
            20,
        )
    elif age < 30:
        add_signal(
            "Recently created customer profile",
            f"Profile age is {age} days.",
            10,
        )

    # Rule 3: Shipping and billing address mismatch
    if not tx["shipping_billing_match"]:
        add_signal(
            "Address mismatch",
            "Shipping and billing details do not match in the synthetic demo data.",
            20,
        )

    # Rule 4: Order value compared with the customer's sample average
    ratio = tx["order_value_vs_customer_avg"]
    if ratio >= 5:
        add_signal(
            "Unusually high order value",
            f"Order value is {ratio}x the sample customer average.",
            30,
        )
    elif ratio >= 3:
        add_signal(
            "Elevated order value",
            f"Order value is {ratio}x the sample customer average.",
            15,
        )

    # Cap the score and assign a transparent demo risk category
    score = min(score, 100)

    if score >= 60:
        level = "HIGH"
        recommendation = (
            "Pause fulfillment pending manual review. Verify the order "
            "details and payment context before deciding what to do."
        )
    elif score >= 30:
        level = "MEDIUM"
        recommendation = (
            "Review the supporting details and investigate the triggered "
            "signals before fulfillment."
        )
    else:
        level = "LOW"
        recommendation = (
            "No strong combination of listed demo rules was triggered. "
            "Continue normal merchant checks; a low score does not "
            "guarantee that a transaction is safe."
        )

    return {
        "score": score,
        "level": level,
        "evidence": evidence,
        "recommendation": recommendation,
        "disclaimer": (
            "Prototype heuristic based on synthetic data. This is not "
            "a calibrated fraud probability, an official PayPal risk "
            "score, or a determination that a transaction is fraudulent."
        ),
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "trustai-copilot-api", "mode": "synthetic-demo"}


@app.get("/api/transactions")
def list_transactions():
    return [
        {**tx, "assessment": assess(tx)}
        for tx in TRANSACTIONS
    ]


@app.get("/api/transactions/{transaction_id}")
def get_transaction(transaction_id: str):
    for tx in TRANSACTIONS:
        if tx["id"] == transaction_id:
            return {**tx, "assessment": assess(tx)}
    raise HTTPException(status_code=404, detail="Transaction not found")


@app.post("/api/transactions/{transaction_id}/review")
def record_review(transaction_id: str, request: ReviewRequest):
    for tx in TRANSACTIONS:
        if tx["id"] == transaction_id:
            # This starter returns the decision but does not persist it yet.
            return {
                "transaction_id": transaction_id,
                "decision": request.decision,
                "note": request.note,
                "message": "Demo decision accepted. Persistence will be added in the next milestone.",
            }
    raise HTTPException(status_code=404, detail="Transaction not found")


@app.post("/api/transactions/{transaction_id}/investigate")
def investigate_transaction(
    transaction_id: str,
    request: InvestigationRequest,
):
    tx = next(
        (item for item in TRANSACTIONS if item["id"] == transaction_id),
        None,
    )

    if tx is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    assessment = assess(tx)

    try:
        return explain_investigation(
            transaction=tx,
            assessment=assessment,
            question=request.question,
        )
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Investigation service is temporarily unavailable.",
        )
