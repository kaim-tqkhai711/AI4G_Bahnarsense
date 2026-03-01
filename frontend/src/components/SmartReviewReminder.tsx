import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarClock, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${API_BASE}/api/v1`;

export function SmartReviewReminder() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<{ hasTasks: boolean; taskCount: number; aiMessage: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { token } = useUserStore();

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        // Chỉ hiển thị 1 lần mỗi ngày
        const lastShown = localStorage.getItem('smart_reminder_date');
        const today = new Date().toISOString().split('T')[0];

        if (lastShown === today) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchReminder = async () => {
            try {
                const res = await fetch(`${API_URL}/review/smart_reminder`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) throw new Error('Failed to fetch smart reminder');

                const json = await res.json();
                if (isMounted && json.data && json.data.hasTasks) {
                    setData(json.data);
                    setIsOpen(true);
                    // Đánh dấu đã hiển thị trong ngày hôm nay
                    localStorage.setItem('smart_reminder_date', today);
                }
            } catch (error) {
                console.error('Lỗi khi lấy dữ liệu nhắc nhở thông minh:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchReminder();

        return () => {
            isMounted = false;
        };
    }, [token]);

    const handleReviewNow = () => {
        setIsOpen(false);
        navigate('/review');
    };

    const handlePostpone = async () => {
        setIsOpen(false);
        try {
            await fetch(`${API_URL}/review/postpone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ days: 1 })
            });
        } catch (error) {
            console.error('Lỗi khi hoãn nhắc nhở:', error);
        }
    };

    const handleIgnore = () => {
        setIsOpen(false);
    };

    if (loading || !data) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-100 relative"
                    >
                        {/* Nút đóng */}
                        <button
                            onClick={handleIgnore}
                            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full transition-colors z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6">
                            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <span className="text-3xl" role="img" aria-label="robot">🤖</span>
                            </div>

                            <h3 className="text-xl font-bold text-stone-900 mb-2">Gợi ý ôn tập!</h3>

                            <p className="text-stone-600 text-[15px] mb-6 leading-relaxed">
                                {data.aiMessage}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleReviewNow}
                                    className="w-full py-3.5 px-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-transform active:scale-95"
                                >
                                    <PlayCircle size={20} />
                                    <span>Ôn ngay thôi</span>
                                </button>

                                <button
                                    onClick={handlePostpone}
                                    className="w-full py-3.5 px-4 bg-stone-50 text-stone-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-100 transition-colors active:scale-95"
                                >
                                    <CalendarClock size={20} />
                                    <span>Lên lịch ôn sau (Ngày mai)</span>
                                </button>

                                <button
                                    onClick={handleIgnore}
                                    className="w-full py-3 px-4 text-stone-400 font-semibold text-sm hover:text-stone-600 transition-colors"
                                >
                                    Tạm thời bỏ qua
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
