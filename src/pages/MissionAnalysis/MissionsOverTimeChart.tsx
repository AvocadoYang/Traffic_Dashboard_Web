// MissionsOverTimeChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const aggregatedByTime = [
  { date: '2025-06-05', count: 3 },
  { date: '2025-06-06', count: 7 }
];

export const MissionsOverTimeChart = () => (
  <ResponsiveContainer width="100%" height={250}>
    <LineChart data={aggregatedByTime}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="count" stroke="#82ca9d" />
    </LineChart>
  </ResponsiveContainer>
);
