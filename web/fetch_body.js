const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dcnxszcexngyghbelbrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnhzemNleG5neWdoYmVsYnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg2MjA5NSwiZXhwIjoyMDgxNDM4MDk1fQ.GXuZiMavTcf1i0ISNgovngnjnov6YspuTTCElNeQZec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error("Error fetching log:", error);
        return;
    }

    console.log("--- Latest Webhook Body ---");
    console.log(data[0].payload.body);
}

main();
