import { createClient } from "@/lib/supabase";

export interface Appointment {
  id: string;
  attendee_user_id: string;
  provider_user_id?: string;
  company_id?: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  notes?: string;
  title: string;
  created_at: string;
}

export interface CreateAppointmentData {
  title: string;
  start_time: string;
  end_time: string;
  notes?: string;
  provider_user_id?: string;
}

export async function createAppointment(
  data: CreateAppointmentData
): Promise<{ data: Appointment | null; error: string | null }> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "User not authenticated" };
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          role: "client",
        },
      ]);

      if (profileError) {
        return {
          data: null,
          error: `Profile creation failed: ${profileError.message}`,
        };
      }
    }

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert([
        {
          attendee_user_id: user.id,
          title: data.title,
          start_time: data.start_time,
          end_time: data.end_time,
          notes: data.notes,
          provider_user_id: data.provider_user_id,
          status: "scheduled",
        },
      ])
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: appointment, error: null };
  } catch (err) {
    return { data: null, error: "Failed to create appointment" };
  }
}

export async function getUserAppointments(): Promise<{
  data: Appointment[] | null;
  error: string | null;
}> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "User not authenticated" };
    }

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*")
      .or(`attendee_user_id.eq.${user.id},provider_user_id.eq.${user.id}`)
      .order("start_time", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: appointments || [], error: null };
  } catch (err) {
    return { data: null, error: "Failed to fetch appointments" };
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "scheduled" | "completed" | "cancelled" | "rescheduled"
): Promise<{ error: string | null }> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: "Failed to update appointment" };
  }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from("appointments")
      .update({
        start_time: newStartTime,
        end_time: newEndTime,
        status: "rescheduled",
      })
      .eq("id", appointmentId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: "Failed to reschedule appointment" };
  }
}
