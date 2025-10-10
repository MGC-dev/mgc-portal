"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState } from "react";
import { Download, CreditCard } from "lucide-react";

export default function BillingPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const invoices = [
    {
      id: "INV-2024-001",
      due: "2024-01-31T23:59:59Z",
      amount: "$299",
      status: "paid",
    },
    {
      id: "INV-2024-002",
      due: "2024-02-28T23:59:59Z",
      amount: "$299",
      status: "sent",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      
       {/* Sidebar - hidden on mobile */}
            <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
              <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>
             {/* Sidebar (mobile overlay) */}
            {isSidebarOpen && (
              <div className="fixed inset-0 z-50 flex">
                {/* Dark overlay */}
                <div
                  className="fixed inset-0 bg-black bg-opacity-20"
                  onClick={() => setSidebarOpen(false)}
                />
                {/* Sidebar drawer */}
                <div className="relative z-50 w-64 bg-white shadow-lg">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}/>
                </div>
              </div>
            )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Billing & Invoices</h2>
            <button className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm sm:text-base">
              <CreditCard size={18} /> Update Payment Method
            </button>
          </div>

          {/* Outer Section Card */}
          <div className="bg-gray-100 rounded-xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4">
              Recent Invoices
            </h3>

            <div className="space-y-4">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  {/* Invoice details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h4 className="font-semibold text-base sm:text-lg">
                        Invoice #{inv.id}
                      </h4>
                      <span
                        className={`px-2 sm:px-3 py-0.5 text-xs rounded-full font-medium ${
                          inv.status === "paid"
                            ? "bg-blue-300 text-blue-800"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Due:{" "}
                      {new Date(inv.due).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Invoice amount + actions */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="font-semibold text-base sm:text-lg">
                      {inv.amount}
                    </span>
                    <button className="flex items-center gap-2 border px-3 sm:px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
                      <Download size={16} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
