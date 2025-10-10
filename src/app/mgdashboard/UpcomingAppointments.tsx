"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type Appointment = {
  date: string;
  time: string; // e.g., "10:00 AM"
  priority: "High" | "Medium" | "Low";
  details: string;
};

const appointments: Appointment[] = [
  {
    date: "Aug 22",
    time: "10:00 AM",
    priority: "High",
    details: "Client Call",
  },
  {
    date: "Aug 23",
    time: "02:30 PM",
    priority: "Low",
    details: "Follow-up Email",
  },
  {
    date: "Aug 24",
    time: "11:15 AM",
    priority: "Medium",
    details: "Design Review",
  },
  {
    date: "Aug 25",
    time: "03:00 PM",
    priority: "High",
    details: "Strategy Session",
  },
];

const priorityColors: Record<Appointment["priority"], string> = {
  High: "#f45353ff", // Red
  Medium: "#f1b03eff", // Amber
  Low: "#5694f9ff", // Blue
};

export default function AppointmentTime({
  theme,
}: {
  theme: "light" | "dark";
}) {
  const data = appointments.map((a, i) => ({
    id: i,
    date: a.date,
    label: `${a.time}`,
    priority: a.priority,
    details: a.details,
    value: i + 1, // just to render bars
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 80, bottom: 10 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={
            theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
          }
        />
        <XAxis type="number" hide />
        <YAxis
          dataKey="date"
          type="category"
          tick={{ fill: theme === "dark" ? "#e6edf3" : "#111" }}
        />
        <Tooltip
          contentStyle={{
            background: theme === "dark" ? "#c3d4ebff" : "#fff",
            color: theme === "dark" ? "#f3f4f6" : "#322b2bff",
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          }}
          formatter={(_, __, entry: any) => [
            `${entry.payload.label} — ${entry.payload.details}`,
            `Priority: ${entry.payload.priority}`,
          ]}
        />
        <Bar dataKey="value" barSize={28} radius={[8, 8, 8, 8]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={priorityColors[entry.priority]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
