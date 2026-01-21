#!/bin/bash

# Script to verify edge functions are deployed
# Usage: ./scripts/verify-edge-functions.sh

echo "🔍 Checking Edge Functions Deployment Status..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "   Install it: npm install -g supabase"
    exit 1
fi

echo "📋 Listing deployed functions..."
echo ""

# List all deployed functions
supabase functions list

echo ""
echo "🔍 Checking for update-reports function..."
echo ""

# Check if update-reports exists locally
if [ -f "supabase/functions/update-reports/index.ts" ]; then
    echo "✅ update-reports function file exists locally"
else
    echo "❌ update-reports function file NOT found locally"
    echo "   Expected location: supabase/functions/update-reports/index.ts"
fi

echo ""
echo "💡 To deploy update-reports function:"
echo "   supabase functions deploy update-reports"
echo ""
echo "💡 To check function logs:"
echo "   supabase functions logs update-reports"
echo ""
