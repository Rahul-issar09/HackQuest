"use client";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const axis = { stroke: "hsl(218 16% 66%)", fontSize: 12 };
const tip = { contentStyle: { background: "hsl(222 32% 11%)", border: "1px solid hsl(222 22% 22%)", borderRadius: 8, color: "#e6edf7" } };

export function RateBarChart({ data, unit = "%" }: { data: { name: string; value: number; n: number }[]; unit?: string }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Bar chart of solve rate by category. Values are also listed in the table below.">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
          <CartesianGrid stroke="hsl(222 22% 22%)" vertical={false} />
          <XAxis dataKey="name" {...axis} interval={0} tick={{ ...axis, fontSize: 11 }} />
          <YAxis {...axis} domain={[0, 100]} unit={unit} />
          <Tooltip {...tip} formatter={(v, _n, p) => [`${Number(v)}% (${(p.payload as { n: number }).n} attempts)`, "Solve rate"]} />
          <Bar dataKey="value" fill="hsl(214 95% 62%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLineChart({ data, unit, label }: { data: { name: string; value: number }[]; unit: string; label: string }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`Line chart: ${label}`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
          <CartesianGrid stroke="hsl(222 22% 22%)" vertical={false} />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} unit={unit} />
          <Tooltip {...tip} />
          <Line type="monotone" dataKey="value" stroke="hsl(214 95% 62%)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MinutesBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Bar chart of study minutes per day">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
          <CartesianGrid stroke="hsl(222 22% 22%)" vertical={false} />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} unit="m" />
          <Tooltip {...tip} formatter={(v) => [`${Number(v)} min`, "Study time"]} />
          <Bar dataKey="value" fill="hsl(148 60% 50%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
