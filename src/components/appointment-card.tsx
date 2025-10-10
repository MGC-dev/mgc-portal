"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateAppointmentStatus } from "@/lib/appointments";
import { format } from "date-fns";
import type { Appointment } from "@/lib/appointments";

interface AppointmentCardProps {
  appointment: Appointment;
  onUpdate?: () => void;
}

export default function AppointmentCard({
  appointment,
  onUpdate,
}: AppointmentCardProps) {
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (status: "completed" | "cancelled") => {
    setLoading(true);
    try {
      const { error } = await updateAppointmentStatus(appointment.id, status);
      if (!error && onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update appointment:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "rescheduled":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      {/* Left info */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-base sm:text-lg">
            {appointment.title}
          </h4>
          <Badge className={getStatusColor(appointment.status)}>
            {appointment.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center text-sm text-gray-600 gap-3">
          <span className="flex items-center gap-1">
            <Calendar size={16} />
            {format(startDate, "MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={16} />
            {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={16} />
            Virtual Meeting
          </span>
        </div>

        {appointment.notes && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {appointment.notes}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {appointment.status === "scheduled" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusUpdate("completed")}
              disabled={loading}
            >
              Mark Complete
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Edit size={16} className="mr-2" />
                  Reschedule
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("cancelled")}
                  className="text-red-600"
                >
                  <Trash2 size={16} className="mr-2" />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
