import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { trackEvent, fetchWithMonitor } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { triggerConfetti } from '../../lib/confetti';

const QUESTIONS = [
    {
        id: 'q1',
        text: 'Bạn đã từng học tiếng Ba Na chưa?',
        options: [
            { id: 'a', text: 'Chưa từng học, mình là người mới tinh 🐣', points: 0 },
            { id: 'b', text: 'Biết một vài từ cơ bản 🐥', points: 1 },
            { id: 'c', text: 'Có thể giao tiếp cơ bản 🦅', points: 2 }
        ]
    },
    {
        id: 'q2',
        text: 'Từ "Nhươ" trong tiếng Ba Na nghĩa là gì?',
        options: [
            { id: 'a', text: 'Nhà', points: 2 },
            { id: 'b', text: 'Nước', points: 0 },
            { id: 'c', text: 'Không biết', points: 0 }
        ]
    },
    {
        id: 'q3',
        text: 'Mục tiêu học tiếng Ba Na của bạn là gì?',
        options: [
            { id: 'a', text: 'Giao tiếp hằng ngày', points: 0 },
            { id: 'b', text: 'Thi chứng chỉ / Công việc', points: 0 },
            { id: 'c', text: 'Sở thích cá nhân', points: 0 }
        ]
    }
];

export function SurveyScreen() {
    const navigate = useNavigate();
    const { updateUser, token } = useUserStore();

    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const handleSelect = (optionId: string, points: number) => {
        setSelectedOption(optionId);
        // Tự động chuyển câu sau 600ms tạo cảm giác mượt mà
        setTimeout(() => {
            const nextScore = score + points;

            if (currentStep < QUESTIONS.length - 1) {
                setScore(nextScore);
                setCurrentStep(prev => prev + 1);
                setSelectedOption(null);
            } else {
                finishSurvey(nextScore);
            }
        }, 600);
    };

    const finishSurvey = async (finalScore: number) => {
        setIsCalculating(true);
        setSelectedOption(null);

        // Tính toán Level (Rule-based)
        // 0-1 điểm: A1, 2-3 điểm: A2, >=4 điểm: B
        const calLevel = finalScore <= 1 ? 'A1' : finalScore <= 3 ? 'A2' : 'B';

        trackEvent('survey_completed', { score: finalScore, assigned_level: calLevel });

        try {
            // Push kết quả khảo sát cho Backend lưu DB user.
            await fetchWithMonitor(
                'http://localhost:8000/api/v1/user/survey',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        purpose: "Học ngoại ngữ",
                        platform_experience: "Lần đầu sử dụng",
                        time_commitment: 15,
                        calculatedLevel: calLevel,
                        score: finalScore
                    })
                },
                'survey_submit',
                5000
            );
        } catch (err) {
            console.error("Lỗi khi update Level lên server", err);
            // Fallback (cho phép đi tiếp nếu đứt mạng)
        }

        // Giả lập loading ảo tạo cảm giác AI đang phân tích
        setTimeout(() => {
            updateUser({ level: calLevel });
            setIsCalculating(false);
            setCurrentStep(QUESTIONS.length); // Chuyển sang màn Result
            triggerConfetti();
        }, 1500);
    };

    const handleComplete = () => {
        navigate('/');
    };

    const handleSkip = () => {
        trackEvent('survey_skipped');
        updateUser({ level: 'A1' }); // Đảm bảo local state không bị rỗng
        navigate('/');
    };

    // Render Kết quả
    if (currentStep === QUESTIONS.length && !isCalculating) {
        const userLevel = useUserStore.getState().user?.level || 'A1';
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100 max-w-sm w-full relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-500 rounded-b-[50%] -z-0"></div>

                    <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg relative z-10 mb-6 mt-4">
                        <span className="text-5xl">🎯</span>
                    </div>

                    <h2 className="text-2xl font-black text-stone-900 mb-2">Lộ trình của bạn!</h2>
                    <p className="text-stone-500 font-medium mb-6">Dựa trên kết quả, KơRai đã xếp bạn vào lớp:</p>

                    <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-700 py-4 rounded-2xl mb-8">
                        <span className="text-4xl font-black">{userLevel}</span>
                    </div>

                    <button
                        onClick={handleComplete}
                        className="w-full bg-stone-900 text-white font-bold py-4 rounded-[1.5rem] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all"
                    >
                        Bắt đầu học ngay
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        );
    }

    // Render Quizz
    const question = QUESTIONS[currentStep];

    return (
        <div className="min-h-screen bg-white flex flex-col p-6 max-w-md mx-auto relative">
            {/* Header: Skip Button */}
            {!isCalculating && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSkip}
                        className="text-stone-400 font-bold text-[15px] hover:text-stone-600 transition-colors"
                    >
                        Bỏ qua
                    </button>
                </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-2 bg-stone-100 rounded-full mt-4 mb-8 overflow-hidden">
                <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: `${(currentStep / QUESTIONS.length) * 100}%` }}
                    animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>

            {isCalculating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-16 h-16 border-4 border-stone-100 border-t-emerald-500 rounded-full mb-6"
                    />
                    <h2 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight">Đang phân tích...</h2>
                    <p className="text-stone-500 font-medium">KơRai đang thiết kế lộ trình phù hợp nhất cho bạn</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1"
                        >
                            <h2 className="text-3xl font-black text-stone-900 leading-tight tracking-tight mb-8">
                                {question.text}
                            </h2>

                            <div className="space-y-4">
                                {question.options.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelect(opt.id, opt.points)}
                                        className={`w-full p-5 rounded-[1.5rem] border-2 text-left font-bold text-[16px] transition-all flex items-center justify-between ${selectedOption === opt.id
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                                            }`}
                                    >
                                        {opt.text}
                                        {selectedOption === opt.id && (
                                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
