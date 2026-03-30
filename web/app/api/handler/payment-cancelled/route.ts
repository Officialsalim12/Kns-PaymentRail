import { NextRequest, NextResponse } from 'next/server';

const PRODUCTION_BASE_URL = 'https://fundflow.sl';

function getBaseUrl(request: NextRequest): string {
    // Always prefer the env var — baked in at build time
    if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
        return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    // In production, use hardcoded domain — never trust request.url which may come from Monime with wrong host
    if (process.env.NODE_ENV === 'production') {
        return PRODUCTION_BASE_URL;
    }
    // Local dev: derive from request
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

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

        // Use env-aware base URL — never rely on request.url host
        const base = getBaseUrl(request);
        const redirectUrl = new URL('/payment-cancelled', base);
        console.log(`[payment-cancelled] Redirecting to: ${redirectUrl.toString()}`);

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
        console.error('Error handling POST request to payment-cancelled:', error);
        const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_BASE_URL;
        return NextResponse.redirect(new URL('/payment-cancelled', base), 303);
    }
}
