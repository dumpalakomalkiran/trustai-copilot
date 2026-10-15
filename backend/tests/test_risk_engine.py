
from app.main import TRANSACTIONS, assess


def test_expected_transaction_scores():
    expected = {
        "TX-DEMO-1001": (0, "LOW"),
        "TX-DEMO-1002": (100, "HIGH"),
        "TX-DEMO-1003": (40, "MEDIUM"),
        "TX-DEMO-1004": (0, "LOW"),
    }

    for tx in TRANSACTIONS:
        result = assess(tx)
        score, level = expected[tx["id"]]

        assert result["score"] == score
        assert result["level"] == level


def test_score_stays_within_valid_range():
    for tx in TRANSACTIONS:
        result = assess(tx)

        assert 0 <= result["score"] <= 100


def test_evidence_points_explain_score():
    for tx in TRANSACTIONS:
        result = assess(tx)

        evidence_total = sum(
            item["points"] for item in result["evidence"]
        )

        assert result["score"] == min(evidence_total, 100)


def test_high_risk_transaction_has_reasons():
    tx = next(
        item for item in TRANSACTIONS
        if item["id"] == "TX-DEMO-1002"
    )

    result = assess(tx)

    assert result["level"] == "HIGH"
    assert len(result["evidence"]) >= 3
    assert result["recommendation"]
    assert result["disclaimer"]
