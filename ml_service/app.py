"""
ExpenseFlow ML Service — v2 (Robust Algorithm)
================================================
Problems fixed vs v1:
  1. Outlier resistance  — IQR-based outlier detection, winsorization
  2. Median-based core   — median beats mean on skewed/high data
  3. Recency bias        — last 30 days weighted 2x vs older data
  4. Trend dampening     — slope is capped so one big month doesn't explode forecast
  5. Monthly normalisation — works on per-month spend, not per-day (handles sparse data)
  6. Confidence score    — properly reflects outlier-heavy datasets (lower confidence)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

app = Flask(__name__)
CORS(app, origins=["https://smart-expense-tracker-sigma-sable.vercel.app"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def parse_expenses(expenses: list) -> list:
    """Parse raw expense list into clean dicts. Skip unparseable entries."""
    parsed = []
    for e in expenses:
        try:
            raw = e.get("date", "")
            raw = raw.replace("Z", "").split("+")[0].split(".")[0]
            d   = datetime.fromisoformat(raw)
            amt = float(e.get("amount", 0))
            if amt <= 0:
                continue
            parsed.append({
                "amount":   amt,
                "date":     d,
                "category": str(e.get("category", "Others")).strip(),
            })
        except Exception:
            pass
    return sorted(parsed, key=lambda x: x["date"])


def remove_outliers_iqr(values: np.ndarray, factor: float = 2.0) -> np.ndarray:
    """
    Winsorize values: clip to [Q1 - factor*IQR, Q3 + factor*IQR].
    Returns the clipped array (same length, no removal).
    factor=2.0 is gentler than the classic 1.5 — keeps more data valid.
    """
    if len(values) < 4:
        return values
    q1, q3 = np.percentile(values, [25, 75])
    iqr     = q3 - q1
    lo      = q1 - factor * iqr
    hi      = q3 + factor * iqr
    return np.clip(values, max(lo, 0), hi)


def monthly_buckets(parsed: list) -> dict:
    """
    Aggregate expenses into calendar months.
    Returns {(year, month): total_spent}
    """
    buckets = defaultdict(float)
    for e in parsed:
        key = (e["date"].year, e["date"].month)
        buckets[key] += e["amount"]
    return buckets


def weighted_median(values: np.ndarray, weights: np.ndarray) -> float:
    """Compute weighted median."""
    idx    = np.argsort(values)
    sv, sw = values[idx], weights[idx]
    cw     = np.cumsum(sw)
    total  = cw[-1]
    cutoff = total / 2.0
    pos    = np.searchsorted(cw, cutoff)
    return float(sv[min(pos, len(sv) - 1)])


# ─────────────────────────────────────────────────────────────────────────────
# Core prediction function
# ─────────────────────────────────────────────────────────────────────────────

def predict_spending(expenses: list) -> tuple:
    """
    Robust prediction pipeline:
      1. Parse & sort
      2. Build monthly buckets
      3. Outlier-winsorize monthly totals
      4. Weighted median (recent months 2x weight)
      5. Damped linear trend
      6. Confidence from IQR / median ratio
      7. Category breakdown
    """
    MIN_EXPENSES = 3
    if not expenses or len(expenses) < MIN_EXPENSES:
        return None, f"At least {MIN_EXPENSES} expenses required."

    parsed = parse_expenses(expenses)
    if len(parsed) < MIN_EXPENSES:
        return None, "Could not parse enough valid expenses."

    now = datetime.utcnow()

    # ── Step 1: Monthly buckets ───────────────────────────────────────────────
    buckets = monthly_buckets(parsed)
    if not buckets:
        return None, "Could not build monthly buckets."

    # Sort months chronologically
    sorted_months = sorted(buckets.keys())
    monthly_totals = np.array([buckets[m] for m in sorted_months], dtype=float)
    n_months = len(monthly_totals)

    # ── Step 2: Winsorize monthly totals (handle one-off expensive months) ────
    winsorized = remove_outliers_iqr(monthly_totals, factor=2.0)

    # ── Step 3: Recency-weighted median ──────────────────────────────────────
    # Last month gets weight 2.0, earlier months decay linearly to 0.5
    weights = np.linspace(0.5, 2.0, n_months)
    base_prediction = weighted_median(winsorized, weights)

    # ── Step 4: Damped linear trend ───────────────────────────────────────────
    damped_prediction = base_prediction
    if n_months >= 3:
        x = np.arange(n_months, dtype=float)
        try:
            slope, _ = np.polyfit(x, winsorized, 1)
            # Dampen slope heavily — cap at ±20% of base prediction per month
            max_slope = base_prediction * 0.20
            slope_capped = float(np.clip(slope, -max_slope, max_slope))
            # Project 1 month ahead
            trend_adjustment = slope_capped * 1.0
            damped_prediction = max(0.0, base_prediction + trend_adjustment)
        except Exception:
            pass

    predicted_amount = round(float(damped_prediction), 2)

    # ── Step 5: Confidence score ──────────────────────────────────────────────
    # Based on coefficient of variation of WINSORIZED data
    # More variation → lower confidence
    if n_months >= 3:
        med  = float(np.median(winsorized)) or 1.0
        q1c, q3c = np.percentile(winsorized, [25, 75])
        iqr_ratio = (q3c - q1c) / med  # normalized spread

        # Check how many outliers were present (original vs winsorized)
        outlier_count = int(np.sum(np.abs(monthly_totals - winsorized) > 1.0))
        outlier_penalty = min(outlier_count * 0.08, 0.30)

        raw_confidence = max(0.0, 1.0 - iqr_ratio * 0.6 - outlier_penalty)
        confidence = float(np.clip(raw_confidence, 0.35, 0.95))
    else:
        confidence = 0.40

    # ── Step 6: Category breakdown ────────────────────────────────────────────
    # Use only last 60 days for category ratios (more relevant)
    cutoff_60 = now - timedelta(days=60)
    recent    = [e for e in parsed if e["date"] >= cutoff_60]
    cat_source = recent if len(recent) >= 3 else parsed

    cat_totals = defaultdict(float)
    for e in cat_source:
        cat_totals[e["category"]] += e["amount"]

    total_cat = sum(cat_totals.values()) or 1.0
    category_predictions = {
        cat: round(predicted_amount * (amt / total_cat), 2)
        for cat, amt in sorted(cat_totals.items(), key=lambda x: -x[1])
    }

    # ── Step 7: Trend % (last 30 days vs previous 30 days) ───────────────────
    cut30 = now - timedelta(days=30)
    cut60 = now - timedelta(days=60)
    last30 = sum(e["amount"] for e in parsed if e["date"] >= cut30)
    prev30 = sum(e["amount"] for e in parsed if cut60 <= e["date"] < cut30)
    trend_pct = round(((last30 - prev30) / prev30 * 100) if prev30 > 0 else 0.0, 1)

    # ── Step 8: Insights ──────────────────────────────────────────────────────
    all_amounts = np.array([e["amount"] for e in parsed])
    top_cat     = max(cat_totals, key=cat_totals.get) if cat_totals else "N/A"

    # Days spanned
    date_span = max((parsed[-1]["date"] - parsed[0]["date"]).days, 1)
    avg_daily = round(sum(e["amount"] for e in parsed) / date_span, 2)

    insights = {
        "totalSpending":     round(float(np.sum(all_amounts)), 2),
        "avgDaily":          avg_daily,
        "medianMonthly":     round(float(np.median(monthly_totals)), 2),
        "numTransactions":   len(parsed),
        "avgTransaction":    round(float(np.mean(all_amounts)), 2),
        "medianTransaction": round(float(np.median(all_amounts)), 2),
        "maxTransaction":    round(float(np.max(all_amounts)), 2),
        "trendPercent":      trend_pct,
        "topCategory":       top_cat,
        "monthsAnalyzed":    n_months,
        "outliersDetected":  int(np.sum(np.abs(monthly_totals - winsorized) > 1.0)),
        "categoryBreakdown": dict(cat_totals),
    }

    return {
        "predictedAmount":     predicted_amount,
        "confidenceScore":     round(confidence, 3),
        "dailyAverage":        round(predicted_amount / 30, 2),
        "dataPoints":          len(parsed),
        "monthsAnalyzed":      n_months,
        "categoryPredictions": category_predictions,
        "predictionPeriod":    "next_30_days",
        "algorithm":           "robust_v2_winsorized_median",
        "insights":            insights,
    }, None


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return "ML Service Running 🚀"
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data     = request.get_json(force=True) or {}
        expenses = data.get("expenses", [])
        if not isinstance(expenses, list):
            return jsonify({"success": False, "error": "expenses must be a list"}), 400

        result, error = predict_spending(expenses)
        if error:
            return jsonify({"success": False, "error": error}), 400

        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "ok",
        "service":   "expenseflow-ml",
        "algorithm": "robust_v2",
    }), 200


if __name__ == "__main__":
    print("🤖 ML Service v2 (Robust) — http://localhost:5001")
    app.run(debug=True, host="0.0.0.0", port=5001)