"use client";

import type React from "react";

import {
  Calendar,
  CreditCard,
  FileText,
  Plus,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { motion } from "framer-motion";
// import AppointmentTimeline from "./UpcomingAppointments";
// import InvoiceDonut from "./InvoiceChartFix";
import AppointmentScheduler from "@/components/appointment-scheduler";
import AppointmentCard from "@/components/appointment-card";
import { useAppointments } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase";

// Card Props
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// StatCard Props
interface StatCardProps {
  label: string;
  value: string | number;
  sub: React.ReactNode;
  icon: React.ElementType;
  tone?: "blue" | "amber" | "rose" | "green";
}

// Appointment Props
interface AppointmentProps {
  tone?: "blue" | "teal";
  title: string;
  date: string;
  withJoin?: boolean;
}

// QuickAction Props
interface QuickActionProps {
  icon: React.ElementType;
  tone?: "blue" | "amber" | "rose" | "green";
  text: string;
}

// Activity Props
interface ActivityProps {
  icon: React.ElementType;
  tone?: "green" | "amber" | "rose";
  title: string;
  sub: string;
  date: string;
}


export default function DashboardPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { appointments, upcomingAppointments, loading, refetch } =
    useAppointments();
  const nextAppointment = upcomingAppointments[0];

  // Dynamic Recent Activity state
  const [activities, setActivities] = useState<ActivityProps[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadActivity() {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setActivities([]);
            setActivityLoading(false);
          }
          return;
        }

        const { data: appts, error: apptErr } = await supabase
          .from("appointments")
          .select("*")
          .or(`attendee_user_id.eq.${user.id},provider_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (apptErr) throw apptErr;

        const mapped: ActivityProps[] = (appts || []).map((a: any) => ({
          icon: Calendar,
          tone: "green",
          title: `Appointment: ${a.title}`,
          sub: `${format(new Date(a.start_time), "EEE, MMM d, h:mm a")} • ${a.status}`,
          date: format(new Date(a.created_at || a.start_time), "M/d/yyyy"),
        }));

        if (mounted) {
          setActivities(mapped);
          setActivityLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setActivityError("Failed to load activity");
          setActivityLoading(false);
        }
      }
    }

    loadActivity();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar */}
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

      {/* Main column (Navbar + Content) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-white">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="text-gray-600 mt-1">
              Here&apos;s what&apos;s happening with your account today.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="NEXT APPOINTMENT"
              value={
                nextAppointment
                  ? format(new Date(nextAppointment.start_time), "EEE, MMM d")
                  : "No upcoming"
              }
              sub={
                nextAppointment
                  ? `${format(
                      new Date(nextAppointment.start_time),
                      "h:mm a"
                    )} – ${nextAppointment.title}`
                  : "Schedule your first appointment"
              }
              icon={Calendar}
              tone="blue"
            />
            <StatCard
              label="OUTSTANDING BALANCE"
              value="$299.00"
              sub="Due 2/29/2024"
              icon={CreditCard}
              tone="amber"
            />
            <StatCard
              label="PENDING CONTRACTS"
              value="1"
              sub="Awaiting signature"
              icon={FileText}
              tone="rose"
            />
            <StatCard
              label="TOTAL APPOINTMENTS"
              value={appointments.length}
              sub={
                <span className="text-green-600">
                  {upcomingAppointments.length} upcoming
                </span>
              }
              icon={TrendingUp}
              tone="green"
            />
          </div>

          {/* Middle grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Upcoming Appointments */}
            <Card className="xl:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Upcoming Appointments</h3>
                {/* Removed inline AppointmentScheduler from Overview */}
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading appointments...
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  upcomingAppointments
                    .slice(0, 3)
                    .map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onUpdate={refetch}
                      />
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No upcoming appointments</p>
                    <p className="text-sm">You have no upcoming appointments.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Resources */}
            {/* Resources removed as requested */}
          </div>

          {/* Charts */}
          {/* Charts removed from Overview as requested */}
          {/* End Charts */}

          {/* Bottom grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 pt-8">
            {/* Recent Activity */}
            <Card className="xl:col-span-2">
              <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
              {activityLoading ? (
                <div className="text-gray-500">Loading activity...</div>
              ) : activityError ? (
                <div className="text-red-600">{activityError}</div>
              ) : activities.length === 0 ? (
                <div className="text-gray-500">No recent activity</div>
              ) : (
                activities.map((a, idx) => (
                  <Activity
                    key={idx}
                    icon={a.icon}
                    tone={a.tone}
                    title={a.title}
                    sub={a.sub}
                    date={a.date}
                  />
                ))
              )}
            </Card>

            {/* Subscription */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">Subscription</h3>
                <span className="px-3 py-1 text-xs rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  Intermediate
                </span>
              </div>

              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-1">Plan Features:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckDot /> Priority consultation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckDot /> Phone &amp; email support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckDot /> 4 monthly sessions
                  </li>
                </ul>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-gray-700">Monthly Plan — $299</p>
                <button className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white">
                  Upgrade <span aria-hidden>→</span>
                </button>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <h3 className="font-semibold text-lg mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <div className="w-full text-left">
                  <AppointmentScheduler
                    onAppointmentCreated={refetch}
                    triggerButton={
                      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 w-full">
                        <span className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Calendar size={16} className="text-blue-700" />
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          Schedule Appointment
                        </span>
                      </div>
                    }
                  />
                </div>
                <QuickAction
                  icon={CreditCard}
                  tone="amber"
                  text="Pay Invoice (1)"
                />
                <QuickAction
                  icon={FileText}
                  tone="rose"
                  text="Sign Contract (1)"
                />
                <QuickAction icon={Plus} tone="green" text="Upgrade Service" />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 ${className}`}
    >
      {children}
    </section>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone = "blue" }: StatCardProps) {
  const tones = {
    blue: ["text-blue-600", "bg-blue-50", "border-blue-100"],
    amber: ["text-amber-600", "bg-amber-50", "border-amber-100"],
    rose: ["text-rose-600", "bg-rose-50", "border-rose-100"],
    green: ["text-green-600", "bg-green-50", "border-green-100"],
  }[tone];

  return (
    <Card>
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-semibold tracking-wide text-gray-500">
          {label}
        </p>
        <span
          className={`inline-flex items-center justify-center rounded-lg p-2 ${tones[1]} ${tones[2]}`}
        >
          <Icon size={18} className={tones[0]} />
        </span>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600 mt-0.5">{sub}</div>
      </div>
    </Card>
  );
}

function Appointment({ tone = "blue", title, date, withJoin = false }: AppointmentProps) {
  const toneMap = {
    blue: ["bg-blue-50", "text-blue-700"],
    teal: ["bg-teal-50", "text-teal-700"],
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`h-10 w-10 rounded-xl ${toneMap[0]} flex items-center justify-center`}
        >
          <Calendar size={18} className={toneMap[1]} />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-600">{date}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {withJoin && (
          <button className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            <ExternalLink size={14} /> Join
          </button>
        )}
        <button className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
          Reschedule
        </button>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, tone = "blue", text }: QuickActionProps) {
  const tones = {
    blue: ["text-blue-700", "bg-blue-50"],
    amber: ["text-amber-700", "bg-amber-50"],
    rose: ["text-rose-700", "bg-rose-50"],
    green: ["text-green-700", "bg-green-50"],
  }[tone];

  return (
    <button className="w-full text-left">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
        <span
          className={`h-8 w-8 rounded-lg ${tones[1]} flex items-center justify-center`}
        >
          <Icon size={16} className={tones[0]} />
        </span>
        <span className="text-sm font-medium text-gray-800">{text}</span>
      </div>
    </button>
  );
}


function Activity({ icon: Icon, tone = "green", title, sub, date }: ActivityProps) {
  const tones = {
    green: ["text-green-700", "bg-green-50"],
    amber: ["text-amber-700", "bg-amber-50"],
    rose: ["text-rose-700", "bg-rose-50"],
  }[tone];

  return (
    <div className="flex items-start justify-between rounded-xl px-2 py-2">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 h-8 w-8 rounded-lg ${tones[1]} flex items-center justify-center`}
        >
          <Icon size={16} className={tones[0]} />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-600">{sub}</p>
        </div>
      </div>
      <span className="text-sm text-gray-500">{date}</span>
    </div>
  );
}


function CheckDot() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50">
      <CheckCircle2 size={14} className="text-green-600" />
    </span>
  );
}
