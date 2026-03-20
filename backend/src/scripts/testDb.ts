import dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../utils/supabaseAdmin';

async function test() {
    console.log("Fetching from Supabase lessons table...");
    const { data, error } = await supabase
        .from('lessons')
        .select('lesson_id, title, description, content, order_index, type, correct_answer')
        .order('order_index', { ascending: true, nullsFirst: false });
        
    if (error) {
        console.error("Error fetching:", error);
    } else {
        console.log(`Successfully fetched ${data?.length} rows.`);
        if (data && data.length > 0) {
            console.log("First row:", JSON.stringify(data[0], null, 2));
            const introNodes = data.filter(l => l.type === 'intro_screen');
            console.log(`Found ${introNodes.length} intro_screen nodes.`);
            if (introNodes.length > 0) {
                console.log("First intro node:", JSON.stringify(introNodes[0], null, 2));
            }
        }
    }
}

test().catch(console.error);
