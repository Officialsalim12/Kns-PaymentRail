export async function generateReceiptPDF(
    payment: any,
    receiptNumber: string,
    monimePaymentData: any = null,
    fundflowLogoBytes: Uint8Array | null = null
): Promise<Uint8Array> {
    const { PDFDocument, rgb, StandardFonts } = await import(
        "https://esm.sh/pdf-lib@1.17.1"
    );

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let fundflowLogo: any = null
    if (fundflowLogoBytes) {
      fundflowLogo = await pdfDoc.embedPng(fundflowLogoBytes)
    }

    const marginX = 50;
    const rightEdge = width - marginX;

    const labelX = marginX;
    const valueX = marginX + 200;
    const maxValueChars = 34;
    const rowHeight = 16;
    const sectionGap = 18;

    const truncate = (input: string, maxChars: number) => {
      if (!input) return ''
      if (input.length <= maxChars) return input
      return input.slice(0, Math.max(0, maxChars - 3)) + '...'
    }

    const wrapText = (input: string, maxCharsPerLine: number, maxLines: number) => {
      if (!input) return []
      const words = input.split(/\s+/).filter(Boolean)
      const lines: string[] = []
      let current = ''

      for (const w of words) {
        const next = current ? `${current} ${w}` : w
        if (next.length <= maxCharsPerLine) {
          current = next
          continue
        }
        if (current) lines.push(current)
        current = w
        if (lines.length >= maxLines) break
      }
      if (lines.length < maxLines && current) lines.push(current)
      return lines
    }

    const drawCentered = (text: string, y: number, size: number, font: any, color: any) => {
      const safeText = text || ''
      const textWidth = font.widthOfTextAtSize(safeText, size)
      const x = (width - textWidth) / 2
      page.drawText(safeText, { x, y, size, font, color })
    }

    const drawLabelValueRow = (
      label: string,
      value: string,
      y: number,
      opts?: { valueColor?: any }
    ) => {
      const labelText = truncate(label, 22)
      const v = value ?? ''
      const valueText = truncate(String(v), maxValueChars)
      const line = `${labelText}: ${valueText}`

      drawCentered(line, y, 10, helveticaFont, opts?.valueColor ?? rgb(0, 0, 0))
    }

    const drawAvatar = (initial: string, centerX: number, centerY: number, radius: number) => {
      const bg = rgb(0.95, 0.97, 1)
      const border = rgb(0.2, 0.6, 1)
      page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: radius,
        yScale: radius,
        color: bg,
        borderColor: border,
        borderWidth: 1
      })

      const letter = (initial || '?').toUpperCase().slice(0, 1)
      const fontSize = 16
      const letterWidth = helveticaBoldFont.widthOfTextAtSize(letter, fontSize)
      page.drawText(letter, {
        x: centerX - letterWidth / 2,
        y: centerY - fontSize / 3,
        size: fontSize,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.2, 0.35)
      })
    }

    const isDateOnly = (val: unknown): boolean =>
      typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())

    const hasTime = (val: unknown): boolean =>
      typeof val === "string" && val.includes("T")

    // 1. Determine Payment Timestamp:
    // Prefers payment_date from DB, falling back to update/creation times.
    const paymentTimestamp =
      (hasTime(payment?.payment_date) ? payment.payment_date : null) ||
      payment?.payment_date || 
      payment?.updated_at ||
      payment?.created_at ||
      (hasTime(monimePaymentData?.paid_at) ? monimePaymentData.paid_at : null) ||
      (hasTime(monimePaymentData?.completed_at) ? monimePaymentData.completed_at : null) ||
      new Date().toISOString()

    const actualPaymentDate = new Date(paymentTimestamp)
    const formattedDate = actualPaymentDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })

    const memberName = payment?.member?.full_name || 'Member'
    const memberInitial = memberName?.[0] || 'M'

    let yPosition = height - 50

    // Header Line
    page.drawLine({
      start: { x: marginX, y: yPosition + 10 },
      end: { x: rightEdge, y: yPosition + 10 },
      thickness: 1,
      color: rgb(0.9, 0.92, 1)
    })

    if (fundflowLogo) {
      const logoW = 120
      const logoH = 34
      page.drawImage(fundflowLogo, {
        x: (width - logoW) / 2,
        y: height - 90,
        width: logoW,
        height: logoH
      })
      yPosition -= 40
    }

    drawCentered("TRANSACTION RECEIPT", yPosition, 20, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 22
    drawCentered("Receipt Information", yPosition, 12, helveticaBoldFont, rgb(0.3, 0.3, 0.3))
    yPosition -= 24

    // Avatar + ID row
    drawAvatar(memberInitial, marginX + 22, height - 120, 18)

    drawLabelValueRow("Receipt No", receiptNumber, yPosition)
    yPosition -= rowHeight
    drawLabelValueRow("Date", formattedDate, yPosition)
    yPosition -= sectionGap + 10

    // Organization Section
    drawCentered("Organization", yPosition, 13, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 16
    drawLabelValueRow("Name", payment?.member?.organization?.name || 'N/A', yPosition)
    yPosition -= rowHeight
    if (payment?.member?.organization?.organization_type) {
      drawLabelValueRow("Type", payment.member.organization.organization_type, yPosition)
      yPosition -= rowHeight
    }
    yPosition -= sectionGap + 10

    // Member Section
    drawCentered("Member", yPosition, 13, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 16
    drawLabelValueRow("Name", memberName, yPosition)
    yPosition -= rowHeight
    drawLabelValueRow("Membership ID", String(payment?.member?.membership_id || 'N/A'), yPosition)
    yPosition -= rowHeight
    if (payment?.member?.email) {
      drawLabelValueRow("Email", String(payment.member.email), yPosition)
      yPosition -= rowHeight
    }
    if (payment?.member?.phone_number) {
      drawLabelValueRow("Phone", String(payment.member.phone_number), yPosition)
      yPosition -= rowHeight
    }
    yPosition -= sectionGap + 10

    // Amount Section
    const paymentAmount =
      typeof payment.amount === 'string' ? parseFloat(payment.amount) : (payment.amount || 0)
    const paymentCurrency = payment.currency === 'SLE' ? 'Le' : (payment.currency || 'Le')
    const amountText = `${paymentCurrency} ${paymentAmount.toFixed(2)}`

    drawCentered("Amount Paid", yPosition, 11, helveticaBoldFont, rgb(0.2, 0.2, 0.2))
    yPosition -= 22
    drawCentered(amountText, yPosition, 24, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 36

    // Payment details Section
    drawCentered("Payment Details", yPosition, 13, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 16
    drawLabelValueRow("Transaction ID", String(payment?.id || 'N/A'), yPosition)
    yPosition -= rowHeight

    const orderNumber =
      monimePaymentData?.order_number ||
      monimePaymentData?.orderNumber ||
      monimePaymentData?.order_id ||
      monimePaymentData?.orderId ||
      monimePaymentData?.order?.number ||
      monimePaymentData?.order?.id ||
      payment?.reference_number ||
      null

    if (orderNumber) {
      drawLabelValueRow("Order No", String(orderNumber), yPosition)
      yPosition -= rowHeight
    }

    const monimePaymentId = monimePaymentData?.id || payment?.monime_payment_id
    if (monimePaymentId) {
      drawLabelValueRow("Monime Pay ID", String(monimePaymentId), yPosition)
      yPosition -= rowHeight
    }

    drawLabelValueRow("Provider", "Monime", yPosition)
    yPosition -= rowHeight

    const monimePaymentMethod =
      monimePaymentData?.payment_method ||
      monimePaymentData?.paymentMethod ||
      monimePaymentData?.method ||
      payment?.payment_method ||
      "Mobile Payment"

    drawLabelValueRow("Method", String(monimePaymentMethod), yPosition)
    yPosition -= rowHeight

    const monimeStatus =
      monimePaymentData?.status ||
      monimePaymentData?.payment_status ||
      payment?.payment_status ||
      "Completed"

    drawLabelValueRow("Status", String(monimeStatus), yPosition, { valueColor: rgb(0, 0.6, 0) })
    yPosition -= rowHeight

    // Description Section
    const monimeDescription =
      monimePaymentData?.description ||
      monimePaymentData?.name ||
      payment?.description ||
      null

    if (monimeDescription) {
      yPosition -= 12
      drawCentered("Description", yPosition, 11, helveticaBoldFont, rgb(0.2, 0.2, 0.2))
      yPosition -= 16
      const lines = wrapText(String(monimeDescription), 80, 4)
      for (const line of lines) {
        drawCentered(line, yPosition, 10, helveticaFont, rgb(0, 0, 0))
        yPosition -= rowHeight
      }
      yPosition -= 10
    }

    // New Categorization Section (if provided)
    if (payment?.payment_type) {
      const typeLabel = payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)
      const isRecurring = payment.payment_type === 'monthly' || payment.payment_type === 'weekly';
      const quantityLabel = (isRecurring && payment.quantity && parseInt(payment.quantity) > 0) 
        ? ` (Quantity: ${payment.quantity})` 
        : "";
      drawLabelValueRow("Category", `${typeLabel}${quantityLabel}`, yPosition)
      yPosition -= rowHeight
    }

    // Line items Section (if any)
    if (monimePaymentData?.line_items?.length > 0) {
      yPosition -= 6
      drawCentered("Line Items", yPosition, 11, helveticaBoldFont, rgb(0.2, 0.2, 0.2))
      yPosition -= 16

      for (let i = 0; i < monimePaymentData.line_items.length; i++) {
        if (yPosition < 170) break
        const item = monimePaymentData.line_items[i]
        const itemName = item?.name || item?.description || `Item ${i + 1}`
        const itemPrice = item?.price?.value || item?.price || item?.amount || 0
        const itemCurrency = item?.price?.currency || item?.currency || paymentCurrency
        const itemQuantity = item?.quantity || 1

        const line = `${truncate(String(itemName), 28)} - ${itemCurrency} ${parseFloat(String(itemPrice)).toFixed(2)} x ${itemQuantity}`
        drawCentered(line, yPosition, 9.5, helveticaFont, rgb(0, 0, 0))
        yPosition -= 14
      }
    }

    // Footer
    const footerLineY = 70
    const thankYouY = 50
    const officialY = 30

    page.drawLine({
      start: { x: marginX, y: footerLineY },
      end: { x: rightEdge, y: footerLineY },
      thickness: 1,
      color: rgb(0.9, 0.92, 1),
    })

    drawCentered("Thank you for your payment!", thankYouY, 12, helveticaBoldFont, rgb(0, 0, 0))
    drawCentered(
      "This is an official receipt for your records.",
      officialY,
      9,
      helveticaFont,
      rgb(0.5, 0.5, 0.5)
    )

    const pdfBytes = await pdfDoc.save();
    return new Uint8Array(pdfBytes);
}
