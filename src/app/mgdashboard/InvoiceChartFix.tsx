"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Props = {
  theme: "light" | "dark";
};

const data = [
  { month: "Jun", invoices: 300 },
  { month: "Jul", invoices: 200 },
  { month: "Aug", invoices: 400 },
  { month: "Sep", invoices: 350 },
];

export default function InvoiceChart({ theme }: Props) {
  return (
    
    <div
      className={`p-4 rounded-2xl shadow-xl border backdrop-blur-xl ${
        theme === "dark"
          ? "bg-white/10 border-white/20 text-white"
          : "bg-white/70 border-gray-200 text-gray-900"
      }`}
    >
     {/* <h2 className="font-bold mb-4">💰 Invoice Overview</h2> */}
      
      <ResponsiveContainer width="100%" height={300}>
        
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#d1d5db"} />
          <XAxis dataKey="month" stroke={theme === "dark" ? "#e5e7eb" : "#374151"} />
          <YAxis stroke={theme === "dark" ? "#e5e7eb" : "#374151"} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme === "dark" ? "#1f2937" : "#f9fafb",
              borderRadius: "12px",
              border: "none",
              color: theme === "dark" ? "#f9fafb" : "#111827",
            }}
          />
          <Line type="monotone" dataKey="invoices" stroke="#1c5fc9ff" strokeWidth={3} dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
