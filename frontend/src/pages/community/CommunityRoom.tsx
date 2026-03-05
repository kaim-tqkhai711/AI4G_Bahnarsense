import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sword, Trophy, User, HeartHandshake, Search, UserPlus } from 'lucide-react';
import { socket } from '../../lib/socket';
import { triggerWinBurst } from '../../lib/confetti';
import { useUserStore } from '../../store/useUserStore';
import { fetchWithMonitor } from '../../lib/monitor';

type Friend = {
    id: string;
    name: string;
    xp: number;
    streak: number;
    online: boolean;
};

type IncomingChallenge = {
    fromId: string;
    fromName: string;
};

function levelFromXp(xp: number): string {
    if (xp < 300) return 'Mầm non';
    if (xp < 800) return 'Tiểu học';
    if (xp < 1500) return 'THCS';
    if (xp < 2500) return 'THPT';
    return 'Cao thủ';
}

export function CommunityRoom() {
    const { user, token } = useUserStore();
    const currentUserId = user?.id || 'guest';
    const currentUserName = user?.name || 'Khách';
    const currentXp = user?.xp || 0;

    const [incoming, setIncoming] = useState<IncomingChallenge[]>([]);
    const [lastMatchResult, setLastMatchResult] = useState<'win' | 'lose' | null>(null);

    // Search Friend State
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState<Friend | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Đôi bạn cùng tiến: target số bài trong ngày (mock dữ liệu)
    const buddyTarget = 3;
    const buddyProgress = {
        you: 2,
        friend: 1,
        friendName: 'An',
    };

    // Mock friends & suggestions – in thực tế sẽ lấy từ backend
    const friends: Friend[] = useMemo(
        () => [
            { id: 'friend_an', name: 'An', xp: 1200, streak: 5, online: true },
            { id: 'friend_binh', name: 'Bình', xp: 900, streak: 12, online: false },
            { id: 'friend_chi', name: 'Chi', xp: 1800, streak: 21, online: true },
        ],
        []
    );

    const suggestions: Friend[] = useMemo(
        () => [
            { id: 'sug_hai', name: 'Hải', xp: currentXp + 100, streak: 3, online: true },
            { id: 'sug_lan', name: 'Lan', xp: currentXp - 120, streak: 7, online: true },
            { id: 'sug_phong', name: 'Phong', xp: currentXp + 260, streak: 1, online: false },
        ],
        [currentXp]
    );

    useEffect(() => {
        socket.connect();
        socket.emit('authenticate', { user_id: currentUserId });

        socket.on('receive_challenge', (data: { from_user: string; from_name?: string }) => {
            setIncoming((prev) => [
                ...prev,
                {
                    fromId: data.from_user,
                    fromName: data.from_name || data.from_user,
                },
            ]);
        });

        socket.on('match_end', (data: { winner_id: string }) => {
            const win = data.winner_id === currentUserId;
            setLastMatchResult(win ? 'win' : 'lose');
            if (win) {
                triggerWinBurst();
            }
        });

        return () => {
            socket.off('receive_challenge');
            socket.off('match_end');
            socket.disconnect();
        };
    }, [currentUserId]);

    const handleChallenge = (friend: Friend) => {
        socket.emit('send_challenge', { to_user_id: friend.id, from_user_name: currentUserName });
    };

    const handleAccept = (challenge: IncomingChallenge) => {
        socket.emit('accept_challenge', { user_a_id: currentUserId, user_b_id: challenge.fromId });
        setIncoming((prev) => prev.filter((c) => c.fromId !== challenge.fromId));
    };

    const handleDecline = (challenge: IncomingChallenge) => {
        setIncoming((prev) => prev.filter((c) => c.fromId !== challenge.fromId));
    };

    const handleSearchFriend = async () => {
        if (!searchId.trim()) return;
        setIsSearching(true);
        setSearchResult(null);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetchWithMonitor<{ data: any }>(
                `${API_URL}/api/v1/community/friends/search?user_id=${searchId.trim()}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            const foundUser = res.data;
            setSearchResult({
                id: foundUser.id,
                name: foundUser.username || foundUser.name || 'Người dùng',
                xp: foundUser.xp || 0,
                streak: foundUser.streak || 0,
                online: false // Mock cho MVP
            });
        } catch (e) {
            alert('Không tìm thấy người dùng với ID này!');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async (id: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetchWithMonitor(
                `${API_URL}/api/v1/community/friends/add`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ friend_id: id })
                }
            );
            alert('Đã gửi yêu cầu kết bạn thành công!');
            setSearchResult(null);
            setSearchId('');
        } catch (e: any) {
            alert(e.message || 'Có lỗi xảy ra khi kết bạn!');
        }
    };

    return (
        <div className="flex flex-col h-full w-full items-stretch bg-white">
            {/* Header */}
            <div className="pb-4 pt-2 border-b border-stone-100 flex items-center justify-between mb-4">
                <div>
                    <h2 className="font-bold text-stone-900 text-2xl tracking-tight">Cộng đồng Ba Na</h2>
                    <p className="text-stone-500 text-sm font-medium">
                        Kết bạn, thách đấu và cùng luyện tập
                    </p>
                </div>
                <div className="hidden md:flex flex-col items-end text-right">
                    <span className="text-xs text-stone-400 font-semibold">Tài khoản</span>
                    <span className="text-sm font-bold text-stone-800 max-w-[160px] truncate">{currentUserName}</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                        {levelFromXp(currentXp)} · {currentXp} XP
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-2">
                {/* Friends list + Đôi bạn cùng tiến */}
                <section className="bg-stone-50 rounded-3xl p-4 md:p-5 border border-stone-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                            Bạn bè của bạn
                        </h3>
                        <span className="text-[11px] text-stone-500 font-semibold">
                            {friends.length} bạn
                        </span>
                    </div>

                    <div className="space-y-3">
                        {friends.map((f) => (
                            <div
                                key={f.id}
                                className="flex items-center justify-between bg-white rounded-2xl px-3 py-2.5 border border-stone-100 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 border-2 border-white shadow-sm flex items-center justify-center relative">
                                        <User className="w-5 h-5 text-stone-400" />
                                        {f.online && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-stone-800">{f.name}</p>
                                        <p className="text-[11px] text-stone-500 font-semibold">
                                            {levelFromXp(f.xp)} · {f.xp} XP · 🔥 {f.streak} ngày
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleChallenge(f)}
                                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300 transition-colors"
                                    title="Thách đấu"
                                >
                                    <Sword className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {friends.length === 0 && (
                            <p className="text-sm text-stone-500 text-center py-4">
                                Bạn chưa có bạn bè nào. Hãy thử gửi lời mời từ danh sách gợi ý nhé!
                            </p>
                        )}
                    </div>

                    {/* Đôi bạn cùng tiến: theo dõi mục tiêu chung */}
                    <div className="mt-4 rounded-2xl bg-white border border-emerald-100 p-3 md:p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <HeartHandshake className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                                        Đôi bạn cùng tiến
                                    </p>
                                    <p className="text-[11px] text-emerald-700 font-semibold">
                                        Mục tiêu hôm nay: mỗi người hoàn thành {buddyTarget} bài
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-2">
                            <div>
                                <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                                    <span>{currentUserName} (Bạn)</span>
                                    <span>
                                        {buddyProgress.you}/{buddyTarget} bài
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-emerald-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(Math.min(buddyProgress.you, buddyTarget) / buddyTarget) * 100}%` }}
                                        transition={{ duration: 0.6 }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                                    <span>{buddyProgress.friendName}</span>
                                    <span>
                                        {buddyProgress.friend}/{buddyTarget} bài
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-amber-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(Math.min(buddyProgress.friend, buddyTarget) / buddyTarget) * 100}%` }}
                                        transition={{ duration: 0.6 }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 text-[11px] font-semibold text-stone-500 flex flex-col gap-1">
                            <span>
                                🎁 Nếu <span className="text-emerald-700">cả hai đều đạt</span>: +30 Sao Vàng cho mỗi bạn.
                            </span>
                            <span>
                                😅 Nếu <span className="text-rose-600">một trong hai không đạt</span>: mất 1 ngày streak của cả cặp.
                            </span>
                        </div>
                    </div>
                </section>

                {/* Suggestions & incoming challenges */}
                <section className="flex flex-col gap-4">
                    {/* Add Friend Input */}
                    <div className="bg-white rounded-3xl p-4 md:p-5 border border-stone-100 shadow-sm">
                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide mb-3">Thêm bạn mới</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nhập ID người dùng (VD: user-123)..."
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchFriend()}
                                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-stone-300 focus:bg-white transition-colors"
                            />
                            <button
                                onClick={handleSearchFriend}
                                disabled={isSearching || !searchId.trim()}
                                className="bg-stone-900 text-white p-2 px-4 rounded-xl flex items-center justify-center font-bold text-sm hover:bg-stone-800 disabled:opacity-50 transition-colors"
                            >
                                {isSearching ? 'Đang tìm...' : <Search className="w-4 h-4" />}
                            </button>
                        </div>
                        {searchResult && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-500 shadow-sm border border-stone-200">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-stone-800 line-clamp-1 max-w-[120px]">{searchResult.name}</p>
                                        <p className="text-[10px] text-stone-500 font-semibold">{levelFromXp(searchResult.xp)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddFriend(searchResult.id)}
                                    className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-200 flex items-center gap-1 transition-colors"
                                >
                                    <UserPlus className="w-3.5 h-3.5" /> Kết bạn
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Incoming challenges */}
                    <div className="bg-emerald-50 rounded-3xl p-4 md:p-5 border border-emerald-100">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wide">
                                Lời thách đấu đến
                            </h3>
                        </div>

                        {incoming.length === 0 ? (
                            <p className="text-sm text-emerald-800/80">
                                Chưa có ai thách đấu bạn. Khi có lời mời, bạn sẽ thấy ở đây.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {incoming.map((c) => (
                                    <div
                                        key={c.fromId}
                                        className="flex items-center justify-between bg-white/60 rounded-2xl px-3 py-2.5 border border-emerald-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-500">
                                                <Sword className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-900">
                                                    {c.fromName}
                                                </p>
                                                <p className="text-[11px] text-emerald-800/80 font-semibold">
                                                    muốn thách đấu 1v1 với bạn
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDecline(c)}
                                                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                                            >
                                                Từ chối
                                            </button>
                                            <button
                                                onClick={() => handleAccept(c)}
                                                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700"
                                            >
                                                Chấp nhận
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Friend suggestions */}
                    <div className="bg-white rounded-3xl p-4 md:p-5 border border-stone-100 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                                Gợi ý kết bạn (EXP gần bạn)
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {suggestions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between bg-stone-50 rounded-2xl px-3 py-2.5 border border-stone-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-stone-500 border border-stone-200">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-stone-800">{s.name}</p>
                                            <p className="text-[11px] text-stone-500 font-semibold">
                                                {levelFromXp(s.xp)} · {s.xp} XP · 🔥 {s.streak} ngày
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleChallenge(s)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300 transition-colors"
                                            title="Thách đấu"
                                        >
                                            <Sword className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Last result badge */}
                    {lastMatchResult && (
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                                <Trophy className="w-3 h-3" />
                            </div>
                            <span className="font-semibold">
                                Kết quả gần nhất:{" "}
                                <span className={lastMatchResult === 'win' ? 'text-emerald-600' : 'text-rose-500'}>
                                    {lastMatchResult === 'win' ? 'Bạn đã thắng!' : 'Bạn thua, thử lại nhé!'}
                                </span>
                            </span>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
