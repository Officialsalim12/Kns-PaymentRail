const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dcnxszcexngyghbelbrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnhzemNleG5neWdoYmVsYnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg2MjA5NSwiZXhwIjoyMDgxNDM4MDk1fQ.GXuZiMavTcf1i0ISNgovngnjnov6YspuTTCElNeQZec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !logs || logs.length === 0) {
        console.error("Error fetching logs:", error);
        return;
    }

    try {
        const bodyStr = logs[0].payload.body;
        console.log("--- Raw Body ---");
        console.log(bodyStr);
        
        const body = JSON.parse(bodyStr);
        console.log("--- Body Keys ---");
        console.log(Object.keys(body));
        
        console.log("--- Data Section ---");
        console.log(JSON.stringify(body.data, null, 2));
        
        if (body.data && body.data.metadata) {
            console.log("--- Metadata found in data ---");
            console.log(JSON.stringify(body.data.metadata, null, 2));
        } else if (body.metadata) {
            console.log("--- Metadata found at root ---");
            console.log(JSON.stringify(body.metadata, null, 2));
        } else {
            console.log("--- No Metadata found! ---");
        }
    } catch (e) {
        console.error("Error parsing body:", e.message);
    }
}

main();
