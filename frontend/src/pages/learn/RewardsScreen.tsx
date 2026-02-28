import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use'; // Optional: Cần thiết cho Confetti, hoặc có thể custom sau
import { useUserStore } from '../../store/useUserStore';
import { useEffect, useState } from 'react';
import { trackEvent } from '../../lib/monitor';

export function RewardsScreen() {
    const navigate = useNavigate();
    const { width, height } = useWindowSize();
    const { user, updateUser } = useUserStore();
    const [rewardGained] = useState(15); // Logic tính star mock
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        // Cập nhật state sau khi xong bài (Mocking API call)
        trackEvent('lesson_completed', { stars: rewardGained });
        updateUser({
            sao_vang: (user?.sao_vang || 0) + rewardGained,
            // (Thêm lesson.id vào completed lessons trong thực tế)
        });

        const t = setTimeout(() => {
            setFinished(true); // Ngừng bắn pháo sau 5s
        }, 5000);
        return () => clearTimeout(t);
    }, [rewardGained, updateUser, user?.sao_vang]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-nunito">
            {!finished && <Confetti width={width} height={height} recycle={false} numberOfPieces={200} />}

            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.6 }}
                className="z-10 bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-stone-100 max-w-sm w-full relative"
            >
                <div className="absolute top-0 left-0 right-0 h-32 bg-[#facc15] rounded-b-[50%] -z-0"></div>

                <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg border-4 border-white relative z-10 mb-6 mt-4">
                    <CheckCircle className="w-12 h-12 text-[#58cc02]" strokeWidth={3} />
                </div>

                <h1 className="text-2xl font-black text-stone-800 mb-2">Chúc mừng!</h1>
                <p className="text-stone-500 font-bold mb-6">Bạn đã hoàn thành bài học hôm nay.</p>

                {/* Score Board */}
                <div className="flex justify-center gap-4 mb-8">
                    <div className="bg-[#fff9e5] border-2 border-[#facc15] px-6 py-4 rounded-2xl flex flex-col items-center flex-1">
                        <span className="text-stone-500 font-bold text-sm mb-1">KIẾM ĐƯỢC</span>
                        <div className="flex items-center gap-2">
                            <Star className="w-6 h-6 text-[#facc15] fill-[#facc15]" />
                            <span className="text-xl font-black text-[#ca8a04]">+{rewardGained}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-[#58cc02] hover:bg-[#46a302] text-white font-black text-lg py-4 rounded-2xl transition-all border-b-4 border-[#46a302] active:border-b-0 active:translate-y-1"
                >
                    TIẾP TỤC
                </button>
            </motion.div>
        </div>
    );
}
