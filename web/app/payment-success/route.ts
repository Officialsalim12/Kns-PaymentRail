import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';
        const url = new URL(request.url);
        const searchParams = new URLSearchParams(url.search);

        let paymentId = searchParams.get('payment_id');

        // If payment_id is not in query params, try to find it in the body
        if (!paymentId) {
            if (contentType.includes('application/x-www-form-urlencoded')) {
                const formData = await request.formData();
                paymentId = formData.get('payment_id')?.toString() ||
                    formData.get('paymentId')?.toString() ||
                    formData.get('id')?.toString() || null;
            } else if (contentType.includes('application/json')) {
                const json = await request.json();
                paymentId = json.payment_id || json.paymentId || json.id || null;
            }
        }

        // Construct the redirect URL
        const redirectUrl = new URL('/payment-success', request.url);

        // Append all existing query params
        searchParams.forEach((value, key) => {
            redirectUrl.searchParams.set(key, value);
        });

        // Ensure payment_id is present if we found it in the body
        if (paymentId && !redirectUrl.searchParams.has('payment_id')) {
            redirectUrl.searchParams.set('payment_id', paymentId);
        }

        // Redirect to the GET page
        return NextResponse.redirect(redirectUrl, 303);
    } catch (error) {
        console.error('Error handling POST request to payment-success:', error);
        // Fallback redirect even if parsing fails
        return NextResponse.redirect(new URL('/payment-success', request.url), 303);
    }
}
