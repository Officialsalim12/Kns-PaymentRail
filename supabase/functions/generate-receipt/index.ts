// Supabase Edge Function: Generate Receipt PDF
// This function generates a PDF receipt for a payment and stores it in Supabase Storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONIME_API_BASE_URL = "https://api.monime.io/v1";

interface ReceiptData {
  paymentId: string;
  organizationId: string;
  memberId: string;
  idempotencyKey?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let paymentId: string | undefined;
  let organizationId: string | undefined;
  let memberId: string | undefined;

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Allow service role key authentication when called from other edge functions
    // Check if the authorization header matches the service role key
    let isServiceRoleAuth = false;
    if (authHeader && serviceRoleKey) {
      const token = authHeader.replace("Bearer ", "").trim();
      isServiceRoleAuth = token === serviceRoleKey;
    }
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
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
    
    // If not service role auth, verify user token
    if (!isServiceRoleAuth) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid authentication",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }
    }

    // Parse request body
    let requestData: ReceiptData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { paymentId: pid, organizationId: oid, memberId: mid, idempotencyKey } = requestData;
    paymentId = pid;
    organizationId = oid;
    memberId = mid;

    if (!paymentId || !organizationId || !memberId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameters: paymentId, organizationId, and memberId are required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Check idempotency - prevent duplicate receipt generation
    if (idempotencyKey) {
      const { data: existingIdempotent } = await supabaseClient
        .from("receipts")
        .select("id")
        .eq("payment_id", paymentId)
        .maybeSingle();
      
      if (existingIdempotent) {
        console.log(`Receipt already exists for payment ${paymentId} (idempotency check)`);
        return new Response(
          JSON.stringify({
            success: true,
            receipt: existingIdempotent,
            message: "Receipt already exists (idempotency)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Fetch payment details with member info
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select(
        `
        *,
        member:members!inner(
          id,
          user_id,
          full_name,
          membership_id,
          email,
          phone_number,
          organization_id
        )
      `
      )
      .eq("id", paymentId)
      .eq("organization_id", organizationId)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    // Fetch organization details separately to avoid join alias issues
    let { data: organization, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id, name, organization_type")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      console.error(`Organization not found: ${orgError?.message}`);
      // Try to get organization name from payment's organization_id as fallback
      const { data: fallbackOrg } = await supabaseClient
        .from("organizations")
        .select("id, name, organization_type")
        .eq("id", payment.organization_id || organizationId)
        .maybeSingle();
      
      if (fallbackOrg) {
        organization = fallbackOrg;
      } else {
        throw new Error(`Organization ${organizationId} not found: ${orgError?.message}`);
      }
    }

    // Attach organization to payment.member
    if (payment.member && organization) {
      payment.member.organization = organization;
    } else {
      throw new Error("Failed to attach organization to payment member");
    }
    
    // Verify payment status is completed
    if (payment.payment_status !== "completed") {
      throw new Error(`Payment status is ${payment.payment_status}, not completed. Cannot generate receipt.`);
    }

    // Check if receipt already exists
    const { data: existingReceipt } = await supabaseClient
      .from("receipts")
      .select("id, receipt_number, pdf_url")
      .eq("payment_id", paymentId)
      .single();

    if (existingReceipt) {
      return new Response(
        JSON.stringify({
          success: true,
          receipt: existingReceipt,
          message: "Receipt already exists",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Fetch exact payment details from Monime API if monime_payment_id exists
    let monimePaymentData: any = null;
    if (payment.monime_payment_id) {
      try {
        const monimeApiKey = Deno.env.get("MONIME_ACCESS_TOKEN") || Deno.env.get("MONIME_API_KEY");
        const monimeSpaceId = Deno.env.get("MONIME_SPACE_ID");
        
        if (monimeApiKey && monimeSpaceId) {
          console.log(`Fetching exact payment details from Monime API: ${payment.monime_payment_id}`);
          const monimeResponse = await fetch(
            `${MONIME_API_BASE_URL}/payments/${payment.monime_payment_id}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${monimeApiKey}`,
                "Content-Type": "application/json",
                "Monime-Space-Id": monimeSpaceId,
              },
            }
          );
          
          if (monimeResponse.ok) {
            const monimeResponseData = await monimeResponse.json();
            monimePaymentData = monimeResponseData?.result || monimeResponseData;
            console.log("Monime payment data fetched successfully:", JSON.stringify(monimePaymentData, null, 2));
          } else {
            const errorText = await monimeResponse.text();
            console.warn(`Failed to fetch Monime payment data: ${monimeResponse.status} - ${errorText}`);
          }
        } else {
          console.warn("Monime API credentials not configured, using database payment data only");
        }
      } catch (error) {
        console.warn("Error fetching Monime payment data:", error);
        // Continue with database data if Monime fetch fails
      }
    }

    // Generate receipt number (will be set by trigger, but we need it for filename)
    const orgPrefix = payment.member.organization.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const receiptNumber = `RCP-${orgPrefix}-${dateStr}-${Date.now().toString().slice(-6)}`;

    // Generate PDF content using Monime payment data if available
    const pdfContent = await generateReceiptPDF(
      payment,
      receiptNumber,
      monimePaymentData
    );

    // Upload PDF to Supabase Storage
    const storagePath = `${organizationId}/${receiptNumber}.pdf`;
    const { data: uploadData, error: uploadError } =
      await supabaseClient.storage
        .from("receipts")
        .upload(storagePath, pdfContent, {
          contentType: "application/pdf",
          upsert: false,
        });

    if (uploadError) {
      throw new Error(`Failed to upload receipt: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("receipts").getPublicUrl(storagePath);

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabaseClient
      .from("receipts")
      .insert({
        organization_id: organizationId,
        payment_id: paymentId,
        member_id: memberId,
        receipt_number: receiptNumber,
        pdf_url: publicUrl,
        pdf_storage_path: storagePath,
      })
      .select()
      .single();

    if (receiptError) {
      // Clean up uploaded file if receipt creation fails
      await supabaseClient.storage.from("receipts").remove([storagePath]);
      throw new Error(`Failed to create receipt record: ${receiptError.message}`);
    }

    // Send notification to member
    if (payment.member.user_id) {
      await supabaseClient.from("notifications").insert({
        organization_id: organizationId,
        sender_id: payment.created_by,
        recipient_id: payment.member.user_id,
        member_id: memberId,
        title: "Payment Receipt Generated",
        message: `Your receipt for payment ${payment.reference_number || payment.id} has been generated. You can download it from your dashboard.`,
        type: "receipt",
      });
    }

    // Send email with receipt
    if (payment.member.email) {
      try {
        await sendReceiptEmail(
          payment.member.email,
          payment.member.full_name,
          receipt.receipt_number,
          publicUrl,
          payment,
          payment.member.organization.name,
          monimePaymentData
        );
        console.log(`Receipt email sent to ${payment.member.email}`);
      } catch (emailError) {
        console.error("Error sending receipt email:", emailError);
        // Don't fail the whole operation if email fails
      }
    } else {
      console.log("No email address found for member, skipping email send");
    }

    return new Response(
      JSON.stringify({
        success: true,
        receipt: receipt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Log error to database for tracking (optional - table may not exist)
    try {
      await supabaseClient.from("receipt_generation_logs").insert({
        payment_id: paymentId || null,
        organization_id: organizationId || null,
        member_id: memberId || null,
        status: "failed",
        error_message: error.message,
        error_stack: error.stack,
        created_at: new Date().toISOString(),
      }).then(() => {
        console.log("Receipt generation error logged to database");
      });
    } catch (logError) {
      // Table may not exist - that's okay, just log to console
      console.warn("Could not log receipt generation error to database (table may not exist):", logError);
    }

    console.error("Receipt generation error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      paymentId,
      organizationId,
      memberId,
      errorMessage: error.message,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: {
          paymentId,
          organizationId,
          memberId,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// Send receipt email to member
async function sendReceiptEmail(
  email: string,
  memberName: string,
  receiptNumber: string,
  receiptUrl: string,
  payment: any,
  organizationName: string,
  monimePaymentData: any = null
): Promise<void> {
  // Check if Resend API key is configured
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (resendApiKey) {
    // Use Resend for email sending
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "noreply@example.com",
          to: email,
          subject: `Payment Receipt - ${receiptNumber}`,
          html: generateReceiptEmailHTML(
            memberName,
            receiptNumber,
            receiptUrl,
            payment,
            organizationName,
            monimePaymentData
          ),
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(`Resend API error: ${errorData.message || "Unknown error"}`);
      }
      
      return;
    } catch (error) {
      console.error("Resend email error:", error);
      throw error;
    }
  }

  // Fallback: Use Supabase's built-in email (if configured)
  // Note: Supabase doesn't have a direct email API, but you can use their Auth email templates
  // For now, we'll log the email details for manual sending or integration with other services
  console.log("Email service not configured. Receipt email details:", {
    to: email,
    subject: `Payment Receipt - ${receiptNumber}`,
    receiptUrl: receiptUrl,
    memberName: memberName,
    organizationName: organizationName,
    amount: payment.amount,
    paymentDate: payment.payment_date,
  });

  // TODO: Integrate with your preferred email service (SendGrid, AWS SES, etc.)
  // Example for SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({...});
}

// Generate HTML email template for receipt
function generateReceiptEmailHTML(
  memberName: string,
  receiptNumber: string,
  receiptUrl: string,
  payment: any,
  organizationName: string,
  monimePaymentData: any = null
): string {
  // Get the actual payment date/time from Monime or payment data
  const monimePaymentDate = monimePaymentData?.created_at || 
                            monimePaymentData?.createdAt || 
                            monimePaymentData?.paid_at ||
                            monimePaymentData?.paidAt ||
                            monimePaymentData?.completed_at ||
                            monimePaymentData?.completedAt ||
                            payment.payment_date ||
                            payment.created_at ||
                            new Date().toISOString();
  
  const actualPaymentDate = new Date(monimePaymentDate);
  const formattedPaymentDate = actualPaymentDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .receipt-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Receipt</h1>
        </div>
        <div class="content">
          <p>Dear ${memberName},</p>
          <p>Thank you for your payment to ${organizationName}. Your receipt has been generated and is available for download.</p>
          
          <div class="receipt-details">
            <h3>Receipt Details</h3>
            <p><strong>Receipt Number:</strong> ${receiptNumber}</p>
            <p><strong>Amount:</strong> ${payment.currency || 'SLE'} ${(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount || 0).toFixed(2)}</p>
            <p><strong>Payment Date:</strong> ${formattedPaymentDate}</p>
            <p><strong>Payment Method:</strong> ${payment.payment_method}</p>
            ${payment.description ? `<p><strong>Description:</strong> ${payment.description}</p>` : ''}
          </div>
          
          <a href="${receiptUrl}" class="button">Download Receipt PDF</a>
          
          <p>If you have any questions about this payment, please contact your organization administrator.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${organizationName}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF receipt using proper PDF structure
// Uses exact payment data from Monime API if available
async function generateReceiptPDF(
  payment: any,
  receiptNumber: string,
  monimePaymentData: any = null
): Promise<Uint8Array> {
  // Use pdf-lib for proper PDF generation
  // Import pdf-lib dynamically
  const { PDFDocument, rgb, StandardFonts } = await import(
    "https://esm.sh/pdf-lib@1.17.1"
  );

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter size
  const { width, height } = page.getSize();
  
  // Fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  
  // Header
  page.drawText("PAYMENT RECEIPT", {
    x: 50,
    y: yPosition,
    size: 24,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 40;
  
  // Get the actual payment date/time from Monime or payment data
  const monimePaymentDate = monimePaymentData?.created_at || 
                            monimePaymentData?.createdAt || 
                            monimePaymentData?.paid_at ||
                            monimePaymentData?.paidAt ||
                            monimePaymentData?.completed_at ||
                            monimePaymentData?.completedAt ||
                            payment.payment_date ||
                            payment.created_at ||
                            new Date().toISOString();
  
  const actualPaymentDate = new Date(monimePaymentDate);
  
  // Receipt Number and Date
  yPosition -= 30;
  page.drawText(`Receipt Number: ${receiptNumber}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 20;
  page.drawText(`Date: ${actualPaymentDate.toLocaleString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  })}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  yPosition -= 40;
  
  // Organization Information
  page.drawText("Organization Information", {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 25;
  page.drawText(`Name: ${payment.member.organization.name}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 15;
  if (payment.member.organization.organization_type) {
    page.drawText(`Type: ${payment.member.organization.organization_type}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  yPosition -= 20;
  
  // Member Information
  page.drawText("Member Information", {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 25;
  page.drawText(`Name: ${payment.member.full_name}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 15;
  page.drawText(`Membership ID: ${payment.member.membership_id}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 15;
  if (payment.member.email) {
    page.drawText(`Email: ${payment.member.email}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  if (payment.member.phone_number) {
    page.drawText(`Phone: ${payment.member.phone_number}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  yPosition -= 20;
  
  // Payment Details - Use exact data from Monime API if available
  page.drawText("Payment Details", {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;
  page.drawText(`Transaction ID: ${payment.id}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  
  // Use Monime order number if available, otherwise use reference_number
  const orderNumber = monimePaymentData?.order_number || 
                      monimePaymentData?.orderNumber || 
                      monimePaymentData?.order_id ||
                      monimePaymentData?.orderId ||
                      monimePaymentData?.order?.number ||
                      monimePaymentData?.order?.id ||
                      payment.reference_number ||
                      null;
  
  if (orderNumber) {
    page.drawText(`Order Number: ${orderNumber}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }

  // Monime Payment ID (always show if available)
  const monimePaymentId = monimePaymentData?.id || payment.monime_payment_id;
  if (monimePaymentId) {
    page.drawText(`Monime Payment ID: ${monimePaymentId}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }

  page.drawText(`Payment Provider: Monime`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  // Amount - Always use the payment amount from database (this is the actual amount paid)
  // Convert payment.amount to number if it's a string
  const paymentAmount = typeof payment.amount === 'string' 
    ? parseFloat(payment.amount) 
    : (payment.amount || 0);
  
  // Currency - Use payment currency if available, otherwise default to SLE
  const paymentCurrency = payment.currency || "SLE";
  
  const amountText = `Amount: ${paymentCurrency} ${paymentAmount.toFixed(2)}`;
  page.drawText(amountText, {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;
  
  // Payment Date - Use the actual payment date/time (already calculated above)
  page.drawText(`Payment Date: ${actualPaymentDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  })}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  
  // Payment Method - Use Monime payment method details if available
  const monimePaymentMethod = monimePaymentData?.payment_method || 
                              monimePaymentData?.paymentMethod ||
                              monimePaymentData?.method ||
                              payment.payment_method || 
                              "Mobile Payment";
  
  page.drawText(`Payment Method: ${monimePaymentMethod}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 15;
  
  // Payment Status - Use Monime status if available
  const monimeStatus = monimePaymentData?.status || 
                       monimePaymentData?.payment_status ||
                       payment.payment_status || 
                       "Completed";
  
  page.drawText(`Payment Status: ${monimeStatus}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0.6, 0),
  });

  yPosition -= 20;
  
  // Description - Use Monime description if available
  const monimeDescription = monimePaymentData?.description || 
                            monimePaymentData?.name ||
                            payment.description ||
                            null;
  
  if (monimeDescription) {
    page.drawText(`Description: ${monimeDescription}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  }
  
  // Show additional Monime payment details if available
  if (monimePaymentData) {
    // Show line items if available
    if (monimePaymentData.line_items && Array.isArray(monimePaymentData.line_items) && monimePaymentData.line_items.length > 0) {
      yPosition -= 10;
      page.drawText("Line Items:", {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
      
      monimePaymentData.line_items.forEach((item: any, index: number) => {
        if (yPosition < 100) {
          // Start new page if needed (simplified - in production, handle page breaks properly)
          return;
        }
        const itemName = item.name || item.description || `Item ${index + 1}`;
        const itemPrice = item.price?.value || item.price || item.amount || 0;
        const itemCurrency = item.price?.currency || item.currency || monimeCurrency;
        const itemQuantity = item.quantity || 1;
        
        page.drawText(`${itemName} - ${itemCurrency} ${parseFloat(itemPrice.toString()).toFixed(2)} x ${itemQuantity}`, {
          x: 60,
          y: yPosition,
          size: 9,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      });
    }
  }
  
  // Footer
  yPosition = 50;
  page.drawText("Thank you for your payment!", {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 20;
  page.drawText("This is an official receipt for your records.", {
    x: 50,
    y: yPosition,
    size: 9,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

