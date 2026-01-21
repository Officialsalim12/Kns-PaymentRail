// Supabase Edge Function: Send Notification
// This function sends notifications to members and optionally sends emails

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationData {
  organizationId: string;
  recipientId?: string;
  memberId?: string;
  recipientIds?: string[]; // For bulk notifications
  title: string;
  message: string;
  type?: "info" | "payment" | "receipt" | "system" | "alert";
  sendEmail?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const {
      organizationId,
      recipientId,
      memberId,
      recipientIds,
      title,
      message,
      type = "info",
      sendEmail = false,
    }: NotificationData = await req.json();

    if (!organizationId || !title || !message) {
      throw new Error("Missing required parameters");
    }

    // Get sender ID from auth token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const senderId = user.id;

    // Determine recipients
    let recipients: string[] = [];

    if (recipientIds && recipientIds.length > 0) {
      // Bulk notification
      recipients = recipientIds;
    } else if (recipientId) {
      // Single recipient
      recipients = [recipientId];
    } else if (memberId) {
      // Get user_id from member
      const { data: member, error: memberError } = await supabaseClient
        .from("members")
        .select("user_id")
        .eq("id", memberId)
        .eq("organization_id", organizationId)
        .single();

      if (memberError || !member || !member.user_id) {
        throw new Error("Member not found or has no associated user");
      }

      recipients = [member.user_id];
    } else {
      throw new Error("Must provide recipientId, memberId, or recipientIds");
    }

    // Create notification records
    const notifications = recipients.map((recipientId) => ({
      organization_id: organizationId,
      sender_id: senderId,
      recipient_id: recipientId,
      member_id: memberId || null,
      title,
      message,
      type,
    }));

    const { data: createdNotifications, error: insertError } =
      await supabaseClient.from("notifications").insert(notifications).select();

    if (insertError) {
      throw new Error(`Failed to create notifications: ${insertError.message}`);
    }

    // Send emails if requested
    if (sendEmail) {
      // Fetch recipient user details
      const { data: recipientUsers, error: usersError } =
        await supabaseClient
          .from("users")
          .select("id, email, full_name")
          .in("id", recipients);

      if (!usersError && recipientUsers) {
        // In production, integrate with an email service (SendGrid, Resend, etc.)
        // For now, we'll just log the emails that would be sent
        console.log("Would send emails to:", recipientUsers.map((u) => u.email));
        
        // Example email sending (replace with actual email service):
        // for (const user of recipientUsers) {
        //   await sendEmail({
        //     to: user.email,
        //     subject: title,
        //     html: message,
        //   });
        // }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications: createdNotifications,
        count: createdNotifications?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

