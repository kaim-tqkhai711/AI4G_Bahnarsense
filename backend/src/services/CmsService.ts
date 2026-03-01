import { supabase } from '@/utils/supabaseAdmin';

export class CmsService {
    async syncLessons(lessonsData: Record<string, unknown>[]) {
        let count = 0;
        for (const lesson of lessonsData) {
            const lessonId = lesson.lesson_id as string;
            if (!lessonId) continue;

            const row = { ...lesson, updated_at: new Date().toISOString() };
            const { error } = await supabase.from('lessons').upsert(row, { onConflict: 'lesson_id' });
            if (!error) count++;
        }
        return { synced_count: count };
    }
}
