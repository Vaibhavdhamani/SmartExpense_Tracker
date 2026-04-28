import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Area,
  Scatter,
} from 'recharts';

export default function DailyBarChart({ data = [], loading }) {
  const chartData = useMemo(() => {
    const map = {};

    data.forEach((item) => {
      const key = String(item.date).slice(0, 10);
      map[key] = (map[key] || 0) + Number(item.total || 0);
    });

    const result = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(today.getDate() - i);

      const key =
        d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0');

      result.push({
        day: i, // FIX: numeric x-axis avoids repeated labels issue
        date: key,
        label: d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        fullDate: d.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        amount: map[key] || 0,
      });
    }

    return result;
  }, [data]);

  if (loading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            opacity={0.3}
          />

          {/* IMPORTANT FIX */}
          <XAxis
            type="number"
            dataKey="day"
            domain={[0, 13]}
            ticks={[0,1,2,3,4,5,6,7,8,9,10,11,12,13]}
            tickFormatter={(value) => chartData[value]?.label || ''}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis hide />

          <Tooltip
            formatter={(value) => [`₹${value}`, 'Spent']}
            labelFormatter={(value) =>
              chartData[value]?.fullDate || ''
            }
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
            }}
          />

          <Area
            type="linear"
            dataKey="amount"
            fill="url(#expenseFill)"
            stroke="none"
          />

          <Bar
            dataKey="amount"
            fill="#6366f1"
            radius={[8, 8, 0, 0]}
            barSize={16}
          />

          <Scatter dataKey="amount" fill="#4338ca" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}