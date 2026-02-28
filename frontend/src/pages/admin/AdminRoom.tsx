import { useState, useEffect } from 'react';
import { Settings, BookOpen, Volume2, Database, LayoutDashboard, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Lesson } from '../../types';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';

export function AdminRoom() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'lessons' | 'vocab'>('lessons');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLessons = async () => {
            setIsLoading(true);
            try {
                const token = useUserStore.getState().token;
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                const response = await fetchWithMonitor<{ success: boolean, data: Lesson[] }>(
                    `${API_URL}/api/v1/lessons`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    },
                    'ziczac_lessons_admin_cache',
                    3000
                );

                setLessons(response?.data || []);
            } catch (err) {
                console.warn("[AdminRoom] Lỗi API, fallback sang MockData:", err);
                setLessons([]);
                trackEvent('backend_api_fail_admin', { fallback: true });
            } finally {
                setIsLoading(false);
            }
        };

        if (activeTab === 'lessons') {
            loadLessons();
        }
    }, [activeTab]);

    return (
        <div className="flex h-screen bg-stone-50 w-full font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-stone-200 flex flex-col hidden sm:flex">
                <div className="p-6 border-b border-stone-100 flex items-center gap-3">
                    <Settings className="w-6 h-6 text-primary" />
                    <h1 className="font-bold text-text-main text-lg">Ba Na Học Admin</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-50 text-primary' : 'text-stone-500 hover:bg-stone-50'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Tổng quan
                    </button>
                    <button
                        onClick={() => setActiveTab('lessons')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'lessons' ? 'bg-emerald-50 text-primary' : 'text-stone-500 hover:bg-stone-50'}`}
                    >
                        <BookOpen className="w-4 h-4" /> Bài học
                    </button>
                    <button
                        onClick={() => setActiveTab('vocab')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'vocab' ? 'bg-emerald-50 text-primary' : 'text-stone-500 hover:bg-stone-50'}`}
                    >
                        <Database className="w-4 h-4" /> Từ vựng
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors">
                        <Volume2 className="w-4 h-4" /> Âm thanh
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto flex flex-col relative w-full pt-10 px-4 sm:p-8 sm:w-auto">
                {/* Mobile Header logic later... simple for now */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-text-main">
                        {activeTab === 'lessons' && 'Quản lý bài học'}
                        {activeTab === 'dashboard' && 'Dashboard'}
                        {activeTab === 'vocab' && 'Ngân hàng từ vựng'}
                    </h2>
                    <button className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-shadow flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Thêm mới
                    </button>
                </div>

                {activeTab === 'lessons' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-bold rounded-tl-2xl">Mã</th>
                                    <th className="p-4 font-bold">Chủ đề</th>
                                    <th className="p-4 font-bold">Độ khó</th>
                                    <th className="p-4 font-bold">Loại</th>
                                    <th className="p-4 font-bold text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-sm">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-stone-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : lessons.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-stone-500">Chưa có bài học nào.</td>
                                    </tr>
                                ) : (
                                    lessons.map((lesson: Lesson) => (
                                        <tr key={lesson.id} className="hover:bg-stone-50 transition-colors">
                                            <td className="p-4 font-mono text-stone-500">{lesson.id}</td>
                                            <td className="p-4 font-bold text-text-main">{lesson.topic}</td>
                                            <td className="p-4">
                                                <div className="flex gap-1">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <div key={i} className={`w-2 h-2 rounded-full ${i < lesson.difficulty ? 'bg-orange-400' : 'bg-stone-200'}`} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${lesson.type === 'vocab' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                    {lesson.type === 'vocab' ? 'Từ vựng' : 'Ngữ pháp'}
                                                </span>
                                            </td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <button className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
