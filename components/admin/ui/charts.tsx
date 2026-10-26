"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMotionSafe } from "./motion";

const GREEN = "#16A34A";
const MUTED = "#a1a1aa";

export function RevenueChart({
  days,
  revenue,
  previous
}: {
  days: string[];
  revenue: number[];
  previous: number[];
}) {
  const reduce = useMotionSafe();
  const data = days.map((day, index) => ({
    day: day.slice(5),
    revenue: Math.round((revenue[index] || 0) / 100),
    previous: Math.round((previous[index] || 0) / 100)
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke={MUTED} />
          <YAxis tick={{ fontSize: 11 }} stroke={MUTED} />
          <Tooltip />
          <Area type="monotone" dataKey="previous" stroke={MUTED} fill="transparent" strokeDasharray="4 4" isAnimationActive={!reduce} />
          <Area type="monotone" dataKey="revenue" stroke={GREEN} fill={GREEN} fillOpacity={0.12} isAnimationActive={!reduce} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MixDonut({ rows }: { rows: { name: string; count: number }[] }) {
  const reduce = useMotionSafe();
  const colors = ["#16A34A", "#0F766E", "#65A30D", "#0284C7", "#7C3AED", "#B45309"];
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="count" nameKey="name" innerRadius={48} outerRadius={72} isAnimationActive={!reduce}>
            {rows.map((row, index) => (
              <Cell key={row.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelBars({ steps }: { steps: { name: string; value: number }[] }) {
  const reduce = useMotionSafe();
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={MUTED} />
          <YAxis tick={{ fontSize: 11 }} stroke={MUTED} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill={GREEN} radius={[6, 6, 0, 0]} isAnimationActive={!reduce} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
