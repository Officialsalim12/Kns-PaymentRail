import { NextRequest, NextResponse } from 'next/server';

const PRODUCTION_BASE_URL = 'https://fundflow.sl';

function getBaseUrl(request: NextRequest): string {
    // 1. Client-side priority: If the request is coming from localhost, keep it on localhost
    const url = new URL(request.url);
    if (url.hostname.includes('localhost')) {
        return `${url.protocol}//${url.host}`;
    }

    // 2. Otherwise, prefer the env var — baked in at build time
    if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
        return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
    }
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    // In production, use hardcoded domain as safety fallback
    if (process.env.NODE_ENV === 'production') {
        return PRODUCTION_BASE_URL;
    }
    // Fallback
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

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const searchParams = new URLSearchParams(url.search);

        let paymentId = searchParams.get('payment_id') || searchParams.get('paymentId') || searchParams.get('id');

        // Use env-aware base URL
        const base = getBaseUrl(request);
        const redirectUrl = new URL('/payment-cancelled', base);
        console.log(`[payment-cancelled GET] Redirecting to: ${redirectUrl.toString()}`);

        // Append all existing query params
        searchParams.forEach((value, key) => {
            redirectUrl.searchParams.set(key, value);
        });

        if (paymentId && !redirectUrl.searchParams.has('payment_id')) {
            redirectUrl.searchParams.set('payment_id', paymentId);
        }

        // Redirect to the GET page
        return NextResponse.redirect(redirectUrl, 303);
    } catch (error) {
        console.error('Error handling GET request to payment-cancelled:', error);
        const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_BASE_URL;
        return NextResponse.redirect(new URL('/payment-cancelled', base), 303);
    }
}
