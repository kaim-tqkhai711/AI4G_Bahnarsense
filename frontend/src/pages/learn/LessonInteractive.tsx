import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Loader2, Volume2 } from 'lucide-react';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';

// --- MAPPED DATA CÂU HỎI TỪ BACKEND ---
type QuestionType = 'quiz' | 'translate' | 'flashcard';

interface Question {
    id: string;
    type: QuestionType;
    prompt: string;
    options?: string[];
    correctAnswer: string;
    hint?: string;
    flashcardData?: {
        word: string;
        meaning: string;
        audio_api?: string;
        image_url?: string;
        example_viet?: string;
        example_bahnar?: string;
    };
}

export function LessonInteractive() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'correct' | 'wrong'>('idle');
    const [wrongCount, setWrongCount] = useState(0);
    const [hasAttemptedCurrent, setHasAttemptedCurrent] = useState(false);

    useEffect(() => {
        const loadLesson = async () => {
            setIsLoading(true);
            try {
                const token = useUserStore.getState().token;
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                if (!token) return;

                const response = await fetchWithMonitor<{ success: boolean; data: any[] } | any[]>(
                    `${API_URL}/api/v1/lessons/${id}/steps`,
                    { headers: { Authorization: `Bearer ${token}` } },
                    'lesson_steps_interactive'
                );

                const list = Array.isArray(response) ? response : (response?.data ?? []);
                
                // Lọc bỏ intro_screen, giữ lại các phần nội dung và test
                const exercises = list.filter((s: any) => s.type !== 'intro_screen');
                
                // Map sơ bộ các type từ CSV về giao diện Quiz & Translate có sẵn
                const mappedQuestions: Question[] = exercises.map((s: any) => {
                    const raw = typeof s.content === 'string' ? JSON.parse(s.content) : s.content || {};
                    const isTranslating = s.type === 'quiz_text_input' || s.type === 'quiz_arrange';
                    
                    // Xử lý options: Dữ liệu CSV có options dạng {"A": "Từ 1", "B": "Từ 2"}
                    let opts: string[] = [];
                    if (raw.options && typeof raw.options === 'object') {
                        opts = Object.values(raw.options);
                    } else if (raw.words) {
                        opts = raw.words;
                    }

                    // Map đáp án (Từ chữ A,B,C,D lấy ra text thực sự, hoặc lấy correct_answer)
                    let textCorrectAnswer = s.correct_answer || '';
                    let type: QuestionType = isTranslating ? 'translate' : 'quiz';
                    if (s.type === 'learn_flashcard') {
                        type = 'flashcard';
                        textCorrectAnswer = 'SKIP';
                    }

                    return {
                        id: s.lesson_id || Math.random().toString(),
                        type,
                        prompt: raw.question || 'Học từ vựng mới',
                        options: opts.length > 0 ? opts : ['Đã hiểu', 'Nghe lại'], // Fallback options cho learn_flashcard
                        correctAnswer: textCorrectAnswer,
                        hint: raw.hint || raw.meaning || 'Hãy thử lại nhé!',
                        flashcardData: type === 'flashcard' ? {
                            word: raw.word || raw.content || '',
                            meaning: raw.meaning || '',
                            audio_api: raw.audio_api,
                            image_url: raw.image_url,
                            example_viet: raw.example_viet,
                            example_bahnar: raw.example_bahnar
                        } : undefined
                    };
                });

                if (mappedQuestions.length === 0) {
                    // Fallback
                    mappedQuestions.push({
                        id: 'fallback1', type: 'quiz', prompt: 'Không có câu hỏi nào. Nhấn Hoàn thành.', options: ['Hoàn thành'], correctAnswer: 'Hoàn thành'
                    });
                }
                setQuestions(mappedQuestions);
            } catch (err) {
                console.warn("[LessonInteractive] API Error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) loadLesson();
    }, [id]);

    const question = questions[currentIdx];
    const total = questions.length;
    const progress = total ? (currentIdx / total) * 100 : 0;

    const handleCheck = () => {
        if (!selectedAnswer) return;

        // Nếu là learn_flashcard (correct='SKIP')
        if (question?.correctAnswer === 'SKIP' || selectedAnswer === 'Đã hiểu' || selectedAnswer === 'Hoàn thành') {
            setStatus('correct');
            return;
        }

        setStatus('checking');

        setTimeout(() => {
            const isCorrect = selectedAnswer.trim().toLowerCase() === question?.correctAnswer?.toString().trim().toLowerCase();
            
            if (!hasAttemptedCurrent) {
                setHasAttemptedCurrent(true);
                if (!isCorrect) {
                    setWrongCount(prev => prev + 1);
                }
            }

            if (isCorrect) {
                setStatus('correct');
            } else {
                setStatus('wrong');
                trackEvent('lesson_mistake', { questionId: question?.id, answer: selectedAnswer });
                
                // Đồng bộ lưu lỗi sai lên Spaced Repetition Backend
                const token = useUserStore.getState().token;
                if (token && question?.id) {
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    fetchWithMonitor(`${API_URL}/api/v1/review/log_error`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                            source: question.type === 'quiz' ? 'vocabulary' : 'grammar',
                            item_id: question.id,
                            user_answer: selectedAnswer
                        })
                    }, undefined, 10000).catch(err => console.warn('Failed to log review error:', err));
                }
            }
        }, 300);
    };

    const handleNext = () => {
        setHasAttemptedCurrent(false);
        if (currentIdx < total - 1) {
            setCurrentIdx(currentIdx + 1);
            setSelectedAnswer('');
            setStatus('idle');
        } else {
            const correctCount = total - wrongCount;
            const percentage = total > 0 ? (correctCount / total) * 100 : 100;
            navigate(`/lesson/${id}/rewards`, { state: { percentage, correctCount, totalQuestions: total } });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-stone-500 font-bold">Đang nạp bài tập...</p>
            </div>
        );
    }

    if (!question) return null;

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
            <div className="flex-1 px-6 pt-8 pb-10 flex flex-col max-w-lg mx-auto w-full">

                {question.type !== 'flashcard' && (
                    <h1 className="text-2xl font-black text-stone-800 mb-8">
                        {question.prompt}
                    </h1>
                )}

                {/* Question Type: Flashcard */}
                {question.type === 'flashcard' && question.flashcardData && (
                    <div className="flex flex-col gap-6 items-center w-full">
                        <div className="w-full bg-white border-2 border-stone-200 rounded-[2rem] p-6 flex flex-col items-center shadow-sm text-center relative overflow-hidden">
                            {question.flashcardData.image_url && (
                                <div className="w-full h-40 mb-4 rounded-xl overflow-hidden bg-stone-50 flex items-center justify-center">
                                    <img src={question.flashcardData.image_url} alt="Vocabulary" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                </div>
                            )}
                            <h2 className="text-3xl font-black text-stone-800 mb-2">{question.flashcardData.word}</h2>
                            <p className="text-xl font-bold text-stone-500 mb-4">{question.flashcardData.meaning}</p>
                            
                            {(question.flashcardData.example_bahnar || question.flashcardData.example_viet) && (
                                <div className="w-full bg-stone-50 rounded-2xl p-4 mt-2">
                                    <p className="text-lg font-bold text-stone-700 italic border-l-4 border-orange-400 pl-3 text-left">"{question.flashcardData.example_bahnar}"</p>
                                    <p className="text-stone-500 font-medium text-left pl-4 mt-1">{question.flashcardData.example_viet}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 w-full mt-4">
                            {question.options?.map((opt) => {
                                const isSelected = selectedAnswer === opt;
                                const isPlayAudio = opt.toLowerCase().includes('nghe lại') || opt.toLowerCase().includes('nghe');
                                if (isPlayAudio && question.flashcardData?.audio_api) {
                                  return (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                                            const audio = new Audio(`${API_URL}${question.flashcardData!.audio_api}`);
                                            audio.play().catch(e => console.error("Audio play error", e));
                                        }}
                                        className="w-full p-4 rounded-2xl border-2 border-sky-200 text-sky-500 font-bold text-lg bg-sky-50 hover:bg-sky-100 transition-all active:scale-95 flex justify-center items-center gap-2"
                                        style={{ borderBottomWidth: '4px' }}
                                    >
                                        <Volume2 className="w-6 h-6" /> {opt}
                                    </button>
                                  )
                                }
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setStatus('idle');
                                            setSelectedAnswer(opt);
                                        }}
                                        className={`w-full p-4 rounded-2xl border-2 text-center font-bold text-lg transition-all
                                            ${isSelected ? 'border-[#58cc02] bg-green-50 text-[#58cc02]' : 'border-stone-200 text-stone-700 bg-white hover:bg-stone-50'}
                                        `}
                                        style={{ borderBottomWidth: isSelected ? '2px' : '4px', transform: isSelected ? 'translateY(2px)' : 'none' }}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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

            {/* Bottom Action Bar & Feedback – aligned with content column */}
            <div className="w-full px-6 pb-6 pt-2 flex flex-col items-center">

                {/* Feedback Panel */}
                <AnimatePresence>
                    {status === 'wrong' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-[#ffdfe0] px-4 py-4 rounded-2xl mb-4 w-full max-w-lg shadow-sm"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#ff4b4b] shrink-0">
                                    <XCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[#ea2b2b] font-black text-base mb-1">Chưa đúng rồi!</h3>
                                    <p className="text-[#ea2b2b] font-semibold text-sm opacity-90">Gợi ý: {question.hint}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {status === 'correct' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="bg-[#d7ffb8] px-4 py-4 rounded-2xl mb-4 w-full max-w-lg shadow-sm"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#58cc02] shrink-0">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[#58cc02] font-black text-base mb-1">Tuyệt vời!</h3>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Button Container */}
                <div className="w-full max-w-lg flex justify-center">
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
