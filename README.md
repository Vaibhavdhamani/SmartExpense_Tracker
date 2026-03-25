# 💸 ExpenseFlow — Smart Budget Tracker

A full-stack expense tracker built with **React + Bootstrap**, **Node.js + Express**, **MongoDB**, and a **Python ML service** for budget predictions.

---

## 🏗 Project Structure

```
ExpenseFlow/
├── backend/                  ← Node.js + Express + MongoDB
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/               ← Mongoose models
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── Expense.js
│   │   └── Budget.js
│   ├── routes/               ← REST API routes
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── budgetRoutes.js
│   │   └── userRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── ml_service/               ← Python Flask ML prediction service
│   ├── app.py
│   └── requirements.txt
│
└── frontend/                 ← React app (Create React App)
    ├── public/index.html
    └── src/
        ├── App.js
        ├── index.js
        ├── context/
        │   ├── AuthContext.js      ← JWT auth state
        │   └── ToastContext.js     ← Notification system
        ├── hooks/
        │   ├── useExpenses.js
        │   ├── useBudgets.js
        │   └── useCategories.js
        ├── services/api.js         ← Axios instance
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── ExpensesPage.jsx
        │   ├── BudgetsPage.jsx
        │   ├── PredictionsPage.jsx
        │   └── SettingsPage.jsx
        ├── components/
        │   ├── layout/MainLayout.jsx
        │   ├── dashboard/
        │   │   ├── KPICard.jsx
        │   │   ├── DonutChart.jsx      ← Pure SVG, no library
        │   │   └── DailyBarChart.jsx   ← Pure SVG, no library
        │   ├── expenses/
        │   │   └── ExpenseFormModal.jsx
        │   └── budgets/
        │       ├── BudgetAlerts.jsx
        │       └── BudgetFormModal.jsx
        └── styles/global.css
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`)
- Python 3.9+

---

### 1. Backend Setup

```bash
cd backend
cp .env.example .env          # Edit JWT_SECRET and MONGO_URI
npm install
npm run dev                   # Runs on http://localhost:5000
```

### 2. ML Service Setup

```bash
cd ml_service
pip install -r requirements.txt
python app.py                 # Runs on http://localhost:5001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start                     # Runs on http://localhost:3000
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, receive JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/categories` | ✅ | List all categories |
| GET | `/api/expenses?days=30` | ✅ | List expenses |
| GET | `/api/expenses/summary?days=30` | ✅ | Stats + chart data |
| POST | `/api/expenses` | ✅ | Add expense |
| PUT | `/api/expenses/:id` | ✅ | Update expense |
| DELETE | `/api/expenses/:id` | ✅ | Delete expense |
| GET | `/api/budgets/status` | ✅ | Budget status with spent amounts |
| POST | `/api/budgets` | ✅ | Create budget |
| PUT | `/api/budgets/:id` | ✅ | Update budget |
| DELETE | `/api/budgets/:id` | ✅ | Delete budget |
| PUT | `/api/users/settings` | ✅ | Update preferences |
| PUT | `/api/users/change-password` | ✅ | Change password |
| GET | `/api/users/export` | ✅ | Download CSV |
| DELETE | `/api/users/account` | ✅ | Delete account |

### ML Service (Python)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `http://localhost:5001/predict` | Run ML prediction |
| GET | `http://localhost:5001/health` | Health check |

---

## 🤖 ML Prediction Algorithm

The Python service uses:
1. **Exponential weighted moving average** — recent transactions count more
2. **Linear regression (numpy polyfit)** — identifies spending trend
3. **Projection** — forecasts daily average 15 days ahead × 30 = monthly prediction
4. **Confidence score** — based on coefficient of variation (lower variance = higher confidence)
5. **Category breakdown** — predicts per-category spending proportionally

Minimum 3 expenses required to generate a prediction.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Bootstrap 5, Bootstrap Icons |
| State | React Context API + Custom Hooks |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| ML | Python, Flask, NumPy |
| Charts | Pure SVG (no chart library) |
