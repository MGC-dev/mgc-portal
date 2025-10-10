"use client";

import { useState, useEffect } from "react";
import { getUserAppointments, type Appointment } from "@/lib/appointments";

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await getUserAppointments();

      if (error) {
        setError(error);
      } else {
        setAppointments(data || []);
      }
    } catch (err) {
      setError("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const upcomingAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(apt.start_time);
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return (
      appointmentDate >= now &&
      appointmentDate <= nextWeek &&
      apt.status === "scheduled"
    );
  });

  const todaysAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(apt.start_time);
    const today = new Date();

    return (
      appointmentDate.toDateString() === today.toDateString() &&
      apt.status === "scheduled"
    );
  });

  return {
    appointments,
    upcomingAppointments,
    todaysAppointments,
    loading,
    error,
    refetch: fetchAppointments,
  };
}
