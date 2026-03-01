import { supabase } from '@/utils/supabaseAdmin';

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
        equippedItems: row.equipped_items ?? {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class UserRepository {
    async getProfile(uid: string) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
        if (error) {
            if (error.code === 'PGRST116') throw new Error('User profile not found');
            throw error;
        }
        return profileFromRow(data);
    }

    async updateProfile(uid: string, data: Record<string, unknown>) {
        const safeData = { ...data };
        delete safeData.gongs;
        delete safeData.gems;
        delete safeData.xp;
        delete safeData.streak;

        const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (safeData.username !== undefined) updatePayload.username = safeData.username;
        if (safeData.email !== undefined) updatePayload.email = safeData.email;
        if (safeData.role !== undefined) updatePayload.role = safeData.role;
        if (safeData.level !== undefined) updatePayload.level = safeData.level;
        if (safeData.equippedItems !== undefined) updatePayload.equipped_items = safeData.equippedItems;
        if (safeData.inventory !== undefined) updatePayload.inventory = safeData.inventory;

        if (Object.keys(updatePayload).length <= 1) return this.getProfile(uid);

        const { error } = await supabase.from('profiles').update(updatePayload).eq('id', uid);
        if (error) throw error;

        return this.getProfile(uid);
    }

    async updateLevelAndPath(uid: string, level: string, path: string[]) {
        const { error } = await supabase.from('profiles').update({
            level_assigned: level,
            learning_path: path,
            survey_completed: true,
            updated_at: new Date().toISOString(),
        }).eq('id', uid);
        if (error) throw error;
        return { level_assigned: level, learning_path: path };
    }
}
