import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Mistake } from '../../types';
import { RefreshCw, CheckCircle2, XCircle, BrainCircuit, Loader2 } from 'lucide-react';
import { triggerConfetti } from '../../lib/confetti';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';

export function ReviewRoom() {
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTasks = async () => {
            setIsLoading(true);
            try {
                const token = useUserStore.getState().token;
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                const response = await fetchWithMonitor<{ success: boolean, data: { tasks: Mistake[] } }>(
                    `${API_URL}/api/v1/review/daily_tasks`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    },
                    'ziczac_review_cache',
                    10000 // Nâng timeout lên 10s để tránh fallback local cache sớm
                );

                const tasks = response?.data?.tasks;
                if (tasks && tasks.length > 0) {
                    setMistakes(tasks);
                } else {
                    setMistakes([]);
                }
            } catch (err) {
                console.warn("[ReviewRoom] Lỗi API. Không thể tải review tasks:", err);
                setMistakes([]);
                trackEvent('backend_api_fail_review', { fallback: false });
            } finally {
                setIsLoading(false);
            }
        };

        loadTasks();
    }, []);

    const activeCard = mistakes[currentIndex];

    // ... handleNext logic ...
    const handleNext = (isRemembered: boolean) => {
        setIsFlipped(false);
        const cardTarget = activeCard;
        
        // Gọi API ngầm trong lúc thẻ xoay úp lại mà không làm đứng giao diện
        const token = useUserStore.getState().token;
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        if (token && cardTarget && cardTarget.item_id) {
            if (isRemembered) {
                fetchWithMonitor(`${API_URL}/api/v1/review/resolve_task`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ item_id: cardTarget.item_id })
                }, undefined, 10000).catch(err => console.warn("Lỗi đồng bộ giải quyết ôn tập", err));
            } else {
                fetchWithMonitor(`${API_URL}/api/v1/review/log_error`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ source: 'vocabulary', item_id: cardTarget.item_id })
                }, undefined, 10000).catch(err => console.warn("Lỗi đồng bộ lỗi ôn tập", err));
            }
        }

        setTimeout(() => {
            const nextMistakes = [...mistakes];
            if (isRemembered) {
                nextMistakes.splice(currentIndex, 1);
                setMistakes(nextMistakes);
                if (nextMistakes.length === 0) {
                    triggerConfetti();
                } else {
                    setCurrentIndex(Math.min(currentIndex, nextMistakes.length - 1));
                }
            } else {
                setCurrentIndex((prev) => (prev + 1) % mistakes.length);
            }
        }, 300);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                <p className="text-stone-500 font-bold">Đang tải thẻ ôn tập...</p>
            </div>
        );
    }

    if (!activeCard) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-stone-900 mb-2">Hoàn tất ôn tập!</h2>
                    <p className="text-stone-500 font-medium max-w-xs leading-relaxed">Bộ não của bạn đã được nạp đầy năng lượng. Hãy quay lại vào ngày mai nhé.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-white relative items-center">
            {/* Header */}
            <div className="w-full pb-6 pt-2 flex items-center justify-between border-b border-stone-100 mb-8 max-w-lg">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-stone-900 text-xl tracking-tight">Ôn tập thông minh</h2>
                        <p className="text-stone-500 text-sm font-medium">Còn {mistakes.length} thẻ</p>
                    </div>
                </div>
            </div>

            {/* Training Area (Centered, BIG typography, 1-screen rule) */}
            <div className="flex-1 w-full flex flex-col items-center justify-center -mt-10 max-w-lg">
                {(activeCard.lesson_type === 'learn_flashcard' || (activeCard.content?.word && !activeCard.content?.options)) ? (
                    // FLASHCARD MODE
                    <>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCard.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="w-full aspect-[4/3] perspective-1000 cursor-pointer"
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                <motion.div
                                    className="w-full h-full relative preserve-3d transition-transform duration-500"
                                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                                >
                                    {/* FRONT (Ba Na Word) */}
                                    <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-stone-100 flex flex-col justify-center items-center p-8">
                                        <div className="absolute top-6 right-6">
                                            <div className="bg-rose-50 text-rose-500 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> Sai {activeCard.errorCount} lần
                                            </div>
                                        </div>
                                        <span className="text-[4rem] sm:text-[5xl] font-black text-stone-900 tracking-tight leading-none text-center">
                                            {activeCard.word}
                                        </span>
                                        <p className="absolute bottom-8 text-stone-400 font-semibold text-sm flex items-center gap-2">
                                            Chạm để lật <RefreshCw className="w-4 h-4" />
                                        </p>
                                    </div>

                                    {/* BACK (Vietnamese Meaning) */}
                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-stone-900 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col justify-center items-center p-8 text-white">
                                        <span className="text-[3rem] font-bold tracking-tight text-center">
                                            {activeCard.meaning}
                                        </span>
                                        <p className="absolute top-8 text-stone-400 font-semibold text-sm">
                                            Nghĩa tiếng Việt
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Actions Panel (Chỉ cho Flashcard) */}
                        <div className={`w-full mt-12 grid grid-cols-2 gap-4 transition-all duration-300 ${!isFlipped ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(false); }}
                                className="py-4 rounded-2xl font-bold text-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                            >
                                Quên rồi
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(true); }}
                                className="py-4 rounded-2xl font-bold text-lg bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:bg-emerald-600 transition-colors"
                            >
                                Đã nhớ
                            </button>
                        </div>
                    </>
                ) : (
                    // QUIZ MODE
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCard.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -100, scale: 0.9 }}
                            className="w-full bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-stone-100 p-8 flex flex-col items-center text-center relative"
                        >
                            <div className="absolute top-6 right-6">
                                <div className="bg-rose-50 text-rose-500 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Sai {activeCard.errorCount} lần
                                </div>
                            </div>
                            
                            {/* Quiz Prompt */}
                            <h3 className="text-2xl font-black text-stone-800 mb-6 mt-4 opacity-90 leading-tight">
                                {activeCard.word || activeCard.description || 'Ôn tập câu hỏi này'}
                            </h3>
                            
                            {/* Quiz Options */}
                            <div className="flex flex-col gap-3 w-full mt-2">
                                {activeCard.content?.options ? Object.entries(activeCard.content.options).map(([key, opt]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            const correct = activeCard.correct_answer;
                                            const isCorrect = correct && (key === correct || opt === correct);
                                            handleNext(Boolean(isCorrect));
                                        }}
                                        className="w-full p-4 rounded-2xl border-2 border-stone-200 text-left font-bold text-lg text-stone-700 hover:bg-stone-50 hover:border-sky-200 transition-all active:scale-95"
                                        style={{ borderBottomWidth: '4px' }}
                                    >
                                        {String(opt)}
                                    </button>
                                )) : (
                                    <button 
                                        onClick={() => handleNext(true)}
                                        className="w-full p-4 rounded-2xl border-2 border-stone-200 bg-stone-50 font-bold text-lg text-stone-700"
                                    >
                                        Đã hiểu đoạn nội dung này
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
