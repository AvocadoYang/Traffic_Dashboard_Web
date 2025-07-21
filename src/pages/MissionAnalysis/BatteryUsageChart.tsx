// BatteryUsageChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const missionData = [
  {
    id: 'M1',
    batteryCost: 15,
    createdAt: '2025-06-05T10:00:00Z',
    totalDistanceTraveled: 120.5
  },
  {
    id: 'M2',
    batteryCost: 22,
    createdAt: '2025-06-05T11:00:00Z',
    totalDistanceTraveled: 95.3
  },
  {
    id: 'M3',
    batteryCost: 12,
    createdAt: '2025-06-05T12:00:00Z',
    totalDistanceTraveled: 140.7
  }
];

export const BatteryUsageChart = () => (
  <ResponsiveContainer width="100%" height={250}>
    <BarChart data={missionData}>
      <XAxis dataKey="id" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="batteryCost" fill="#8884d8" />
    </BarChart>
  </ResponsiveContainer>
);
