import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Loader2, Trophy, User } from 'lucide-react';
import { socket } from '../../lib/socket';
import { triggerWinBurst } from '../../lib/confetti';
import { useUserStore } from '../../store/useUserStore';

type MatchState = 'idle' | 'searching' | 'found' | 'countdown' | 'playing' | 'finished';

export function CommunityRoom() {
    const { user } = useUserStore();
    const currentUserId = user?.id || 'guest';
    const currentUserName = user?.name || 'Khách';
    const isAdvancedLevel = (user?.streak || 0) > 0;

    const [matchState, setMatchState] = useState<MatchState>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(3);
    const [opponentId, setOpponentId] = useState<string>('Opponent_XYZ');

    // In-game states
    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [winner, setWinner] = useState<string | null>(null);
    const TOTAL_QUESTIONS = 5;

    useEffect(() => {
        // 1. Kết nối và Authenticate
        socket.connect();
        socket.emit('authenticate', { user_id: currentUserId });

        // 2. Lắng nghe các event từ Backend
        socket.on('receive_challenge', (data) => {
            setOpponentId(data.from_user);
            setMatchState('found');
        });

        socket.on('match_start', (data) => {
            setRoomId(data.room_id);
            setMatchState('countdown');
            startCountdown();
        });

        socket.on('opponent_progress', (data) => {
            if (data.correct) {
                setOpponentScore(prev => prev + 1);
            }
        });

        socket.on('match_end', (data) => {
            setMatchState('finished');
            setWinner(data.winner_id);
            if (data.winner_id === currentUserId) {
                triggerWinBurst();
            }
        });

        return () => {
            socket.off('receive_challenge');
            socket.off('match_start');
            socket.off('opponent_progress');
            socket.off('match_end');
            socket.disconnect();
        };
    }, [currentUserId]);

    const startCountdown = () => {
        setCountdown(3);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setMatchState('playing');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Actions
    const handleFindMatch = () => {
        setMatchState('searching');
        // Giả lập tìm thấy đối thủ sau 2s
        setTimeout(() => {
            setOpponentId("User_Binh");
            setMatchState('found');
        }, 2000);
    };

    const handleAcceptMatch = () => {
        // Gửi accept_challenge tới Backend (A & B)
        socket.emit('accept_challenge', { user_a_id: currentUserId, user_b_id: opponentId });
    };

    const handleMockSubmitAnswer = (isCorrect: boolean) => {
        if (matchState !== 'playing' || !roomId) return;

        if (isCorrect) {
            const newScore = myScore + 1;
            setMyScore(newScore);
            socket.emit('submit_answer', { room_id: roomId, user_id: currentUserId, is_correct: true, timestamp: Date.now() });

            if (newScore >= TOTAL_QUESTIONS) {
                // Send finish to backend
                socket.emit('match_result', { room_id: roomId, user_id: currentUserId, total_points: newScore, timestamp: Date.now() });
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-sm mx-auto items-center relative bg-white">

            <div className="pb-6 pt-2 border-b border-stone-100 flex items-center justify-between mb-6 w-full">
                <div>
                    <h2 className="font-bold text-stone-900 text-2xl tracking-tight">Khu Mạng Lưới</h2>
                    <p className="text-stone-500 text-sm font-medium">Học cùng dân làng</p>
                </div>
            </div>

            {/* Màn hình Chờ */}
            {matchState === 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-6">
                    {/* Blue Server Goal Card */}
                    <div className="bg-stone-900 text-white rounded-[2rem] p-6 shadow-xl shadow-stone-900/10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-[17px] font-bold">Mục tiêu chung</h2>
                            <span className="text-sm font-black text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full">1000 Từ</span>
                        </div>
                        <div className="relative h-4 bg-white/10 rounded-full overflow-hidden shrink-0 mt-6 mb-2">
                            <motion.div initial={{ width: 0 }} animate={{ width: "75%" }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute top-0 bottom-0 left-0 bg-orange-500 rounded-full" />
                        </div>
                        <div className="flex justify-between font-mono text-[12px] text-white/50 font-bold">
                            <span>0</span>
                            <span>750/1000</span>
                        </div>
                    </div>

                    {/* Battle CTA */}
                    <button
                        onClick={handleFindMatch}
                        className="w-full relative overflow-hidden group bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-[2rem] p-6 flex flex-col items-center gap-4 transition-colors"
                    >
                        <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                            <Sword className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-orange-900">Thách đấu 1v1</h3>
                            <p className="text-sm text-orange-600/70 font-medium mt-1">Tìm đối thủ cùng trình độ</p>
                        </div>
                    </button>

                    {/* Friends Avatars */}
                    <div className="flex justify-center gap-4 mt-2">
                        {['An', 'Bình', 'Chi', 'Dũng'].map((name) => (
                            <div key={name} className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-stone-100 rounded-full relative shadow-sm border-2 border-white flex items-center justify-center text-stone-400">
                                    <User className="w-5 h-5" />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></div>
                                </div>
                                <span className="text-[11px] font-bold text-stone-500">{name}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Màn hình Tìm đối thủ & Start */}
            <AnimatePresence>
                {matchState === 'searching' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-64 text-center">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-stone-900">Đang dò tìm...</h3>
                        <p className="text-stone-500 mt-2">Tìm kiếm đối thủ Level {isAdvancedLevel ? "A1" : "A2"}</p>
                    </motion.div>
                )}

                {matchState === 'found' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="flex flex-col items-center w-full mt-10">
                        <h3 className="text-2xl font-black text-stone-900 mb-8">Đối thủ xuất hiện!</h3>
                        <div className="flex items-center gap-6 mb-12">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-stone-100 border-4 border-stone-900 rounded-full mb-3 flex items-center justify-center text-stone-400"><User className="w-8 h-8" /></div>
                                <span className="font-bold text-stone-900">{currentUserName}</span>
                            </div>
                            <div className="text-orange-500 font-black text-3xl italic">VS</div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-orange-100 border-4 border-orange-500 rounded-full mb-3 flex items-center justify-center text-orange-500"><User className="w-8 h-8" /></div>
                                <span className="font-bold text-orange-700">{opponentId}</span>
                            </div>
                        </div>
                        <button onClick={handleAcceptMatch} className="w-full bg-stone-900 hover:bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all">
                            Chấp nhận thách đấu
                        </button>
                    </motion.div>
                )}

                {matchState === 'countdown' && (
                    <motion.div initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-64 items-center justify-center">
                        <span className="text-[8rem] font-black text-orange-500">{countdown}</span>
                    </motion.div>
                )}

                {/* Màn hình Chơi (Tiến trình đồng bộ Real-time) */}
                {matchState === 'playing' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-8 mt-4">
                        <div className="flex flex-col gap-6 p-6 bg-stone-50 rounded-[2rem] border border-stone-200">
                            {/* My Progress */}
                            <div>
                                <div className="flex justify-between font-bold text-sm mb-2 text-stone-900">
                                    <span>{currentUserName} (Bạn)</span>
                                    <span>{myScore} / {TOTAL_QUESTIONS}</span>
                                </div>
                                <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-emerald-500" animate={{ width: `${(myScore / TOTAL_QUESTIONS) * 100}%` }} transition={{ type: "spring" }} />
                                </div>
                            </div>
                            {/* Opponent Progress */}
                            <div>
                                <div className="flex justify-between font-bold text-sm mb-2 text-orange-700">
                                    <span>{opponentId}</span>
                                    <span>{opponentScore} / {TOTAL_QUESTIONS}</span>
                                </div>
                                <div className="h-4 bg-orange-100 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-orange-500" animate={{ width: `${(opponentScore / TOTAL_QUESTIONS) * 100}%` }} transition={{ type: "spring" }} />
                                </div>
                            </div>
                        </div>

                        {/* MOCK GAMEPLAY */}
                        <div className="bg-white p-6 border-2 border-stone-100 rounded-[2rem] shadow-sm text-center">
                            <p className="font-bold text-lg mb-6">Câu hỏi #{myScore + 1}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleMockSubmitAnswer(true)} className="bg-stone-100 py-4 rounded-xl font-bold hover:bg-stone-200">Đúng</button>
                                <button onClick={() => handleMockSubmitAnswer(false)} className="bg-stone-100 py-4 rounded-xl font-bold hover:bg-stone-200">Sai</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Màn hình Kết Quả */}
                {matchState === 'finished' && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center mt-12 w-full text-center">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-6">
                            <Trophy className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-black text-stone-900 mb-2">
                            {winner === currentUserId ? "CHIẾN THẮNG!" : "THẤT BẠI!"}
                        </h2>
                        <p className="text-stone-500 font-medium mb-8">
                            {winner === currentUserId ? "+50 Sao Vàng" : "Chúc bạn may mắn lần sau"}
                        </p>
                        <button onClick={() => setMatchState('idle')} className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold text-lg">
                            Trở về Phòng Cộng đồng
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
