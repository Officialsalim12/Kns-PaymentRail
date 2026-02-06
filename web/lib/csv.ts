export interface ReportData {
    id: string
    payment_date: string
    created_at: string
    member_name: string
    membership_id: string
    amount: number
    payment_method: string
    payment_status: string
    reference_number: string
    description: string
}

export async function convertToCSV(data: ReportData[]): Promise<string> {
    if (data.length === 0) {
        return 'No data available'
    }

    // CSV Headers
    const headers = [
        'Payment ID',
        'Payment Date',
        'Created At',
        'Member Name',
        'Membership ID',
        'Amount',
        'Payment Method',
        'Payment Status',
        'Reference Number',
        'Description'
    ]

    // Convert data to CSV rows
    const rows = data.map(payment => [
        payment.id,
        payment.payment_date,
        payment.created_at,
        `"${payment.member_name.replace(/"/g, '""')}"`,
        payment.membership_id,
        payment.amount.toString(),
        payment.payment_method,
        payment.payment_status,
        payment.reference_number,
        `"${payment.description.replace(/"/g, '""')}"`
    ])

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')

    return csvContent
}
