import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useUserStore } from '../../store/useUserStore';
import { useEffect, useState, useRef } from 'react';
import { trackEvent, fetchWithMonitor } from '../../lib/monitor';

export function RewardsScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { width, height } = useWindowSize();
    const { user, token, updateUser } = useUserStore();
    const [rewardGained, setRewardGained] = useState(0); 
    const [finished, setFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(true);
    const submittedRef = useRef(false);

    useEffect(() => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        const submitProgress = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                
                // Mặc định cho người dùng ~10 câu đúng, kiếm 20 sao
                const correctCount = 10; 
                const earnedSao = correctCount * 2;
                setRewardGained(earnedSao);

                await fetchWithMonitor(
                    `${API_URL}/api/v1/lessons/submit`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            lessonId: id || 'cd1_l1',
                            questionId: 'completion',
                            userAnswer: 'done',
                            correctCount: correctCount,
                            totalQuestions: correctCount
                        })
                    },
                    undefined,
                    15000
                );

                trackEvent('lesson_completed', { lessonId: id, stars: earnedSao });
                
                // Cập nhật điểm sao và XP ngay trên giao diện nội bộ
                updateUser({
                    sao_vang: (user?.sao_vang || 0) + earnedSao,
                    xp: (user?.xp || 0) + earnedSao * 2
                });
            } catch (err) {
                console.error("[RewardsScreen] Error saving progress", err);
            } finally {
                setIsSubmitting(false);
                
                // Ngừng bắn pháo sau 5s
                setTimeout(() => {
                    setFinished(true);
                }, 5000);
            }
        };

        submitProgress();
    }, [id, token, updateUser, user]);

    if (isSubmitting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-[#facc15] animate-spin mb-4" />
                <p className="text-stone-500 font-bold text-lg">Đang lưu tiến trình của bạn...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-nunito">
            {!finished && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} gravity={0.15} />}

            <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="z-10 bg-white p-8 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-stone-100 max-w-sm w-full relative"
            >
                {/* Ribbon top */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-[#facc15] rounded-t-[2.5rem] rounded-b-[50%] -z-10 shadow-inner overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 transform -translate-y-10"></div>
                </div>

                <div className="w-28 h-28 bg-white rounded-full mx-auto flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.1)] border-8 border-white relative z-10 mb-6 mt-4">
                    <CheckCircle className="w-16 h-16 text-[#58cc02]" strokeWidth={2.5} />
                </div>

                <h1 className="text-3xl font-black text-stone-800 mb-2 mt-2">Tuyệt vời!</h1>
                <p className="text-stone-500 font-bold mb-8 text-lg">Bạn đã hoàn thành xuất sắc bài học.</p>

                {/* Score Board */}
                <div className="flex justify-center gap-4 mb-10">
                    <div className="bg-[#fff9e5] border-2 border-[#facc15]/50 px-6 py-4 rounded-[1.5rem] flex flex-col items-center w-full shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
                        <span className="text-[#d89700] font-black text-xs mb-1 tracking-wider relative z-10">KIẾM ĐƯỢC</span>
                        <div className="flex items-center gap-2 relative z-10">
                            <Star className="w-8 h-8 text-[#facc15] fill-[#facc15] drop-shadow-sm animate-bounce" style={{ animationDuration: '2s' }} />
                            <span className="text-3xl font-black text-[#d89700]">+{rewardGained}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-[#58cc02] hover:bg-[#46a302] text-white font-black text-xl py-5 rounded-[1.5rem] transition-all border-b-[6px] border-[#46a302] active:border-b-0 active:translate-y-[6px] shadow-lg shadow-[#58cc02]/30 uppercase tracking-wide"
                >
                    Trở về Bản Đồ
                </button>
            </motion.div>
        </div>
    );
}
