import { motion } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Star, CheckCircle, Loader2, XCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useUserStore } from '../../store/useUserStore';
import { useEffect, useState, useRef } from 'react';
import { trackEvent, fetchWithMonitor } from '../../lib/monitor';

export function RewardsScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { width, height } = useWindowSize();
    const { user, token, updateUser } = useUserStore();
    
    const { percentage = 100, correctCount = 10, totalQuestions = 10 } = location.state || {};
    const isPassed = percentage >= 80;
    const earnedSao = isPassed ? 50 : 0;

    const [rewardGained] = useState(earnedSao); 
    const [finished, setFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(true);
    const submittedRef = useRef(false);

    useEffect(() => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        const submitProgress = async () => {
            try {
                if (!isPassed) {
                   setIsSubmitting(false);
                   return;
                }
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
                            totalQuestions: totalQuestions
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
            {!finished && isPassed && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} gravity={0.15} />}

            <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="z-10 bg-white p-8 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.08)] border border-stone-100 max-w-sm w-full relative"
            >
                {/* Ribbon top */}
                <div className={`absolute top-0 left-0 right-0 h-32 rounded-t-[2.5rem] rounded-b-[50%] -z-10 shadow-inner overflow-hidden ${isPassed ? 'bg-[#facc15]' : 'bg-[#e5e5e5]'}`}>
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 transform -translate-y-10"></div>
                </div>

                <div className="w-28 h-28 bg-white rounded-full mx-auto flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.1)] border-8 border-white relative z-10 mb-6 mt-4">
                    {isPassed ? (
                        <CheckCircle className="w-16 h-16 text-[#58cc02]" strokeWidth={2.5} />
                    ) : (
                        <XCircle className="w-16 h-16 text-[#ff4b4b]" strokeWidth={2.5} />
                    )}
                </div>

                <h1 className="text-3xl font-black text-stone-800 mb-2 mt-2">{isPassed ? 'Tuyệt vời!' : 'Thử lại nhé!'}</h1>
                <p className="text-stone-500 font-bold mb-8 text-lg">
                    {isPassed ? 'Bạn đã hoàn thành xuất sắc bài học.' : `Bạn cần đạt trên 80% để qua bài (hiện tại: ${percentage.toFixed(0)}%).`}
                </p>

                {/* Score Board */}
                <div className="flex justify-center gap-4 mb-10">
                    <div className="bg-[#fff9e5] border-2 border-[#facc15]/50 px-6 py-4 rounded-[1.5rem] flex flex-col items-center w-full shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
                        <span className="text-[#d89700] font-black text-xs mb-1 tracking-wider relative z-10">KIẾM ĐƯỢC</span>
                        <div className="flex items-center gap-2 relative z-10">
                            <Star className={`w-8 h-8 drop-shadow-sm ${isPassed ? 'text-[#facc15] fill-[#facc15] animate-bounce' : 'text-stone-300 fill-stone-300'}`} style={{ animationDuration: '2s' }} />
                            <span className={`text-3xl font-black ${isPassed ? 'text-[#d89700]' : 'text-stone-400'}`}>+{rewardGained} Vàng</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => isPassed ? navigate('/') : navigate(`/lesson/${id}`)}
                    className={`w-full text-white font-black text-xl py-5 rounded-[1.5rem] transition-all border-b-[6px] active:border-b-0 active:translate-y-[6px] uppercase tracking-wide
                        ${isPassed 
                            ? 'bg-[#58cc02] hover:bg-[#46a302] border-[#46a302] shadow-lg shadow-[#58cc02]/30' 
                            : 'bg-sky-500 hover:bg-sky-600 border-sky-600 shadow-lg shadow-sky-500/30'}
                    `}
                >
                    {isPassed ? 'Trở về Bản Đồ' : 'Làm lại bài học'}
                </button>
            </motion.div>
        </div>
    );
}
