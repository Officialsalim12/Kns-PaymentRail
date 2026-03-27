const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dcnxszcexngyghbelbrk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbnhzemNleG5neWdoYmVsYnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg2MjA5NSwiZXhwIjoyMDgxNDM4MDk1fQ.GXuZiMavTcf1i0ISNgovngnjnov6YspuTTCElNeQZec';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error || !logs) {
        console.error("Error fetching logs:", error);
        return;
    }

    for (const log of logs) {
        let paymentId = null;
        try {
            const body = typeof log.payload.body === 'string' ? JSON.parse(log.payload.body) : log.payload.body;
            paymentId = body.metadata?.payment_id || (body.data && body.data.metadata?.payment_id);
            console.log(`Log Created At: ${log.created_at}`);
            console.log(`Payment ID extracted: ${paymentId}`);
            
            if (paymentId) {
                const { data: payment } = await supabase.from('payments').select('id, payment_status').eq('id', paymentId).single();
                console.log(`Payment found in DB: ${!!payment}, Status: ${payment?.payment_status || 'N/A'}`);
            } else {
                console.log('No Payment ID found in this payload');
                console.log('Body structure:', Object.keys(body));
            }
        } catch (e) {
            console.error("Error processing log entry:", e.message);
        }
        console.log('---');
    }
}

main();
