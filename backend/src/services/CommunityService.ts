import { supabase } from '@/utils/supabaseAdmin';

export class CommunityService {
    async getMatchmakingList(uid: string, targetLevel?: string) {
        let searchLevel = targetLevel;

        if (!searchLevel) {
            const { data: userRow } = await supabase.from('profiles').select('level, level_assigned').eq('id', uid).single();
            if (!userRow) throw new Error('User profile not found.');
            searchLevel = (userRow as { level_assigned?: string; level?: string }).level_assigned ?? (userRow as { level?: string }).level ?? 'A1';
        }

        const { data: matches, error } = await supabase
            .from('profiles')
            .select('id, username, level, level_assigned')
            .eq('level', searchLevel)
            .limit(10);
        if (error) throw error;

        const list = (matches || [])
            .map((row: Record<string, unknown>) => ({ id: row.id, ...row, level_assigned: row.level_assigned ?? row.level }))
            .filter((user: Record<string, unknown>) => String(user.id) !== uid);

        return { match_level: searchLevel, available_opponents: list };
    }
}
