export async function generateReceiptPDF(
    payment: any,
    receiptNumber: string,
    monimePaymentData: any = null
): Promise<Uint8Array> {
    const { PDFDocument, rgb, StandardFonts } = await import(
        "https://esm.sh/pdf-lib@1.17.1"
    );

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

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

    // Payment Details
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

    const paymentAmount = typeof payment.amount === 'string'
        ? parseFloat(payment.amount)
        : (payment.amount || 0);

    const paymentCurrency = payment.currency === 'SLE' ? 'Le' : (payment.currency || 'Le');

    const amountText = `Amount: ${paymentCurrency} ${paymentAmount.toFixed(2)}`;
    page.drawText(amountText, {
        x: 50,
        y: yPosition,
        size: 16,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
    });

    yPosition -= 25;
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

    if (monimePaymentData?.line_items?.length > 0) {
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
            if (yPosition < 100) return;
            const itemName = item.name || item.description || `Item ${index + 1}`;
            const itemPrice = item.price?.value || item.price || item.amount || 0;
            const itemCurrency = item.price?.currency || item.currency || paymentCurrency;
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

    const pdfBytes = await pdfDoc.save();
    return new Uint8Array(pdfBytes);
}
