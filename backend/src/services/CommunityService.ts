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

    async searchFriend(query: string, currentUserId: string) {
        // Search by username or email
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, email, level, xp, streak')
            .or(`username.ilike.%${query}%,email.eq.${query}`)
            .neq('id', currentUserId)
            .limit(5);
            
        if (error) throw new Error('Lỗi khi tìm kiếm người dùng.');
        return data || [];
    }

    async addFriend(senderId: string, receiverId: string) {
        if (senderId === receiverId) throw new Error('Không thể tự kết bạn với chính mình.');
        
        // Kiểm tra xem receiver có tồn tại không
        const { data: receiver } = await supabase.from('profiles').select('id').eq('id', receiverId).single();
        if (!receiver) throw new Error('Người dùng không tồn tại.');

        // Kiểm tra xem đã gửi yêu cầu chưa hoặc đã là bạn bè chưa
        const { data: existing } = await supabase
            .from('friend_requests')
            .select('status')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .single();

        if (existing) {
            if (existing.status === 'pending') throw new Error('Yêu cầu kết bạn đang chờ xử lý.');
            if (existing.status === 'accepted') throw new Error('Hai người đã là bạn bè.');
            // Nếu rejected, có thể cho phép gửi lại bằng cách update hoặc xóa cũ tạo mới.
            // Để đơn giản, xóa cái cũ đi
            await supabase.from('friend_requests').delete().or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);
        }

        const { error } = await supabase
            .from('friend_requests')
            .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });

        if (error) throw new Error('Lỗi khi gửi yêu cầu kết bạn: ' + error.message);
        return { success: true, message: 'Đã gửi yêu cầu kết bạn!' };
    }

    async getFriendRequests(userId: string) {
        const { data, error } = await supabase
            .from('friend_requests')
            .select('id, sender_id, status, created_at, profiles!friend_requests_sender_id_fkey(username, xp, level)')
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw new Error('Lỗi khi lấy danh sách lời mời kết bạn.');
        return data || [];
    }

    async acceptFriend(userId: string, requestId: string) {
        // Cập nhật trạng thái thành accepted
        const { error } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('receiver_id', userId)
            .eq('status', 'pending');

        if (error) throw new Error('Lỗi khi chấp nhận kết bạn.');
        return { success: true, message: 'Đã chấp nhận kết bạn!' };
    }

    async declineFriend(userId: string, requestId: string) {
        const { error } = await supabase
            .from('friend_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('receiver_id', userId)
            .eq('status', 'pending');

        if (error) throw new Error('Lỗi khi từ chối kết bạn.');
        return { success: true, message: 'Đã từ chối kết bạn.' };
    }

    async getFriends(userId: string) {
        // Bạn bè là những người có status = 'accepted' mà userId là sender hoặc receiver
        const { data, error } = await supabase
            .from('friend_requests')
            .select(`
                id,
                sender:profiles!friend_requests_sender_id_fkey(id, username, xp, streak, level),
                receiver:profiles!friend_requests_receiver_id_fkey(id, username, xp, streak, level)
            `)
            .eq('status', 'accepted')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (error) throw new Error('Lỗi khi lấy danh sách bạn bè.');

        // Parse list
        const friends = (data || []).map((row: any) => {
            if (row.sender.id === userId) return row.receiver;
            return row.sender;
        });

        return friends;
    }

    async inviteBuddy(userId: string, friendId: string, dailyTarget: number) {
        if (userId === friendId) throw new Error('Không thể tạo mục tiêu với chính mình.');
        
        // Kiểm tra xem đã có buddy progress nào đang active không
        const { data: existing } = await supabase
            .from('buddy_progress')
            .select('id')
            .eq('status', 'active')
            .or(`and(user_a_id.eq.${userId},user_b_id.eq.${friendId}),and(user_a_id.eq.${friendId},user_b_id.eq.${userId})`)
            .single();

        if (existing) {
            throw new Error('Hai bạn đã có mục tiêu chung đang hoạt động.');
        }

        const { error } = await supabase
            .from('buddy_progress')
            .insert({ user_a_id: userId, user_b_id: friendId, daily_target: dailyTarget, status: 'active' });

        if (error) throw new Error('Lỗi khi tạo mục tiêu chung: ' + error.message);
        return { success: true, message: 'Đã tạo mục tiêu chung thành công!' };
    }

    async getBuddyProgress(userId: string) {
        // Lấy mục tiêu chung đang active của user
        const { data: progress, error: err1 } = await supabase
            .from('buddy_progress')
            .select(`
                id, daily_target, created_at,
                user_a:profiles!buddy_progress_user_a_id_fkey(id, username),
                user_b:profiles!buddy_progress_user_b_id_fkey(id, username)
            `)
            .eq('status', 'active')
            .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
            .single();

        if (err1 && err1.code !== 'PGRST116') throw new Error('Lỗi khi lấy tiến độ chung.');
        if (!progress) return null;

        const todayStr = new Date().toISOString().split('T')[0];

        const [{ data: userAProgress }, { data: userBProgress }] = await Promise.all([
            supabase.from('user_progress').select('id').eq('user_id', (progress.user_a as any).id).gte('completed_at', `${todayStr}T00:00:00Z`),
            supabase.from('user_progress').select('id').eq('user_id', (progress.user_b as any).id).gte('completed_at', `${todayStr}T00:00:00Z`)
        ]);

        return {
            ...progress,
            user_a_completed: userAProgress?.length || 0,
            user_b_completed: userBProgress?.length || 0
        };
    }

    async cancelBuddy(userId: string, targetBuddyId?: string) {
        let query = supabase.from('buddy_progress').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('status', 'active');
        if (targetBuddyId) {
            query = query.eq('id', targetBuddyId).or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
        } else {
            query = query.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
        }
        
        const { error } = await query;
        if (error) throw new Error('Lỗi khi hủy mục tiêu chung.');
        return { success: true, message: 'Đã hủy/hoàn thành mục tiêu chung.' };
    }
}
