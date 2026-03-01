import { supabase } from '@/utils/supabaseAdmin';

export type LessonRow = {
    lesson_id: string;
    title: string;
    description?: string;
    content?: unknown;
    order_index?: number;
    type?: string;
    correct_answer?: string;
};

export class LessonRepository {
    /** All lessons from DB, ordered (for learning path). */
    async getLessonsFromDb(): Promise<LessonRow[]> {
        const { data, error } = await supabase
            .from('lessons')
            .select('lesson_id, title, description, content, order_index, type, correct_answer')
            .order('order_index', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return (data || []) as LessonRow[];
    }

    /** Single lesson by id (for submit answer). */
    async getLessonById(lessonId: string): Promise<LessonRow | null> {
        const { data, error } = await supabase
            .from('lessons')
            .select('lesson_id, title, description, content, order_index, type, correct_answer')
            .eq('lesson_id', lessonId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as LessonRow;
    }

    async getUserProgress(uid: string) {
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', uid);

        if (error) throw error;
        return (data || []).map((row: Record<string, unknown>) => ({
            user_id: row.user_id,
            lesson_id: row.lesson_id,
            status: row.status,
            completed_at: row.completed_at,
        }));
    }

    async appendLessonSuccess(uid: string, lessonId: string, earnedSaoVang: number, earnedXp: number) {
        const progressId = `${uid}_${lessonId}`;
        const { error: progressError } = await supabase.from('user_progress').upsert(
            {
                id: progressId,
                user_id: uid,
                lesson_id: lessonId,
                status: 'done',
                completed_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
        );
        if (progressError) throw progressError;

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('sao_vang, xp, streak')
            .eq('id', uid)
            .single();
        if (fetchError || !profile) throw fetchError || new Error('Profile not found');

        const currentSao = (profile.sao_vang ?? 0) as number;
        const currentXp = (profile.xp ?? 0) as number;
        const currentStreak = (profile.streak ?? 0) as number;

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                sao_vang: currentSao + earnedSaoVang,
                xp: currentXp + earnedXp,
                streak: currentStreak + 1,
            })
            .eq('id', uid);
        if (updateError) throw updateError;

        return true;
    }
}
