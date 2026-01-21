import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

// Hardcoded organization structure standards
// These standards ensure all organizations follow the same structure regardless of reference organization
const ORGANIZATION_STANDARDS = {
  // Optional fields should be null (not empty strings) when empty
  phone_number: null,
  description: null,
  // Status defaults to 'pending' for new organizations
  default_status: "pending",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const targetOrgId = url.searchParams.get("orgId") // Optional: sync specific org

    console.log("Using hardcoded organization structure standards")

    // Get all organizations or specific one
    let query = supabaseClient.from("organizations").select("*")
    
    if (targetOrgId) {
      query = query.eq("id", targetOrgId)
    }

    const { data: organizations, error: orgsError } = await query

    if (orgsError) {
      throw orgsError
    }

    if (!organizations || organizations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No organizations found to sync",
          syncedCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    let syncedCount = 0
    const updates: Array<{ id: string; changes: string[] }> = []

    // Standardize each organization to match hardcoded structure standards
    for (const org of organizations) {
      const changes: string[] = []
      const updateData: any = {}

      // Standardize fields to match hardcoded structure standards
      // Trim all text fields
      if (org.name && org.name !== org.name.trim()) {
        updateData.name = org.name.trim()
        changes.push("name trimmed")
      }

      if (org.organization_type && org.organization_type !== org.organization_type.trim()) {
        updateData.organization_type = org.organization_type.trim()
        changes.push("organization_type trimmed")
      }

      if (org.admin_email && org.admin_email !== org.admin_email.trim()) {
        updateData.admin_email = org.admin_email.trim()
        changes.push("admin_email trimmed")
      }

      // Convert empty strings to null for optional fields (matching standards)
      if (org.phone_number === "") {
        updateData.phone_number = null
        changes.push("phone_number set to null (empty string converted)")
      } else if (org.phone_number && org.phone_number !== org.phone_number.trim()) {
        updateData.phone_number = org.phone_number.trim()
        changes.push("phone_number trimmed")
      }

      if (org.description === "") {
        updateData.description = null
        changes.push("description set to null (empty string converted)")
      } else if (org.description && org.description !== org.description.trim()) {
        updateData.description = org.description.trim()
        changes.push("description trimmed")
      }

      // Ensure status follows same pattern (don't change approved/rejected/suspended, but ensure pending is consistent)
      if (!org.status || org.status === "" || org.status.trim() === "") {
        updateData.status = ORGANIZATION_STANDARDS.default_status
        changes.push(`status set to ${ORGANIZATION_STANDARDS.default_status}`)
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseClient
          .from("organizations")
          .update(updateData)
          .eq("id", org.id)

        if (updateError) {
          console.error(`Error updating organization ${org.id}:`, updateError)
          continue
        }

        syncedCount++
        updates.push({ id: org.id, changes })
        console.log(`Synced organization "${org.name}": ${changes.join(", ")}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${syncedCount} organization(s) to match standard structure`,
        syncedCount,
        standards: ORGANIZATION_STANDARDS,
        updates,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error syncing organization structure:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to sync organization structure",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
