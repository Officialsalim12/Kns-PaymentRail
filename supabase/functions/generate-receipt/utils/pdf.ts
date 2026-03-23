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

    const drawLabelValueRow = (label: string, value: string, y: number, opts?: { valueColor?: any }) => {
      page.drawText(truncate(label, 22) + ':', { x: labelX, y, size: 10, font: helveticaFont, color: rgb(0.2, 0.2, 0.2) })
      const v = value ?? ''
      page.drawText(truncate(String(v), maxValueChars), { x: valueX, y, size: 10, font: helveticaFont, color: opts?.valueColor ?? rgb(0, 0, 0) })
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

    // Always prefer the platform's recorded payment timestamp for the receipt,
    // and only fall back to Monime metadata if those fields are missing.
    const paymentTimestamp =
        payment.payment_date ||
        payment.created_at ||
        monimePaymentData?.created_at ||
        monimePaymentData?.createdAt ||
        monimePaymentData?.paid_at ||
        monimePaymentData?.paidAt ||
        monimePaymentData?.completed_at ||
        monimePaymentData?.completedAt ||
        new Date().toISOString()

    const actualPaymentDate = new Date(paymentTimestamp)
    const formattedDate = actualPaymentDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    })

    const memberName = payment?.member?.full_name || 'Member'
    const memberInitial = memberName?.[0] || 'M'

    let yPosition = height - 56

    // Header
    page.drawLine({
      start: { x: marginX, y: yPosition + 14 },
      end: { x: rightEdge, y: yPosition + 14 },
      thickness: 1,
      color: rgb(0.92, 0.94, 1)
    })

    page.drawText("PAYMENT RECEIPT", {
      x: marginX,
      y: yPosition + 6,
      size: 22,
      font: helveticaBoldFont,
      color: rgb(0, 0, 0)
    })

    // Avatar + top identity row
    drawAvatar(memberInitial, marginX + 22, yPosition - 10, 18)
    drawCentered("Receipt Information", yPosition - 2, 12, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 44

    drawLabelValueRow("Receipt No", receiptNumber, yPosition)
    yPosition -= rowHeight
    drawLabelValueRow("Date", formattedDate, yPosition)
    yPosition -= sectionGap

    // Organization
    page.drawText("Organization", { x: marginX, y: yPosition, size: 13, font: helveticaBoldFont, color: rgb(0, 0, 0) })
    yPosition -= sectionGap / 1.2
    drawLabelValueRow("Name", payment?.member?.organization?.name || 'N/A', yPosition)
    yPosition -= rowHeight
    if (payment?.member?.organization?.organization_type) {
      drawLabelValueRow("Type", payment.member.organization.organization_type, yPosition)
      yPosition -= rowHeight
    }
    yPosition -= sectionGap

    // Member
    page.drawText("Member", { x: marginX, y: yPosition, size: 13, font: helveticaBoldFont, color: rgb(0, 0, 0) })
    yPosition -= sectionGap / 1.2
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
    yPosition -= sectionGap

    // Amount
    const paymentAmount =
      typeof payment.amount === 'string' ? parseFloat(payment.amount) : (payment.amount || 0)

    const paymentCurrency = payment.currency === 'SLE' ? 'Le' : (payment.currency || 'Le')
    const amountText = `${paymentCurrency} ${paymentAmount.toFixed(2)}`

    page.drawText("Amount Paid", { x: marginX, y: yPosition, size: 11, font: helveticaBoldFont, color: rgb(0.2, 0.2, 0.2) })
    yPosition -= 12
    drawCentered(amountText, yPosition, 22, helveticaBoldFont, rgb(0, 0, 0))
    yPosition -= 28

    // Payment details
    page.drawText("Payment Details", { x: marginX, y: yPosition, size: 13, font: helveticaBoldFont, color: rgb(0, 0, 0) })
    yPosition -= sectionGap / 1.2
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

    // Description
    const monimeDescription =
      monimePaymentData?.description ||
      monimePaymentData?.name ||
      payment?.description ||
      null

    if (monimeDescription) {
      yPosition -= 6
      page.drawText("Description", { x: marginX, y: yPosition, size: 11, font: helveticaBoldFont, color: rgb(0.2, 0.2, 0.2) })
      yPosition -= 12
      const lines = wrapText(String(monimeDescription), 80, 4)
      for (const line of lines) {
        page.drawText(line, { x: marginX, y: yPosition, size: 10, font: helveticaFont, color: rgb(0, 0, 0) })
        yPosition -= rowHeight
      }
      yPosition -= 8
    }

    // Line items (if any)
    if (monimePaymentData?.line_items?.length > 0) {
      page.drawText("Line Items", { x: marginX, y: yPosition, size: 11, font: helveticaBoldFont, color: rgb(0.2, 0.2, 0.2) })
      yPosition -= 14

      for (let i = 0; i < monimePaymentData.line_items.length; i++) {
        // Keep space for the footer at the bottom of the page.
        if (yPosition < 170) break
        const item = monimePaymentData.line_items[i]
        const itemName = item?.name || item?.description || `Item ${i + 1}`
        const itemPrice = item?.price?.value || item?.price || item?.amount || 0
        const itemCurrency = item?.price?.currency || item?.currency || paymentCurrency
        const itemQuantity = item?.quantity || 1

        const line = `${truncate(String(itemName), 28)} - ${itemCurrency} ${parseFloat(String(itemPrice)).toFixed(2)} x ${itemQuantity}`
        page.drawText(line, { x: marginX + 5, y: yPosition, size: 9.5, font: helveticaFont, color: rgb(0, 0, 0) })
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
      color: rgb(0.92, 0.94, 1),
    })

    drawCentered("Thank you for your payment!", thankYouY, 12, helveticaBoldFont, rgb(0, 0, 0))
    page.drawText("This is an official receipt for your records.", {
      x: marginX,
      y: officialY,
      size: 9,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    })

    const pdfBytes = await pdfDoc.save();
    return new Uint8Array(pdfBytes);
}
