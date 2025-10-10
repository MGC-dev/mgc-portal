"use client";

import { useState } from "react";
// Removed framer-motion import
import { createAppointment } from "@/lib/appointments";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Add helper to parse AM/PM time strings
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

export type NewAppointment = {
  title: string;
  date: string;
  time: string;
  type: "Virtual Meeting" | "In-Person";
};

const timeSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];

export default function AppointmentScheduler({
  onConfirm,
  onAppointmentCreated,
  onClose,
  triggerButton,
}: {
  onConfirm?: (appointment: NewAppointment) => void;
  onAppointmentCreated?: () => void;
  onClose?: () => void;
  triggerButton?: React.ReactNode;
}) {
  // Replace old view + selected state with clear date/time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [form, setForm] = useState({ name: "", email: "", notes: "", type: "Virtual Meeting" as NewAppointment["type"] });
  const [open, setOpen] = useState(false);

  async function performCreation(newApt: NewAppointment) {
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }
    const time = parseTimeString(newApt.time);
    if (!time) {
      alert("Failed to parse selected time");
      return;
    }
    const start = new Date(selectedDate);
    start.setHours(time.hours, time.minutes, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const { error } = await createAppointment({
      title: newApt.title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes: form.notes,
    });

    if (error) {
      alert(`Failed to create appointment: ${error}`);
      return;
    }
    onAppointmentCreated?.();
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select a date and time!");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.type.trim() || !form.notes.trim()) {
      alert("Please fill all fields");
      return;
    }
    const newApt: NewAppointment = {
      title: `${form.name}'s Appointment`,
      date: selectedDate.toLocaleDateString("en-US"),
      time: selectedTime,
      type: form.type,
    };
    onConfirm?.(newApt);
    await performCreation(newApt);
    onClose?.();
    setOpen(false);
  };

  const content = (
    <div className="w-full mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Schedule Appointment</h2>
        {(onClose || triggerButton) && (
          <button
            onClick={() => { onClose?.(); setOpen(false); }}
            className="text-gray-600 hover:text-red-600 text-lg font-bold"
            aria-label="Close"
          >
            ✖
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date Picker */}
        <div className="bg-white border rounded-lg p-3">
          <Label className="mb-2 block">Choose a date</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => setSelectedDate(date ?? undefined)}
            captionLayout="dropdown"
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today; // disable past dates
            }}
          />
          <p className="mt-2 text-sm text-gray-500">
            {selectedDate ? `Selected: ${selectedDate.toLocaleDateString("en-US")}` : "Select a date to continue"}
          </p>
        </div>

        {/* Time & Details */}
        <div className="bg-white border rounded-lg p-3 space-y-4">
          <div>
            <Label className="mb-2 block">Choose a time</Label>
            <Select value={selectedTime} onValueChange={(val) => setSelectedTime(val)} disabled={!selectedDate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedDate ? "Select a time" : "Select a date first"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="email">Your Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <Label>Meeting Type</Label>
            <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val as NewAppointment["type"] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Virtual Meeting">Virtual Meeting</SelectItem>
                <SelectItem value="In-Person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add any details to help us prepare" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => { onClose?.(); setOpen(false); }}>Cancel</Button>
        <Button className="bg-blue-800 text-white" onClick={handleSubmit}>Confirm Appointment</Button>
      </div>
    </div>
  );

  if (triggerButton) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[85vh] overflow-y-auto p-0">{content}</DialogContent>
      </Dialog>
    );
  }

  return content;
}