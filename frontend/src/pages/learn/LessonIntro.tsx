import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Clock, BookOpen, Loader2 } from 'lucide-react';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';
import { Lesson } from '../../types';

export function LessonIntro() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLesson = async () => {
            setIsLoading(true);
            try {
                const token = useUserStore.getState().token;
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                if (!token) {
                    setLesson(null);
                    return;
                }

                const response = await fetchWithMonitor<{ success: boolean; data: Lesson[] } | Lesson[]>(
                    `${API_URL}/api/v1/lessons`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    },
                    'ziczac_lessons_cache',
                    3000
                );

                const list = Array.isArray(response) ? response : (response?.data ?? []);
                const found = list.find((l: Lesson) => l.id === id);
                setLesson(found || null);
            } catch (err) {
                console.warn("[LessonIntro] Lỗi API:", err);
                setLesson(null);
                trackEvent('backend_api_fail_intro', { fallback: false, lessonId: id });
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            loadLesson();
        }
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-stone-500 font-bold">Đang tải thông tin bài học...</p>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <h2 className="text-xl font-bold">Không tìm thấy bài học!</h2>
                <button onClick={() => navigate('/')} className="mt-4 text-emerald-600 underline">Quay lại lộ trình</button>
            </div>
        );
    }

    // Tính toán tiến trình chủ đề hiện tại (Mockup)
    const totalLessonsInTopic = 4;
    const completedInTopic = 0; // Thay thế bằng dữ liệu thực tế từ user data

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col relative overflow-hidden">
            {/* Header / Back button */}
            <div className="p-4 z-10 flex items-center">
                <button
                    onClick={() => navigate('/')}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-stone-600 hover:text-stone-900 active:scale-95 transition-all outline-none"
                    title="Quay lại"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">

                {/* Mascot KơRai Area */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="relative mb-8"
                >
                    {/* Hào quang phía sau Mascot */}
                    <div className="absolute inset-0 bg-[#facc15]/20 rounded-full blur-3xl scale-150 -z-10 animate-pulse"></div>

                    {/* Dummy KơRai Avatar */}
                    <div className="w-40 h-40 bg-orange-400 rounded-full border-8 border-white shadow-xl flex items-center justify-center relative overflow-hidden">
                        {/* Khuôn mặt Voi con */}
                        <div className="absolute top-10 left-8 w-3 h-3 bg-stone-900 rounded-full" />
                        <div className="absolute top-10 right-8 w-3 h-3 bg-stone-900 rounded-full" />
                        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-8 h-12 bg-orange-300 rounded-full opacity-80" /> {/* Vòi */}
                        <div className="absolute bottom-6 w-8 h-4 bg-red-400 rounded-b-full shadow-inner" /> {/* Miệng */}
                    </div>
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-[2rem] shadow-lg border border-stone-100 max-w-sm w-full"
                >
                    <h1 className="text-2xl font-black text-stone-800 mb-3 leading-tight">
                        Hôm nay bạn sẽ học cách <br />
                        <span className="text-emerald-600">{lesson.topic.toUpperCase()}</span>
                    </h1>
                    <p className="text-stone-500 font-medium mb-6">Bằng tiếng Ba Na!</p>

                    <div className="flex gap-4 justify-center mb-6">
                        <div className="flex items-center gap-2 bg-stone-50 px-4 py-2.5 rounded-2xl text-stone-600 font-bold border border-stone-100">
                            <Clock className="w-5 h-5 text-emerald-500" />
                            <span>~20 phút</span>
                        </div>
                        <div className="flex items-center gap-2 bg-stone-50 px-4 py-2.5 rounded-2xl text-stone-600 font-bold border border-stone-100">
                            <BookOpen className="w-5 h-5 text-emerald-500" />
                            <span>Bài {lesson.id.replace('l', '')}</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-4 mb-2 border border-emerald-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-emerald-800">Tiến trình chủ đề</span>
                            <span className="text-sm font-bold text-emerald-600">{completedInTopic}/{totalLessonsInTopic}</span>
                        </div>
                        <div className="w-full h-2 bg-emerald-200/50 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(completedInTopic / totalLessonsInTopic) * 100}%` }}></div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Action Area */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
                className="p-6 bg-white border-t border-stone-100 z-20 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
            >
                <button
                    onClick={() => navigate(`/lesson/${lesson.id}/interactive`)}
                    className="w-full bg-[#4e9f76] hover:bg-[#3f7a5b] text-white font-black text-lg py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95 transition-all group"
                >
                    Bắt đầu học ngay
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
}
