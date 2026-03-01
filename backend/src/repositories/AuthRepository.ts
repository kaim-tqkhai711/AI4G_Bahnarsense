import { supabase } from '@/utils/supabaseAdmin';

/** Map DB row (snake_case) to app shape (camelCase) */
function profileFromRow(row: Record<string, unknown>) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        level: row.level,
        level_assigned: row.level_assigned,
        learning_path: row.learning_path,
        survey_completed: row.survey_completed,
        xp: row.xp ?? 0,
        gongs: row.gongs ?? 0,
        sao_vang: row.sao_vang ?? 0,
        gems: row.gems ?? 0,
        streak: row.streak ?? 0,
        inventory: row.inventory ?? [],
        equippedItems: row.equipped_items ?? { skin: 'item_skin_2' },
        streak_recovery_count: row.streak_recovery_count,
        streak_recovery_month: row.streak_recovery_month,
        win_count: row.win_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class AuthRepository {
    async createProfile(data: { uid: string; email: string; role: string; username?: string }) {
        const profileData = {
            id: data.uid,
            username: data.username || data.email.split('@')[0],
            email: data.email,
            role: data.role,
            level: 'A1',
            xp: 0,
            gongs: 0,
            sao_vang: 0,
            gems: 0,
            streak: 0,
            inventory: [],
            equipped_items: { skin: 'item_skin_2' },
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('profiles').insert(profileData);
        if (error) throw error;

        return profileFromRow({ ...profileData, id: data.uid })!;
    }

    async getProfile(uid: string) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
        if (error) {
            if (error.code === 'PGRST116') return null; // no rows
            throw error;
        }
        return profileFromRow(data);
    }

    async getProfileOrCreate(uid: string, email: string, role: string = 'student', username?: string) {
        let profile = await this.getProfile(uid);
        let isNewUser = false;

        if (!profile) {
            profile = await this.createProfile({ uid, email, role, username });
            isNewUser = true;
        }

        return { profile, isNewUser };
    }
}
