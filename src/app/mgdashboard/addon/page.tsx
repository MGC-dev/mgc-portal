"use client";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import {
  Bell,
  Search,
  LayoutDashboard,
  Calendar,
  FileText,
  FileSignature,
  BookOpen,
  HelpCircle,
  PlusSquare,
  User,
} from "lucide-react";
import { useState } from "react";

export default function ServiceAddOns() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      {/* Sidebar (mobile overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          {/* Topbar */}

          {/* Service Add-ons */}
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Service Add-ons</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AddOnCard
                title="Priority Support"
                description="Get priority response times and dedicated support"
                price="$99/month"
                features={[
                  "24/7 support",
                  "Priority queue",
                  "Dedicated contact",
                ]}
                buttonText="Add to Plan"
                status="Available"
                available
              />
              <AddOnCard
                title="Advanced Analytics"
                description="Detailed insights and custom reporting"
                price="$149/month"
                features={[
                  "Custom dashboards",
                  "Advanced metrics",
                  "Export capabilities",
                ]}
                buttonText="Add to Plan"
                status="Available"
                available
              />
              <AddOnCard
                title="API Access"
                description="Integrate with your existing systems"
                price="$199/month"
                features={["REST API", "Webhooks", "Developer documentation"]}
                buttonText="Notify When Available"
                status="Coming Soon"
                available={false}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Sidebar item
function SidebarItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm font-medium ${
        active ? "bg-blue-800 text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

// Add-on cards
function AddOnCard({
  title,
  description,
  price,
  features,
  buttonText,
  status,
  available,
}: {
  title: string;
  description: string;
  price: string;
  features: string[];
  buttonText: string;
  status: string;
  available: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex flex-col justify-between border">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{title}</h2>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              available
                ? "bg-blue-300 text-blue-800"
                : "bg-green-300 text-green-800"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <p className="text-lg font-bold mb-3">{price}</p>
        <ul className="space-y-1 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-center text-sm text-gray-700">
              <span className="text-green-600 mr-2">✔</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        className={`w-full py-2 rounded-md font-medium text-sm ${
          available
            ? "bg-blue-800 text-white hover:bg-blue-900"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        disabled={!available}
      >
        {buttonText}
      </button>
    </div>
  );
}
