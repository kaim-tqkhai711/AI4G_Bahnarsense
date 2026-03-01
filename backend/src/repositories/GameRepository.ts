import { supabase } from '@/utils/supabaseAdmin';

export class GameRepository {
    async purchaseItem(userId: string, itemId: string): Promise<boolean> {
        const { data: profileRow, error: profileErr } = await supabase
            .from('profiles')
            .select('sao_vang, inventory, equipped_items')
            .eq('id', userId)
            .single();
        if (profileErr || !profileRow) throw new Error('User profile not found.');

        const { data: itemRow, error: itemErr } = await supabase
            .from('shop_items')
            .select('price, type, name')
            .eq('id', itemId)
            .single();
        if (itemErr || !itemRow) throw new Error('Item not found or not active.');

        const profileData = profileRow as { sao_vang?: number; inventory?: string[]; equipped_items?: Record<string, string> };
        const itemData = itemRow as { price: number; type: string; name: string };
        const sao = profileData.sao_vang ?? 0;
        if (sao < itemData.price) throw new Error('Không đủ Sao Vàng.');

        const invId = `${userId}_${itemId}`;
        const { data: existingInv } = await supabase.from('inventory').select('id').eq('id', invId).single();
        if (existingInv) throw new Error('User already owns this item.');

        let categoryKey = '';
        if (itemData.type === 'Màu da') categoryKey = 'skin';
        else if (itemData.type === 'Trang phục') categoryKey = 'clothes';
        else if (itemData.type === 'Tóc') categoryKey = 'hair';
        else if (itemData.type === 'Phụ kiện') categoryKey = 'accessory';
        if (!categoryKey) throw new Error('Item type mapping failed.');

        const newInventory = [...(profileData.inventory || []), itemId];
        const newEquipped = { ...(profileData.equipped_items || {}), [categoryKey]: itemId };

        const { error: updErr } = await supabase
            .from('profiles')
            .update({
                sao_vang: sao - itemData.price,
                inventory: newInventory,
                equipped_items: newEquipped,
            })
            .eq('id', userId);
        if (updErr) throw updErr;

        const { error: invErr } = await supabase.from('inventory').insert({
            id: invId,
            user_id: userId,
            item_id: itemId,
            is_equipped: true,
            category: categoryKey,
            acquired_at: new Date().toISOString(),
        });
        if (invErr) throw invErr;

        await supabase.from('transaction_log').insert({
            user_id: userId,
            amount: -itemData.price,
            currency: 'sao_vang',
            type: 'shop_purchase',
            metadata: { item_id: itemId, item_name: itemData.name },
        });

        return true;
    }

    async recoverStreak(userId: string): Promise<boolean> {
        const STREAK_RECOVERY_COST = 20;
        const currentMonth = new Date().toISOString().substring(0, 7);

        const { data: profileRow, error: fetchErr } = await supabase
            .from('profiles')
            .select('sao_vang, streak_recovery_count, streak_recovery_month, streak')
            .eq('id', userId)
            .single();
        if (fetchErr || !profileRow) throw new Error('User profile not found.');

        const data = profileRow as { sao_vang?: number; streak_recovery_count?: number; streak_recovery_month?: string; streak?: number };
        if ((data.sao_vang ?? 0) < STREAK_RECOVERY_COST) {
            throw new Error('Bạn không đủ Sao Vàng để khôi phục chuỗi!');
        }

        let count = data.streak_recovery_count ?? 0;
        const month = data.streak_recovery_month ?? '';
        if (month !== currentMonth) count = 0;
        if (count >= 2) {
            throw new Error('Bạn đã hết lượt khôi phục chuỗi trong tháng này (Tối đa 2 lần/tháng).');
        }

        const { error: updErr } = await supabase
            .from('profiles')
            .update({
                sao_vang: (data.sao_vang ?? 0) - STREAK_RECOVERY_COST,
                streak_recovery_count: count + 1,
                streak_recovery_month: currentMonth,
                streak: (data.streak ?? 0) + 1,
            })
            .eq('id', userId);
        if (updErr) throw updErr;

        await supabase.from('transaction_log').insert({
            user_id: userId,
            amount: -STREAK_RECOVERY_COST,
            currency: 'sao_vang',
            type: 'streak_recovery',
        });

        return true;
    }
}
