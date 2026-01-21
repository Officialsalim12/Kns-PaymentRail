#!/bin/bash

# Script to sync all organizations to match standard structure
# Usage: ./scripts/sync-organizations.sh [orgId]

SUPABASE_URL="${SUPABASE_URL:-https://dcnxszcexngyghbelbrk.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ SUPABASE_ANON_KEY environment variable is not set"
    echo "   Set it: export SUPABASE_ANON_KEY=your_anon_key"
    exit 1
fi

ORG_ID="$1"

if [ -n "$ORG_ID" ]; then
    echo "🔄 Syncing organization $ORG_ID to match standard structure..."
    URL="${SUPABASE_URL}/functions/v1/sync-organization-structure?orgId=${ORG_ID}"
else
    echo "🔄 Syncing all organizations to match standard structure..."
    URL="${SUPABASE_URL}/functions/v1/sync-organization-structure"
fi

RESPONSE=$(curl -s -X POST "$URL" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
