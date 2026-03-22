import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sword, Trophy, User, HeartHandshake, Search, UserPlus, Check, X } from 'lucide-react';
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
    wager: number;
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

    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    
    // Buddy Progress State
    const [buddyTarget, setBuddyTarget] = useState(3);
    const [buddyProgress, setBuddyProgress] = useState<{ you: number; friend: number; friendName: string } | null>(null);

    const [incoming, setIncoming] = useState<IncomingChallenge[]>([]);
    const [lastMatchResult, setLastMatchResult] = useState<'win' | 'lose' | 'draw' | null>(null);

    // Search Friend State
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState<Friend | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Wager Input Modal State
    const [wagerModal, setWagerModal] = useState<{ isOpen: boolean; friend: Friend | null; wager: number }>({ isOpen: false, friend: null, wager: 50 });

    // Match State
    type MatchData = { roomId: string; questions: any[] };
    const [matchData, setMatchData] = useState<MatchData | null>(null);
    const [matchPhase, setMatchPhase] = useState<'idle' | 'countdown' | 'playing' | 'waiting' | 'result'>('idle');
    const [countdown, setCountdown] = useState(3);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [myScore, setMyScore] = useState({ points: 0, correct: 0 });
    const [opponentScore, setOpponentScore] = useState(0);
    const [matchResultMsg, setMatchResultMsg] = useState('');

    useEffect(() => {
        const fetchCommunityData = async () => {
             const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
             try {
                 // Fetch friends
                 const res = await fetchWithMonitor<{ data: any }>(`${API_URL}/api/v1/community/friends`, { headers: { 'Authorization': `Bearer ${token}` } });
                 if (res.data) {
                     setFriends(res.data.map((f: any) => ({
                         id: f.id, name: f.username || 'Người dùng', xp: f.xp || 0, streak: f.streak || 0, online: true
                     })));
                 }

                 // Fetch friend requests
                 const reqs = await fetchWithMonitor<{ data: any }>(`${API_URL}/api/v1/community/friends/requests`, { headers: { 'Authorization': `Bearer ${token}` } });
                 if (reqs.data) {
                     setFriendRequests(reqs.data);
                 }

                 // Fetch buddy progress
                 const buddyRes = await fetchWithMonitor<{ data: any }>(`${API_URL}/api/v1/community/buddy`, { headers: { 'Authorization': `Bearer ${token}` } });
                 const buddyData = buddyRes.data;
                 if (buddyData) {
                     setBuddyTarget(buddyData.daily_target);
                     if (buddyData.user_a.id === currentUserId) {
                         setBuddyProgress({ you: buddyData.user_a_completed, friend: buddyData.user_b_completed, friendName: buddyData.user_b.username });
                     } else {
                         setBuddyProgress({ you: buddyData.user_b_completed, friend: buddyData.user_a_completed, friendName: buddyData.user_a.username });
                     }
                 }
             } catch (e) {
                 console.error("CommunityRoom fetch error", e);
             }
        };
        fetchCommunityData();
    }, [token, currentUserId]);

    useEffect(() => {
        socket.connect();
        socket.emit('authenticate', { user_id: currentUserId });

        socket.on('receive_challenge', (data: { from_user: string; from_name?: string; wager: number }) => {
            setIncoming((prev) => [
                ...prev,
                {
                    fromId: data.from_user,
                    fromName: data.from_name || 'Đối thủ',
                    wager: data.wager || 50
                },
            ]);
        });

        socket.on('challenge_failed', (data: { message: string }) => {
            alert(`Lỗi thách đấu: ${data.message}`);
        });

        socket.on('match_start', (data: any) => {
            setMatchData({ roomId: data.room_id, questions: data.questions });
            setMatchPhase('countdown');
            setCountdown(3);
            setCurrentQuestionIdx(0);
            setMyScore({ points: 0, correct: 0 });
            setOpponentScore(0);
        });

        socket.on('opponent_progress', (data: { user_id: string, correct: boolean }) => {
            if (data.correct) {
                setOpponentScore(prev => prev + 10);
            }
        });

        socket.on('match_end', (data: { winner_id: string | null; message: string }) => {
            setMatchPhase('result');
            setMatchResultMsg(data.message);
            if (!data.winner_id) {
                setLastMatchResult('draw');
            } else {
                const win = data.winner_id === currentUserId;
                setLastMatchResult(win ? 'win' : 'lose');
                if (win) {
                    triggerWinBurst();
                }
            }
        });

        return () => {
            socket.off('receive_challenge');
            socket.off('challenge_failed');
            socket.off('match_start');
            socket.off('opponent_progress');
            socket.off('match_end');
            socket.disconnect();
        };
    }, [currentUserId]);

    // Timer cho Match Countdown
    useEffect(() => {
        if (matchPhase === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setMatchPhase('playing');
            }
        }
    }, [matchPhase, countdown]);

    const getOptionsForQuestion = (q: any) => {
        if (!q) return [];
        if (q.content?.options && Array.isArray(q.content.options) && q.content.options.length > 0) {
            let opts = [...q.content.options];
            if (!opts.includes(q.correct_answer)) opts.push(q.correct_answer);
            return opts.sort(() => Math.random() - 0.5).slice(0, 4);
        }
        // Dummy options
        let opts = ["A", "B", "C", "D"];
        const correct = q.correct_answer || "A";
        if (!opts.includes(correct)) opts[0] = String(correct);
        return opts.sort(() => Math.random() - 0.5);
    };

    const handleAnswer = (selectedOpt: string) => {
        if (!matchData) return;
        const q = matchData.questions[currentQuestionIdx];
        const isCorrect = String(selectedOpt) === String(q.correct_answer || "A");
        
        const newScore = {
             points: myScore.points + (isCorrect ? 10 : 0),
             correct: myScore.correct + (isCorrect ? 1 : 0)
        };
        setMyScore(newScore);

        socket.emit('submit_answer', {
            room_id: matchData.roomId,
            user_id: currentUserId,
            is_correct: isCorrect,
            timestamp: Date.now()
        });

        if (currentQuestionIdx + 1 < matchData.questions.length) {
            setCurrentQuestionIdx(prev => prev + 1);
        } else {
            setMatchPhase('waiting');
            socket.emit('match_result', {
                room_id: matchData.roomId,
                user_id: currentUserId,
                total_points: newScore.points,
                timestamp: Date.now()
            });
        }
    };

    const handleInviteBuddy = async (friendId: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetchWithMonitor(`${API_URL}/api/v1/community/buddy/invite`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_id: friendId, daily_target: 3 })
            });
            alert('Đã gửi lời mời đôi bạn cùng tiến thành công!');
            window.location.reload();
        } catch (e: any) {
            alert(e.message || 'Lỗi gửi lời mời!');
        }
    };

    const handleChallengeClick = (friend: Friend) => {
        setWagerModal({ isOpen: true, friend, wager: 50 });
    };

    const handleSendChallenge = () => {
        if (!wagerModal.friend) return;
        socket.emit('send_challenge', { target_user_id: wagerModal.friend.id, user_a_id: currentUserId, wager: wagerModal.wager });
        setWagerModal({ isOpen: false, friend: null, wager: 50 });
        alert(`Đã gửi lời thách đấu cược ${wagerModal.wager} sao!`);
    };

    const handleAcceptChallenge = (challenge: IncomingChallenge) => {
        socket.emit('accept_challenge', { user_a_id: challenge.fromId, user_b_id: currentUserId, wager: challenge.wager });
        setIncoming((prev) => prev.filter((c) => c.fromId !== challenge.fromId));
    };

    const handleDeclineChallenge = (challenge: IncomingChallenge) => {
        setIncoming((prev) => prev.filter((c) => c.fromId !== challenge.fromId));
    };

    const handleSearchFriend = async () => {
        if (!searchId.trim()) return;
        setIsSearching(true);
        setSearchResult(null);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetchWithMonitor<{ data: any[] }>(
                `${API_URL}/api/v1/community/friends/search?query=${searchId.trim()}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (res.data && res.data.length > 0) {
                const foundUser = res.data[0];
                setSearchResult({
                    id: foundUser.id,
                    name: foundUser.username || foundUser.email || 'Người dùng',
                    xp: foundUser.xp || 0,
                    streak: foundUser.streak || 0,
                    online: false
                });
            } else {
                alert('Không tìm thấy người dùng với từ khóa này!');
            }
        } catch (e) {
            alert('Lỗi khi tìm kiếm!');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async (id: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetchWithMonitor(`${API_URL}/api/v1/community/friends/add`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ friend_id: id })
            });
            alert('Đã gửi yêu cầu kết bạn thành công!');
            setSearchResult(null);
            setSearchId('');
        } catch (e: any) {
            alert(e.message || 'Có lỗi xảy ra khi kết bạn!');
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetchWithMonitor(`${API_URL}/api/v1/community/friends/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId })
            });
            setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) {
            alert('Lỗi khi chấp nhận kết bạn!');
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetchWithMonitor(`${API_URL}/api/v1/community/friends/decline`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId })
            });
            setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) {
            alert('Lỗi khi từ chối kết bạn!');
        }
    };

    return (
        <div className="flex flex-col h-full w-full items-stretch bg-white relative">
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

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleInviteBuddy(f.id)}
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                                        title="Mời đôi bạn cùng tiến"
                                    >
                                        <HeartHandshake className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleChallengeClick(f)}
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300 transition-colors"
                                        title="Thách đấu"
                                    >
                                        <Sword className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {friends.length === 0 && (
                            <p className="text-sm text-stone-500 text-center py-4">
                                Bạn chưa có bạn bè nào. Hãy thử tìm kiếm bạn bè nhé!
                            </p>
                        )}
                    </div>

                    {/* Đôi bạn cùng tiến */}
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
                                        {buddyProgress ? `Mục tiêu hôm nay: ${buddyTarget} bài` : "Chưa có mục tiêu chung"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {buddyProgress ? (
                            <div className="space-y-3 mt-2">
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-stone-600 mb-1">
                                        <span>Bạn</span>
                                        <span>{buddyProgress.you}/{buddyTarget} bài</span>
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
                                        <span>{buddyProgress.friend}/{buddyTarget} bài</span>
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
                        ) : (
                            <div className="mt-2 text-xs text-stone-500 text-center italic">
                                Hãy rủ một người bạn cùng hoàn thành bài học mỗi ngày! Tính năng sẽ hoạt động khi bạn mời mục tiêu thành công.
                            </div>
                        )}
                    </div>
                </section>

                <section className="flex flex-col gap-4">
                    {/* Add Friend Input */}
                    <div className="bg-white rounded-3xl p-4 md:p-5 border border-stone-100 shadow-sm">
                        <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide mb-3">Tìm & Thêm bạn mới</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nhập tên đăng nhập hoặc Email..."
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

                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                        <div className="bg-blue-50 rounded-3xl p-4 md:p-5 border border-blue-100">
                            <h3 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-3">Lời mời kết bạn</h3>
                            <div className="space-y-3">
                                {friendRequests.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between bg-white/60 rounded-2xl px-3 py-2.5 border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-500">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-blue-900">{req.profiles?.username || 'Bạn mới'}</p>
                                                <p className="text-[11px] text-blue-800/80 font-semibold">Muốn kết bạn với bạn</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeclineRequest(req.id)}
                                                className="p-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleAcceptRequest(req.id)}
                                                className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                                {incoming.map((c, idx) => (
                                    <div
                                        key={`${c.fromId}-${idx}`}
                                        className="flex items-center justify-between bg-white/60 rounded-2xl px-3 py-2.5 border border-emerald-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-amber-500">
                                                <Sword className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-900">
                                                    {c.fromName}
                                                </p>
                                                <p className="text-[11px] text-emerald-800/80 font-semibold">
                                                    Cược: {c.wager} Sao Vàng
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeclineChallenge(c)}
                                                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                                            >
                                                Từ chối
                                            </button>
                                            <button
                                                onClick={() => handleAcceptChallenge(c)}
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

                    {/* Last result badge */}
                    {lastMatchResult && (
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                                <Trophy className="w-3 h-3" />
                            </div>
                            <span className="font-semibold">
                                Kết quả gần nhất:{" "}
                                <span className={lastMatchResult === 'win' ? 'text-emerald-600' : (lastMatchResult === 'lose' ? 'text-rose-500' : 'text-stone-600')}>
                                    {lastMatchResult === 'win' ? 'Bạn đã thắng!' : (lastMatchResult === 'lose' ? 'Bạn thua, thử lại nhé!' : 'Trận hòa!')}
                                </span>
                            </span>
                        </div>
                    )}
                </section>
            </div>

            {/* Wager Modal */}
            {wagerModal.isOpen && wagerModal.friend && (
                <div className="fixed inset-0 bg-stone-900/60 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-2">
                            <Trophy className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-stone-900">Thách đấu {wagerModal.friend.name}</h3>
                        <p className="text-sm text-stone-500 font-medium">Nhập số sao vàng bạn muốn đặt cược (Tối thiểu 50)</p>
                        
                        <input 
                            type="number" 
                            min="50" 
                            value={wagerModal.wager}
                            onChange={(e) => setWagerModal(prev => ({ ...prev, wager: parseInt(e.target.value) || 0 }))}
                            className="w-full text-center text-2xl font-black text-amber-600 bg-amber-50 border-2 border-amber-200 rounded-2xl py-3 focus:outline-none focus:border-amber-400"
                        />
                        
                        <div className="flex w-full gap-3 mt-2">
                            <button 
                                onClick={() => setWagerModal({ isOpen: false, friend: null, wager: 50 })}
                                className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSendChallenge}
                                disabled={wagerModal.wager < 50}
                                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-black shadow-md hover:bg-amber-600 transition-colors disabled:opacity-50"
                            >
                                Gửi lời mời
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Match Overlay */}
            {matchPhase !== 'idle' && matchData && (
                <div className="fixed inset-0 bg-stone-900/95 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[450px]"
                    >
                        {/* Header Scores */}
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-100">
                            <div className="flex flex-col items-start w-1/3">
                                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Bạn ({currentUserName})</span>
                                <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                    <span className="text-xl font-black text-emerald-600">{myScore.points}</span>
                                    <span className="text-xs font-bold text-emerald-600/60 ml-1">pts</span>
                                </div>
                            </div>
                            <div className="w-1/3 flex flex-col items-center">
                                <div className="bg-stone-100 border border-stone-200 px-4 py-1.5 rounded-full flex items-center gap-2">
                                    <Sword className="w-4 h-4 text-stone-500" />
                                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-600">Thách Đấu 1v1</span>
                                    <Sword className="w-4 h-4 text-stone-500" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end w-1/3">
                                <span className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1">Đối thủ</span>
                                <div className="bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                                    <span className="text-xl font-black text-rose-500">{opponentScore}</span>
                                    <span className="text-xs font-bold text-rose-500/60 ml-1">pts</span>
                                </div>
                            </div>
                        </div>

                        {/* Content based on phase */}
                        {matchPhase === 'countdown' && (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <h3 className="text-2xl font-black text-stone-800 mb-6 uppercase tracking-widest text-stone-400">Chuẩn bị!</h3>
                                <motion.div 
                                    key={countdown}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-8xl font-black text-amber-500 drop-shadow-sm"
                                >
                                    {countdown > 0 ? countdown : 'GO!'}
                                </motion.div>
                            </div>
                        )}

                        {matchPhase === 'playing' && matchData.questions[currentQuestionIdx] && (
                            <div className="flex-1 flex flex-col">
                                <div className="text-center mb-8 bg-stone-50 rounded-2xl p-6 border border-stone-100">
                                    <div className="inline-block bg-white px-3 py-1 rounded-lg border border-stone-200 shadow-sm mb-4 text-[10px] font-black uppercase tracking-widest text-stone-400">
                                        Câu {currentQuestionIdx + 1} / {matchData.questions.length}
                                    </div>
                                    <h4 className="text-xl md:text-2xl font-black text-stone-800">
                                        {matchData.questions[currentQuestionIdx]?.data}
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                                    {getOptionsForQuestion(matchData.questions[currentQuestionIdx]).map((opt, idx) => (
                                        <button
                                            key={`${currentQuestionIdx}-${idx}`}
                                            onClick={() => handleAnswer(opt)}
                                            className="p-4 md:p-5 rounded-2xl border-2 border-stone-100 bg-white font-bold text-stone-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-left shadow-sm hover:shadow"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {matchPhase === 'waiting' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 border-4 border-stone-100 border-t-emerald-500 rounded-full animate-spin mb-6" />
                                <h3 className="text-2xl font-black text-stone-800 mb-2">Đã hoàn thành!</h3>
                                <p className="text-stone-500 font-medium">Đang đợi đối thủ kết thúc bài thi...</p>
                            </div>
                        )}

                        {matchPhase === 'result' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={`w-24 h-24 ${lastMatchResult === 'win' ? 'bg-amber-100 text-amber-500' : 'bg-stone-100 text-stone-500'} rounded-full flex items-center justify-center mb-6`}
                                >
                                    {lastMatchResult === 'win' ? <Trophy className="w-12 h-12" /> : <Sword className="w-12 h-12" />}
                                </motion.div>
                                <h3 className="text-3xl font-black text-stone-900 mb-2">
                                    {lastMatchResult === 'win' ? 'Chiến thắng!' : (lastMatchResult === 'lose' ? 'Thất bại' : 'Hòa nhau')}
                                </h3>
                                <p className="text-stone-600 font-medium mb-8 px-4 py-2 bg-stone-50 rounded-xl border border-stone-100">
                                    {matchResultMsg}
                                </p>
                                <button 
                                    onClick={() => setMatchPhase('idle')}
                                    className="px-10 py-4 bg-stone-900 text-white rounded-xl font-black text-lg shadow-xl hover:bg-stone-800 transition-all active:scale-95"
                                >
                                    Đóng màn hình
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
