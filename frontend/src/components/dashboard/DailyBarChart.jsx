import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function DailyBarChart({ data = [], loading }) {
  if (loading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  const chartData = data.map((item) => {
    const d = new Date(item.date + 'T00:00:00');

    return {
      amount: Number(item.total || 0),

      shortDate: d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),

      fullDate: d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  });

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            opacity={0.15}
          />

          <XAxis
            dataKey="shortDate"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            hide
          />

          <Tooltip
            formatter={(value) => [`₹${value}`, 'Spent']}
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.fullDate || ''
            }
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={3}
            fill="url(#expenseGradient)"
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}