import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date
    const today = new Date().toISOString().split('T')[0]

    // Find all members whose grace period has ended and haven't paid
    const { data: overdueMembers, error: queryError } = await supabase
      .from('member_payment_status')
      .select(`
        *,
        member:members!inner(
          id,
          user_id,
          full_name,
          email,
          phone_number,
          status,
          organization_id,
          organization:organizations(name)
        ),
        tab:member_tabs(tab_name, monthly_cost)
      `)
      .eq('is_suspended', false)
      .lte('grace_period_end_date', today)
      .or('last_payment_date.is.null,last_payment_date.lt.activation_date')

    if (queryError) {
      throw new Error(`Error querying members: ${queryError.message}`)
    }

    if (!overdueMembers || overdueMembers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No members to suspend',
          checked: 0,
          suspended: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const suspendedMembers = []
    const errors = []

    // Process each overdue member
    for (const paymentStatus of overdueMembers) {
      try {
        const member = paymentStatus.member
        if (!member || member.status === 'suspended') {
          continue // Skip if already suspended
        }

        // Calculate total due amount
        let totalDue = 0
        if (paymentStatus.tab && paymentStatus.tab.monthly_cost) {
          const activationDate = new Date(paymentStatus.activation_date)
          const graceEndDate = new Date(paymentStatus.grace_period_end_date)
          const monthsDiff = Math.max(0, 
            (graceEndDate.getTime() - activationDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          )
          totalDue = paymentStatus.tab.monthly_cost * Math.ceil(monthsDiff)
        }

        // Suspend the member
        const { error: suspendError } = await supabase
          .from('members')
          .update({ 
            status: 'suspended',
          })
          .eq('id', member.id)

        if (suspendError) {
          errors.push(`Failed to suspend member ${member.id}: ${suspendError.message}`)
          continue
        }

        // Update payment status
        await supabase
          .from('member_payment_status')
          .update({
            is_suspended: true,
            suspension_reason: `Automatic suspension: Payment overdue after 3-month grace period. Total due: $${totalDue.toFixed(2)}`,
            total_due_amount: totalDue,
          })
          .eq('id', paymentStatus.id)

        // Create dashboard notification
        if (member.user_id) {
          await supabase
            .from('notifications')
            .insert({
              organization_id: member.organization_id,
              recipient_id: member.user_id,
              sender_id: null, // System notification
              title: 'Account Suspended',
              message: `Your account has been suspended due to overdue payments. Total amount due: $${totalDue.toFixed(2)}. Please contact your administrator to resolve this issue.`,
              type: 'warning',
              member_id: member.id,
            })
        }

        // Send email notification (if email service is configured)
        if (member.email) {
          // You can integrate with an email service here (SendGrid, Resend, etc.)
          // For now, we'll just log it
          console.log(`Email notification would be sent to: ${member.email}`)
        }

        // Send SMS notification (if SMS service is configured)
        if (member.phone_number) {
          // You can integrate with an SMS service here (Twilio, etc.)
          // For now, we'll just log it
          console.log(`SMS notification would be sent to: ${member.phone_number}`)
        }

        suspendedMembers.push({
          memberId: member.id,
          memberName: member.full_name,
          email: member.email,
          phoneNumber: member.phone_number,
          totalDue: totalDue,
        })

      } catch (error) {
        errors.push(`Error processing member ${paymentStatus.member?.id}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Suspension check completed',
        checked: overdueMembers.length,
        suspended: suspendedMembers.length,
        suspendedMembers,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

