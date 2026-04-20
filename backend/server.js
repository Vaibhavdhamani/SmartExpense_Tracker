const express   = require('express');
const cors      = require('cors');
const dotenv    = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
connectDB();

// ✅ FIXED CORS (www + non-www दोनों allow)
const allowedOrigins = [
  "https://expensetrack.tech",
  "https://www.expensetrack.tech"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed: " + origin));
    }
  },
  credentials: true
}));

// JSON middleware
app.use((req, res, next) => {
  express.json()(req, res, err => {
    if (err) return res.status(400).json({ success:false, error:'Invalid JSON' });
    next();
  });
});

// Routes
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/categories',    require('./routes/categoryRoutes'));
app.use('/api/expenses',      require('./routes/expenseRoutes'));
app.use('/api/budgets',       require('./routes/budgetRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/recurring',     require('./routes/recurringRoutes'));
app.use('/api/goals',         require('./routes/goalRoutes'));
app.use('/api/splits',        require('./routes/splitRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/ai',            require('./routes/aiRoutes'));
app.use('/api/reports',       require('./routes/reportRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status:'ok', service:'expenseflow-backend' })
);

// const sendEmail = require('./services/emailService');
const { sendEmail } = require('./services/emailService');

app.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: "vd150301@gmail.com", // यहाँ अपना email डालो
      subject: "Test Email",
      html: "<h1>Email Working ✅</h1>"
    });
    res.send("Email sent successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Email failed");
  }
});

// Cron jobs
require('./services/cronJobs');

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success:false, error: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));