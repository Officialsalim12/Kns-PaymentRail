const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dcnxszcexngyghbelbrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnhzemNleG5neWdoYmVsYnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg2MjA5NSwiZXhwIjoyMDgxNDM4MDk1fQ.GXuZiMavTcf1i0ISNgovngnjnov6YspuTTCElNeQZec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching last 5 webhook headers...");
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    data.forEach((log, index) => {
        console.log(`--- Log ${index + 1} ---`);
        console.log("Created At:", log.created_at);
        console.log("Verified:", log.verified);
        console.log("Headers:", JSON.stringify(log.payload.headers, null, 2));
        console.log("Signature Value from headers:", log.payload.headers['x-monime-signature'] || log.payload.headers['monime-signature'] || "NOT FOUND");
    });
}

main();
