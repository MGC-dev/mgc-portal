"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { FileText, Eye, Download } from "lucide-react";
import { useState } from "react";

const recaps = [
  {
    id: 1,
    title: "Session Recap - 1/18/2024",
    date: "2024-01-18",
    actions: 3,
    description:
      "Discussed Q4 performance metrics and identified key areas for improvement in customer acquisition.",
  },
];

export default function SessionRecapsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
                  className="fixed inset-0 bg-black bg-opacity-50"
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
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Session Recaps</h2>

          {/* Outer Card */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <h3 className="text-md sm:text-lg font-semibold mb-4">
              Recent Sessions
            </h3>

            <div className="space-y-4">
              {recaps.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white rounded-lg border shadow-sm p-4 gap-4"
                >
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-3">
                    <FileText size={28} className="text-gray-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-base sm:text-lg">
                        {r.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                        <span>Date: {new Date(r.date).toLocaleDateString()}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {r.actions} Action Items
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{r.description}</p>
                    </div>
                  </div>

                  {/* Right: buttons */}
                  <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                    <button className="flex items-center gap-1 border px-3 py-2 rounded-lg hover:bg-gray-100 text-sm w-full sm:w-auto justify-center">
                      <Eye size={16} /> View
                    </button>
                    <button className="flex items-center gap-1 border px-3 py-2 rounded-lg hover:bg-gray-100 text-sm w-full sm:w-auto justify-center">
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
