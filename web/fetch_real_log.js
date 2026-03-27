const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dcnxszcexngyghbelbrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnhzemNleG5neWdoYmVsYnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg2MjA5NSwiZXhwIjoyMDgxNDM4MDk1fQ.GXuZiMavTcf1i0ISNgovngnjnov6YspuTTCElNeQZec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching logs...");
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error || !data) {
        console.error("Error fetching logs:", error);
        return;
    }

    const realLog = data.find(l => {
        const ua = l.payload && l.payload.headers && l.payload.headers['user-agent'];
        return ua && !ua.toLowerCase().includes('curl');
    });

    if (!realLog) {
        console.log("No real logs found in latest 20.");
        return;
    }

    fs.writeFileSync('real_log.json', JSON.stringify(realLog, null, 2));
    console.log("Saved to real_log.json");
}

main();
