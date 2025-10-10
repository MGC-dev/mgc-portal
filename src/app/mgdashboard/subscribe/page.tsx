"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { CreditCard, Star, Crown } from "lucide-react";
import { useState } from "react";

export default function Page() {
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
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}/>
                </div>
              </div>
            )}
      

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-6">
          <h1 className="text-2xl font-bold mb-6">Product Subscriptions</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Plan */}
            <PlanCard
              icon={<CreditCard className="w-6 h-6 text-blue-600" />}
              title="Starter"
              price="$29/month"
              description="Essential tools for individuals and small teams."
              features={[
                "Access to core features",
                "Email support",
                "Single user license",
              ]}
              buttonText="Subscribe"
              color="blue"
            />

            {/* Pro Plan */}
            <PlanCard
              icon={<Star className="w-6 h-6 text-green-600" />}
              title="Intermediate"
              price="$79/month"
              description="Advanced features for growing businesses."
              features={[
                "Everything in Basic",
                "Priority support",
                "Team collaboration",
                "Analytics dashboard",
              ]}
              buttonText="Subscribe"
              color="green"
            />

            {/* Enterprise Plan */}
            <PlanCard
              icon={<Crown className="w-6 h-6 text-purple-600" />}
              title="Advanced"
              price="Contact us"
              description="Custom solutions for large organizations."
              features={[
                "Everything in Intermediate",
                "Dedicated account manager",
                "Custom integrations",
                "Onboarding & training",
              ]}
              buttonText="Contact Sales"
              color="purple"
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function PlanCard({
  icon,
  title,
  price,
  description,
  features,
  buttonText,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border flex flex-col justify-between hover:shadow-lg transition">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-${color}-100 text-${color}-00`}
          >
            {icon}
          </span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="text-2xl font-bold mb-2">{price}</p>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <ul className="space-y-2 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center text-sm text-gray-700">
              <span className="text-green-600 mr-2">✔</span> {feature}
            </li>
          ))}
        </ul>
      </div>
      <button
        className={`w-full py-2 rounded-md font-medium text-sm bg-${color}-600 text-white hover:bg-${color}-700`}
      >
        {buttonText}
      </button>
    </div>
  );
}
