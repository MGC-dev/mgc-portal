"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState } from "react";
import { FileText, Download } from "lucide-react";

const contracts = [
  {
    id: 1,
    title: "Consulting Services Agreement",
    status: "signed",
    created: "2024-01-10T10:00:00Z",
  },
  {
    id: 2,
    title: "NDA - Strategic Planning",
    status: "sent",
    created: "2024-01-20T14:00:00Z",
  },
];

export default function ContractsPage() {
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

      {/* Main layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            Contracts & Agreements
          </h2>

          {/* Outer card */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4">
              Active Contracts
            </h3>

            <div className="space-y-4">
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white rounded-lg border shadow-sm p-4 gap-3"
                >
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-3">
                    <FileText size={24} className="text-gray-500 mt-1" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="font-medium text-base sm:text-lg">
                          {c.title}
                        </h4>
                        <span
                          className={`px-2 sm:px-3 py-0.5 text-xs rounded-full font-medium ${
                            c.status === "signed"
                              ? "bg-blue-300 text-blue-800"
                              : "bg-gray-300 text-gray-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Created:{" "}
                        {new Date(c.created).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right: download button */}
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
                    <Download size={16} /> Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
