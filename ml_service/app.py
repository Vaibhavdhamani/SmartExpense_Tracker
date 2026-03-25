"""
ExpenseFlow ML Service
- Budget prediction using weighted moving average + linear trend
- Expense pattern analysis
- Runs on port 5001
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
from collections import defaultdict

app = Flask(__name__)
CORS(app)


def predict_spending(expenses: list) -> tuple:
    """
    Predict next 30 days spending from expense history.

    Args:
        expenses: list of {amount, date, category}

    Returns:
        (result_dict, error_string)
    """
    if not expenses or len(expenses) < 3:
        return None, "Need at least 3 expenses to generate a prediction."

    # ── Parse expenses ────────────────────────────────────────────────────────
    parsed = []
    for e in expenses:
        try:
            date_str = e.get("date", "")
            # Handle ISO format with or without Z / timezone
            date_str = date_str.replace("Z", "").split("+")[0].split(".")[0]
            d = datetime.fromisoformat(date_str)
            parsed.append({
                "amount": float(e.get("amount", 0)),
                "date": d,
                "category": e.get("category", "Others")
            })
        except Exception:
            pass

    if len(parsed) < 3:
        return None, "Could not parse enough expense dates."

    parsed.sort(key=lambda x: x["date"])

    # ── Build daily totals ────────────────────────────────────────────────────
    daily = defaultdict(float)
    for e in parsed:
        key = e["date"].date()
        daily[key] += e["amount"]

    days_list = sorted(daily.keys())
    amounts   = np.array([daily[d] for d in days_list], dtype=float)
    n         = len(amounts)

    # ── Weighted moving average (exponential weights → recent days count more) ─
    weights = np.exp(np.linspace(0, 1, n))
    weights /= weights.sum()
    weighted_avg = float(np.dot(weights, amounts))

    # ── Linear trend via least-squares ───────────────────────────────────────
    x = np.arange(n, dtype=float)
    if n >= 4:
        slope, intercept = np.polyfit(x, amounts, 1)
        # Project 15 days into future (mid-point of next 30 days)
        projected_daily = max(0.0, weighted_avg + slope * 15)
    else:
        projected_daily = weighted_avg

    predicted_amount = round(projected_daily * 30, 2)

    # ── Confidence score (inverse of coefficient of variation) ───────────────
    if n >= 7:
        std  = float(np.std(amounts))
        mean = float(np.mean(amounts)) or 1.0
        cv   = std / mean
        confidence = float(np.clip(1.0 - cv * 0.5, 0.40, 0.97))
    else:
        confidence = 0.50  # not enough data for high confidence

    # ── Category breakdown ────────────────────────────────────────────────────
    cat_totals = defaultdict(float)
    for e in parsed:
        cat_totals[e["category"]] += e["amount"]

    total_all = sum(cat_totals.values()) or 1.0
    category_predictions = {
        cat: round(predicted_amount * (total / total_all), 2)
        for cat, total in cat_totals.items()
    }

    # ── Spending trend (last 7 days vs previous 7 days) ──────────────────────
    now = datetime.utcnow()
    last7  = sum(e["amount"] for e in parsed if (now - e["date"]).days <= 7)
    prev7  = sum(e["amount"] for e in parsed if 7 < (now - e["date"]).days <= 14)
    trend  = ((last7 - prev7) / prev7 * 100) if prev7 > 0 else 0.0

    # ── Insights ──────────────────────────────────────────────────────────────
    top_cat = max(cat_totals, key=cat_totals.get) if cat_totals else "N/A"
    insights = {
        "totalSpending":    round(sum(e["amount"] for e in parsed), 2),
        "avgDaily":         round(float(np.mean(amounts)), 2),
        "numTransactions":  len(parsed),
        "avgTransaction":   round(sum(e["amount"] for e in parsed) / len(parsed), 2),
        "maxTransaction":   round(max(e["amount"] for e in parsed), 2),
        "trendPercent":     round(trend, 1),
        "topCategory":      top_cat,
        "categoryBreakdown": dict(cat_totals)
    }

    return {
        "predictedAmount":       predicted_amount,
        "confidenceScore":       round(confidence, 3),
        "dailyAverage":          round(projected_daily, 2),
        "dataPoints":            n,
        "categoryPredictions":   category_predictions,
        "predictionPeriod":      "next_30_days",
        "insights":              insights
    }, None


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    data     = request.get_json(force=True)
    expenses = data.get("expenses", [])

    result, error = predict_spending(expenses)
    if error:
        return jsonify({"success": False, "error": error}), 400

    return jsonify({"success": True, "data": result}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "expenseflow-ml"}), 200


if __name__ == "__main__":
    print("🤖 ML Service starting on http://localhost:5001")
    app.run(debug=True, host="0.0.0.0", port=5001)
