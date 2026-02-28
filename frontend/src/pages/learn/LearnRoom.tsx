import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { MOCK_LESSONS } from '../../data/mockData';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';

function DailyGoalWidget() {
    const current = 3;
    const target = 5;
    const progress = (current / target) * 100;

    return (
        <div className="fixed bottom-24 right-4 z-40 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md pl-3 pr-4 py-3 rounded-2xl border border-stone-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3">
                {/* Mascot Icon Mini */}
                <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white relative overflow-hidden">
                    <div className="absolute top-2.5 left-2 w-1.5 h-1.5 bg-stone-900 rounded-full" />
                    <div className="absolute top-2.5 right-2 w-1.5 h-1.5 bg-stone-900 rounded-full" />
                    <div className="absolute bottom-1 w-3 h-1.5 bg-red-500 rounded-b-full" />
                </div>

                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <div className="flex justify-between items-baseline leading-none">
                        <span className="font-bold text-stone-700 text-[13px]">Mục tiêu</span>
                        <span className="font-black text-[#4e9f76] text-[12px]">{current}/{target}</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-[#facc15] rounded-full relative"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function LearnRoom() {
    const navigate = useNavigate();
    const { user } = useUserStore();
    const [lessons, setLessons] = useState<typeof MOCK_LESSONS>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLessons = async () => {
            setIsLoading(true);
            try {
                // Fetch bài học từ hệ thống CMS Google Sheets.
                // Thử tải bằng fetchWithMonitor. Nếu sau 3 giây không có phản hồi, lấy từ Cache hoặc fallback.
                const fetchedLessons = await fetchWithMonitor<typeof MOCK_LESSONS>(
                    'http://localhost:8000/api/lessons', // Mock endpoint Google Sheets CMS
                    {},
                    'ziczac_lessons_cache',
                    3000
                );

                // Giả map dữ liệu 
                setLessons(fetchedLessons || MOCK_LESSONS);
            } catch (err) {
                // Rớt mạng hoặc Google Sheet bị ngắt -> Dùng MockData hiển thị tạm để không hỏng trải nghiệm người dùng
                console.warn("[LearnRoom] Đang sử dụng Offline Fallback Data cho Lessons.", err);
                setLessons(MOCK_LESSONS);
                trackEvent('google_sheet_cms_fail', { fallback: true });
            } finally {
                setIsLoading(false);
            }
        };

        loadLessons();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-stone-500 font-bold">Đang tải bản đồ học tập...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center py-6 w-full relative">
            {/* Header section with Mascot & Greeting */}
            <div className="flex flex-col items-center text-center z-10 mb-8 mt-2">
                <div className="w-24 h-24 rounded-full bg-[#f3f4f6] mb-4 flex items-center justify-center border-[6px] border-white shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden text-5xl relative">
                    🐘
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-200/50 to-transparent"></div>
                </div>
                <h2 className="text-xl font-bold text-text-main mb-1">
                    Hôm nay học gì nào, {user?.name || 'bạn ơi'}?
                </h2>
                <p className="text-stone-400 font-medium text-sm">
                    Tiếp tục hành trình nhé!
                </p>
            </div>

            {/* Path SVG Background */}
            <div className="absolute top-[200px] bottom-24 left-0 right-0 z-0 flex justify-center overflow-hidden pointer-events-none">
                <svg width="200" height="100%" className="overflow-visible" style={{ minHeight: `${lessons.length * 120}px` }}>
                    {lessons.map((lesson, idx) => {
                        if (idx === lessons.length - 1) return null;

                        const completedLessons = user?.completedLessons || [];
                        const isNodeCompleted = completedLessons.includes(lesson.id);

                        // Line glows if current node is completed.
                        const isLineActive = isNodeCompleted;

                        const startX = idx % 2 === 0 ? 140 : 60;
                        const endX = (idx + 1) % 2 === 0 ? 140 : 60;
                        const startY = idx * 120 + 40;
                        const endY = (idx + 1) * 120 + 40;

                        return (
                            <path
                                key={`line-${lesson.id}`}
                                d={`M ${startX} ${startY} C ${startX} ${startY + 60}, ${endX} ${endY - 60}, ${endX} ${endY}`}
                                fill="none"
                                stroke={isLineActive ? "#4e9f76" : "#e5e7eb"}
                                strokeWidth="12"
                                strokeLinecap="round"
                                className="transition-all duration-500"
                            />
                        );
                    })}
                </svg>
            </div>

            <div className="flex flex-col w-full items-center relative z-10 mb-24 mt-4" style={{ gap: '40px' }}>
                {lessons.map((lesson, index) => {
                    const completedLessons = user?.completedLessons || [];
                    const isCompleted = completedLessons.includes(lesson.id);
                    const lastCompletedIndex = lessons.findIndex(l => l.id === completedLessons[completedLessons.length - 1]);
                    const isActive = index === lastCompletedIndex + 1 || (index === 0 && completedLessons.length === 0);
                    const isLocked = index > lastCompletedIndex + 1;

                    // Zic-zac alignment
                    const offsetX = index % 2 === 0 ? 40 : -40;

                    return (
                        <motion.div
                            key={lesson.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ x: offsetX }}
                            className="relative group text-center cursor-pointer flex flex-col items-center"
                        >
                            {/* Active node decoration (Stars & Name tag) */}
                            {isActive && (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="absolute -top-16 flex flex-col items-center w-40 pointer-events-none"
                                >
                                    <div className="flex gap-1.5 mb-1">
                                        <span className="text-[#facc15] text-xl drop-shadow-sm">★</span>
                                        <span className="text-[#facc15] text-xl -translate-y-1.5 drop-shadow-sm">★</span>
                                        <span className="text-[#facc15] text-xl drop-shadow-sm">★</span>
                                    </div>
                                    <div className="bg-white px-4 py-1.5 rounded-xl shadow-sm border border-stone-100 font-bold text-xs text-stone-600 whitespace-nowrap">
                                        {lesson.topic}
                                    </div>
                                </motion.div>
                            )}

                            {/* Node Circle with Pulse for Active */}
                            <div className="relative">
                                {isActive && (
                                    <div className="absolute -inset-3 bg-[#facc15]/20 rounded-full animate-pulse blur-md" />
                                )}

                                {/* Progress Ring for Active */}
                                {isActive && (
                                    <svg className="absolute -inset-2 w-[100px] h-[100px] -rotate-90 pointer-events-none">
                                        <circle cx="50" cy="50" r="46" fill="none" stroke="#fef08a" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="46" fill="none" stroke="#facc15" strokeWidth="8" strokeDasharray="289" strokeDashoffset="200" strokeLinecap="round" className="transition-all duration-1000" />
                                    </svg>
                                )}

                                <div
                                    className={cn(
                                        "rounded-full flex items-center justify-center relative border-b-[6px] transition-transform",
                                        isLocked ? "w-[72px] h-[72px] bg-stone-200 border-stone-300 pointer-events-none" : "hover:-translate-y-1 active:scale-95 text-white cursor-pointer",
                                        isCompleted && "w-[72px] h-[72px] bg-[#4e9f76] border-[#3f7a5b] shadow-[0_4px_15px_rgba(78,159,118,0.3)]",
                                        isActive && "w-[84px] h-[84px] bg-[#facc15] border-[#ca8a04] shadow-[0_4px_25px_rgba(250,204,21,0.4)]"
                                    )}
                                    // Chuyển hướng sang màn Intro trước khi học
                                    onClick={() => !isLocked && navigate(`/lesson/${lesson.id}/intro`)}
                                >
                                    {isCompleted && !isActive && <Check className="w-8 h-8 stroke-[4]" />}
                                    {isLocked && (
                                        <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                                        </svg>
                                    )}
                                    {isActive && <div className="w-7 h-7 rounded-full bg-white/30 blur-[1px]" />}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <DailyGoalWidget />
        </div>
    );
}
