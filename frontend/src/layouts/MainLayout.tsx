import { Link, useLocation, Outlet } from 'react-router-dom';
import { BookOpen, Repeat, Users, BookMarked, MessageCircle, LogOut, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useUserStore } from '../store/useUserStore';
import { MascotKorai } from '../components/MascotKorai';
import { SmartReviewReminder } from '../components/SmartReviewReminder';

const TABS = [
    { path: '/', label: 'Học tiếng', icon: BookOpen },
    { path: '/review', label: 'Củng cố', icon: Repeat },
    { path: '/community', label: 'Cộng đồng', icon: Users },
    { path: '/stories', label: 'Đọc truyện', icon: BookMarked },
    { path: '/chat', label: 'AI Chat', icon: MessageCircle },
    { path: '/shop', label: 'Cửa hàng', icon: ShoppingCart },
];

function LeftSidebar() {
    const location = useLocation();
    const { user, logout } = useUserStore();

    // Dữ liệu Real-time (nếu có, nếu không fallback [] & 0)
    const equippedItems = user?.equippedItems || {};
    const streak = user?.streak || 0;
    const sao_vang = user?.sao_vang || 0;

    const handleLogout = () => {
        localStorage.removeItem('isGuest');
        logout(); // Gọi method auth state
        window.location.href = '/welcome';
    };

    return (
        <aside className="w-24 md:w-64 fixed top-0 left-0 h-screen bg-white border-r border-stone-100 flex flex-col items-center py-8 z-50 transition-all duration-300 shadow-[2px_0_15px_rgba(0,0,0,0.02)]">

            {/* Absolute Mascot Positioning (Emotional Design) */}
            <div className="relative w-full flex justify-center mb-8 h-32">
                <MascotKorai equippedItems={equippedItems} className="absolute -top-4 md:top-0" />
            </div>

            {/* User Stats (Minimalist) */}
            <div className="hidden md:flex flex-col items-center gap-2 mb-10">
                <div className="flex bg-stone-50 px-4 py-1.5 rounded-full border border-stone-100 items-center justify-center gap-4 w-full">
                    <div className="text-sm font-semibold text-orange-600 flex items-center gap-1">⭐ {sao_vang} Vàng</div>
                    <div className="text-sm font-semibold text-rose-500 flex items-center gap-1">🔥 {streak} Ngày</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex-1 w-full px-4 flex flex-col gap-2">
                {TABS.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={cn(
                                "relative flex items-center p-3 md:px-4 md:py-3 rounded-2xl transition-all duration-300 group",
                                isActive ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                            )}
                        >
                            <Icon className={cn("w-6 h-6 md:w-5 md:h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                            <span className={cn("hidden md:block ml-3 font-semibold text-[15px]", isActive ? "opacity-100" : "opacity-70")}>
                                {tab.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 border-2 border-stone-900 rounded-2xl z-[-1]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="w-full px-4 mt-auto">
                <button
                    onClick={handleLogout}
                    className="w-full relative flex items-center justify-center md:justify-start p-3 md:px-4 md:py-3 rounded-2xl text-stone-400 hover:bg-rose-50 hover:text-rose-500 transition-colors group"
                >
                    <LogOut className="w-6 h-6 md:w-5 md:h-5" />
                    <span className="hidden md:block ml-3 font-semibold text-[15px]">Thoát</span>
                </button>
            </div>
        </aside>
    );
}

export function MainLayout() {
    // const isGuest = localStorage.getItem('isGuest') === 'true';

    // Uncomment khi bật auth flow thực
    // if (!isGuest && window.location.pathname !== '/welcome') {
    //     return <Navigate to="/welcome" replace />;
    // }

    return (
        <div className="min-h-screen bg-stone-50 flex font-sans relative text-stone-900">
            {/* Left Desktop Sidebar */}
            <LeftSidebar />

            {/* Smart Review Reminder Modal Component */}
            <SmartReviewReminder />

            {/* Main Application Area - Rule 1 Screen 1 Action */}
            <main className="flex-1 ml-24 md:ml-64 relative overflow-x-hidden flex flex-col md:p-8 p-4 h-screen overflow-y-auto">
                <div className="max-w-4xl w-full mx-auto bg-white rounded-[2rem] shadow-sm border border-stone-100 min-h-[calc(100vh-4rem)] p-6 md:p-10 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
