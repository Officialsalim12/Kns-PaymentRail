export function generateReceiptEmailHTML(
    memberName: string,
    receiptNumber: string,
    receiptUrl: string,
    payment: any,
    organizationName: string,
    monimePaymentData: any = null
): string {
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
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white !important; text-decoration: none; border-radius: 5px; margin: 15px 0; }
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
            <p><strong>Amount:</strong> ${payment.currency === 'SLE' ? 'Le' : (payment.currency || 'Le')} ${(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount || 0).toFixed(2)}</p>
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

export async function sendReceiptEmail(
    email: string,
    memberName: string,
    receiptNumber: string,
    receiptUrl: string,
    payment: any,
    organizationName: string,
    monimePaymentData: any = null
): Promise<void> {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
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

    console.log("Email service not configured. Receipt details logged.");
}
