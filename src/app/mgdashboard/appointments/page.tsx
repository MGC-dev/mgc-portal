"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState } from "react";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import AppointmentCard from "@/components/appointment-card";
import AppointmentScheduler from "@/components/appointment-scheduler";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AppointmentsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { appointments, loading, error, refetch } = useAppointments();

  const upcomingAppointments = appointments.filter(
    (apt) =>
      apt.status === "scheduled" && new Date(apt.start_time) >= new Date()
  );

  const pastAppointments = appointments.filter(
    (apt) => apt.status === "completed" || new Date(apt.start_time) < new Date()
  );

  const cancelledAppointments = appointments.filter(
    (apt) => apt.status === "cancelled"
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar (mobile overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">My Appointments</h2>
              <p className="text-gray-600 mt-1">
                Manage and schedule your appointments
              </p>
            </div>
            <AppointmentScheduler
              onAppointmentCreated={refetch}
              triggerButton={
                <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm sm:text-base inline-flex items-center gap-2">
                  <Plus size={16} />
                  Schedule New Appointment
                </button>
              }
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading appointments...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Error loading appointments</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger
                  value="upcoming"
                  className="flex items-center gap-2"
                >
                  Upcoming
                  {upcomingAppointments.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {upcomingAppointments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  Past
                  {pastAppointments.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {pastAppointments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="cancelled"
                  className="flex items-center gap-2"
                >
                  Cancelled
                  {cancelledAppointments.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {cancelledAppointments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onUpdate={refetch}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-gray-600">
                      Use the "Schedule New Appointment" button above to create one.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {pastAppointments.length > 0 ? (
                  pastAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onUpdate={refetch}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No past appointments
                    </h3>
                    <p className="text-gray-600">
                      Your completed appointments will appear here
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-4">
                {cancelledAppointments.length > 0 ? (
                  cancelledAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onUpdate={refetch}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No cancelled appointments
                    </h3>
                    <p className="text-gray-600">
                      Cancelled appointments will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}
