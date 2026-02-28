import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { trackEvent } from '../../lib/monitor';

// --- MOCK DATA CÂU HỎI ---
type QuestionType = 'quiz' | 'translate';

interface Question {
    id: string;
    type: QuestionType;
    prompt: string;
    options?: string[];
    correctAnswer: string;
    hint?: string;
}

const MOCK_QUESTIONS: Question[] = [
    {
        id: 'q1',
        type: 'quiz',
        prompt: 'Từ "Xin chào" trong tiếng Ba Na là gì?',
        options: ['Ê pẹ', 'Ngay', 'Jơ', 'KơRai'],
        correctAnswer: 'Ê pẹ',
        hint: 'Nó bắt đầu bằng chữ Ê.'
    },
    {
        id: 'q2',
        type: 'translate',
        prompt: 'Dịch câu sau: "Cảm ơn bạn"',
        correctAnswer: 'Nao',
        hint: 'Từ này có 3 chữ cái, bắt đầu bằng N.'
    }
];

export function LessonInteractive() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');

    const question = MOCK_QUESTIONS[currentIdx];
    const total = MOCK_QUESTIONS.length;
    const progress = (currentIdx / total) * 100;

    const handleCheck = () => {
        if (!selectedAnswer) return;

        setStatus('checking');

        // Giả lập độ trễ mạng
        setTimeout(() => {
            if (selectedAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase()) {
                setStatus('correct');
            } else {
                setStatus('wrong');
                trackEvent('lesson_mistake', { questionId: question.id, answer: selectedAnswer });
            }
        }, 300);
    };

    const handleNext = () => {
        if (currentIdx < total - 1) {
            setCurrentIdx(currentIdx + 1);
            setSelectedAnswer('');
            setStatus('idle');
        } else {
            // Hoàn thành -> Navigate to Rewards screen
            navigate(`/lesson/${id}/rewards`);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col relative font-nunito">

            {/* Header: Close Button & Progress Bar */}
            <div className="pt-6 px-6 pb-2 flex items-center gap-4 z-10 bg-white sticky top-0">
                <button
                    onClick={() => navigate('/')}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                    <X className="w-7 h-7" strokeWidth={2.5} />
                </button>
                <div className="flex-1 h-3.5 bg-stone-100 rounded-full overflow-hidden relative">
                    <motion.div
                        className="absolute top-0 bottom-0 left-0 bg-[#58cc02] rounded-full"
                        initial={{ width: `${progress}%` }}
                        animate={{ width: `${((currentIdx + (status === 'correct' ? 1 : 0)) / total) * 100}%` }}
                        transition={{ ease: "easeInOut", duration: 0.5 }}
                    >
                        {/* Highlight overlay in progress bar */}
                        <div className="absolute top-1 left-2 right-2 h-1 bg-white/20 rounded-full"></div>
                    </motion.div>
                </div>
            </div>

            {/* In-Lesson Workspace */}
            <div className="flex-1 px-6 pt-8 pb-32 flex flex-col max-w-lg mx-auto w-full">

                <h1 className="text-2xl font-black text-stone-800 mb-8">
                    {question.prompt}
                </h1>

                {/* Question Type: Quiz */}
                {question.type === 'quiz' && (
                    <div className="flex flex-col gap-3">
                        {question.options?.map((opt) => {
                            const isSelected = selectedAnswer === opt;
                            const isWrongAttempt = isSelected && status === 'wrong';
                            const isCorrectAttempt = isSelected && status === 'correct';

                            return (
                                <button
                                    key={opt}
                                    disabled={status === 'correct'}
                                    onClick={() => {
                                        setStatus('idle');
                                        setSelectedAnswer(opt);
                                    }}
                                    className={`w-full p-4 rounded-2xl border-2 text-left font-bold text-lg transition-all
                                        ${isSelected ? 'border-sky-400 bg-sky-50 text-sky-500' : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50'}
                                        ${isWrongAttempt ? '!border-red-400 !bg-red-50 !text-red-500 animate-shake' : ''}
                                        ${isCorrectAttempt ? '!border-[#58cc02] !bg-green-50 !text-[#58cc02]' : ''}
                                        ${status === 'correct' && !isSelected ? 'opacity-50' : ''}
                                    `}
                                    style={{
                                        borderBottomWidth: isSelected || isCorrectAttempt || isWrongAttempt ? '2px' : '4px',
                                        transform: isSelected || isCorrectAttempt || isWrongAttempt ? 'translateY(2px)' : 'none'
                                    }}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Question Type: Translate */}
                {question.type === 'translate' && (
                    <div className="flex flex-col gap-3">
                        <textarea
                            value={selectedAnswer}
                            onChange={(e) => {
                                setStatus('idle');
                                setSelectedAnswer(e.target.value);
                            }}
                            disabled={status === 'correct'}
                            placeholder="Nhấp vào đây để viết..."
                            className={`w-full p-4 rounded-2xl border-2 font-bold text-lg min-h-[120px] resize-none outline-none transition-all
                                ${status === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' : 'border-stone-200 bg-stone-50 text-stone-800 focus:border-sky-400 focus:bg-white'}
                                ${status === 'correct' ? '!border-[#58cc02] bg-green-50 text-[#58cc02]' : ''}
                            `}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Floating Action Bar & Feedback */}
            <div className="fixed bottom-0 left-0 right-0 z-20">

                {/* Feedback Panel */}
                <AnimatePresence>
                    {status === 'wrong' && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-[#ffdfe0] px-6 pt-6 pb-24 absolute bottom-0 left-0 right-0 rounded-t-3xl -z-10"
                        >
                            <div className="max-w-lg mx-auto flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#ff4b4b] shrink-0">
                                    <XCircle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-[#ea2b2b] font-black text-xl mb-1">Chưa đúng rồi!</h3>
                                    <p className="text-[#ea2b2b] font-bold opacity-80">Gợi ý: {question.hint}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {status === 'correct' && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-[#d7ffb8] px-6 pt-6 pb-24 absolute bottom-0 left-0 right-0 rounded-t-3xl -z-10"
                        >
                            <div className="max-w-lg mx-auto flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#58cc02] shrink-0">
                                    <CheckCircle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-[#58cc02] font-black text-xl mb-1">Tuyệt vời!</h3>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Button Container */}
                <div className="bg-transparent px-6 pb-6 pt-4 max-w-lg mx-auto w-full border-t-transparent flex justify-center">
                    {status === 'idle' || status === 'checking' ? (
                        <button
                            disabled={!selectedAnswer || status === 'checking'}
                            onClick={handleCheck}
                            className={`w-full py-4 rounded-2xl font-black text-lg transition-all
                                ${!selectedAnswer
                                    ? 'bg-stone-200 text-stone-400 border-b-0 cursor-not-allowed'
                                    : 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-4 border-[#46a302] active:border-b-0 active:translate-y-1'
                                }
                            `}
                        >
                            KIỂM TRA
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className={`w-full py-4 rounded-2xl font-black text-lg transition-all border-b-4 active:border-b-0 active:translate-y-1
                                ${status === 'wrong'
                                    ? 'bg-[#ff4b4b] hover:bg-[#ea2b2b] border-[#ea2b2b] text-white'
                                    : 'bg-[#58cc02] hover:bg-[#46a302] border-[#46a302] text-white'
                                }
                            `}
                        >
                            {status === 'wrong' ? 'TIẾP TỤC' : 'TIẾP THEO'}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
}
