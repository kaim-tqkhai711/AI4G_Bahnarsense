import { supabase } from '@/utils/supabaseAdmin';

export class ReviewRepository {
    async logError(uid: string, data: { item_id: string; [key: string]: unknown }) {
        const { data: existing } = await supabase
            .from('review_cards')
            .select('id, error_count')
            .eq('user_id', uid)
            .eq('item_id', data.item_id)
            .maybeSingle();

        const nextReviewFactor = existing?.error_count ? (existing.error_count as number) + 1 : 1;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewFactor);

        const { item_id: _omit, ...rest } = data;
        const payload = {
            user_id: uid,
            item_id: data.item_id,
            ...rest,
            error_count: nextReviewFactor,
            next_review_date: nextReviewDate.toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
            await supabase.from('review_cards').update(payload).eq('id', existing.id);
        } else {
            await supabase.from('review_cards').insert(payload);
        }
        return { success: true };
    }

    async getDailyTasks(uid: string) {
        const today = new Date().toISOString();
        const { data, error } = await supabase
            .from('review_cards')
            .select('*')
            .eq('user_id', uid)
            .lte('next_review_date', today)
            .limit(20);
        if (error) throw error;
        return data || [];
    }

    async getDueReviews(uid: string) {
        const today = new Date().toISOString();
        const { data, error } = await supabase
            .from('review_cards')
            .select('*')
            .eq('user_id', uid)
            .lte('next_review_date', today);
        if (error) throw error;
        return (data || []).map((row: Record<string, unknown>) => ({ id: row.id, ...row }));
    }

    async postponeReviews(uid: string, newDate: string) {
        const today = new Date().toISOString();
        const { data: rows, error: fetchErr } = await supabase
            .from('review_cards')
            .select('id')
            .eq('user_id', uid)
            .lte('next_review_date', today);
        if (fetchErr || !rows?.length) return 0;

        for (const row of rows) {
            await supabase
                .from('review_cards')
                .update({ next_review_date: newDate, updated_at: new Date().toISOString() })
                .eq('id', row.id);
        }
        return rows.length;
    }
}
