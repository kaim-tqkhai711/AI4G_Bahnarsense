import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { triggerConfetti } from '../../lib/confetti';
import { fetchWithMonitor, trackEvent } from '../../lib/monitor';
import { useUserStore } from '../../store/useUserStore';
import { MascotKorai } from '../../components/MascotKorai';

// Phân loại danh mục
const CATEGORIES = ['Tất cả', 'Trang phục', 'Tóc', 'Màu da', 'Phụ kiện'];

// Mock hệt thống vật phẩm API
const SHOP_ITEMS = [
    { id: 'item_hat_1', name: 'Nón Lá Truyền Thống', price: 150, type: 'Trang phục', icon: '👒' },
    { id: 'item_glasses_1', name: 'Kính Râm Coolngầu', price: 80, type: 'Phụ kiện', icon: '🕶️' },
    { id: 'item_scarf_1', name: 'Khăn Thổ Cẩm Đỏ', price: 300, type: 'Trang phục', icon: '🧣' },
    { id: 'item_hair_1', name: 'Tóc Mohican', price: 200, type: 'Tóc', icon: '💇' },
    { id: 'item_skin_1', name: 'Da Bánh Mật', price: 50, type: 'Màu da', icon: '🟤' },
    { id: 'item_crown_1', name: 'Vương miện Tù Trưởng', price: 1500, type: 'Phụ kiện', icon: '👑' },
];

export function ShopRoom() {
    const { user, updateUser, token, isAuthenticated } = useUserStore();

    const [balance, setBalance] = useState(user?.sao_vang || 0);
    const [ownedItems, setOwnedItems] = useState<string[]>(user?.inventory || []);
    // Danh sách đồ đang mặc "thật"
    const [equipped, setEquipped] = useState<Record<string, string>>(user?.equippedItems || {});
    // Danh sách đồ đang "thử" (Lưu object để map với category)
    const [previewItem, setPreviewItem] = useState<{ id: string, categoryKey: string } | null>(null);
    const [activeTab, setActiveTab] = useState('Tất cả');

    // Status thanh toán: idle -> confirm -> success | error
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirm' | 'success' | 'error'>('idle');

    // Lọc theo tag
    const filteredItems = SHOP_ITEMS.filter(item => activeTab === 'Tất cả' || item.type === activeTab);

    const getCategoryKey = (type: string) => {
        switch (type) {
            case 'Màu da': return 'skin';
            case 'Trang phục': return 'clothes';
            case 'Tóc': return 'hair';
            case 'Phụ kiện': return 'accessory';
            default: return '';
        }
    }

    // Xử lý khi ấn vào item
    const handleItemClick = (item: typeof SHOP_ITEMS[0]) => {
        const isOwned = ownedItems.includes(item.id);
        const categoryKey = getCategoryKey(item.type);

        if (isOwned) {
            // Toggle mặc / tháo
            if (equipped[categoryKey] === item.id) {
                const newEquipped = { ...equipped };
                delete newEquipped[categoryKey];
                setEquipped(newEquipped);
            } else {
                setEquipped(prev => ({ ...prev, [categoryKey]: item.id }));
            }
            setPreviewItem(null);
            setPaymentStatus('idle');
        } else {
            // Try on (Real-time Preview)
            setPreviewItem({ id: item.id, categoryKey });
            setPaymentStatus('idle');
        }
    };

    // Calculate Mascot display items (Equipped + Preview)
    const mascotDisplayItems = { ...equipped };
    if (previewItem) {
        mascotDisplayItems[previewItem.categoryKey] = previewItem.id;
    }

    const selectedToBuy = SHOP_ITEMS.find(i => i.id === previewItem?.id);

    const handleConfirmPurchase = () => {
        if (!selectedToBuy) return;

        if (balance >= selectedToBuy.price) {
            setPaymentStatus('confirm');
        } else {
            setPaymentStatus('error');
        }
    };

    const executePurchase = async () => {
        if (!selectedToBuy || !previewItem || balance < selectedToBuy.price) return;

        const newBalance = balance - selectedToBuy.price;
        const newOwned = [...ownedItems, selectedToBuy.id];
        const newEquipped = { ...equipped, [previewItem.categoryKey]: selectedToBuy.id };

        // Trừ tiền, add vào tủ đồ, tự động mặc luôn
        setBalance(newBalance);
        setOwnedItems(newOwned);
        setEquipped(newEquipped);
        setPreviewItem(null);
        setPaymentStatus('success');

        // Effect cảm xúc ngập tràn
        triggerConfetti();

        // Cập nhật lên CSDL bằng Fallback Monitor
        try {
            await fetchWithMonitor(
                'http://localhost:8000/api/v1/shop/buy',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        item_id: selectedToBuy.id
                    })
                },
                'shop_purchase',
                5000
            );

            updateUser({ sao_vang: newBalance, inventory: newOwned, equippedItems: newEquipped }); // Update Global State (Zustand)
            trackEvent('shop_purchase_success', { item_id: selectedToBuy.id, price: selectedToBuy.price });
        } catch (error) {
            console.error("Giao dịch bị lỗi trên Server", error);
        }

        setTimeout(() => setPaymentStatus('idle'), 3000);
    };

    // Render logic kiểm tra sau khi các Hook đã chạy đầy đủ
    if (!user || !isAuthenticated) return <div className="p-8 text-center text-stone-500 font-bold">Đang tải Cửa hàng...</div>;

    return (
        <div className="flex flex-col md:flex-row h-full w-full gap-6 p-2 md:p-6 bg-stone-50/50 rounded-3xl">

            {/* CỘT TRÁI: KHU VỰC AVATAR (Preview) */}
            <div className="w-full md:w-1/3 flex flex-col items-center">
                {/* Balance Info */}
                <div className="w-full flex items-center justify-between mb-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Số dư</p>
                            <p className="text-xl font-black text-stone-900 leading-none">{balance} <span className="text-sm font-bold text-orange-500">Sao</span></p>
                        </div>
                    </div>
                </div>

                {/* Mascot Podium */}
                <div className="relative w-full aspect-square bg-gradient-to-b from-stone-100 to-stone-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 overflow-hidden shadow-inner border border-stone-200/60">
                    {/* Hào quang khi preview đồ xịn */}
                    <AnimatePresence>
                        {previewItem && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 0.5, scale: 1.5 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="absolute bg-orange-300 w-32 h-32 rounded-full blur-[50px] z-0"
                            />
                        )}
                    </AnimatePresence>

                    <div className="relative z-10 transform scale-150 origin-bottom pb-8">
                        <MascotKorai equippedItems={mascotDisplayItems} />
                    </div>

                    <div className="absolute bottom-8 w-3/4 h-8 bg-stone-300/40 rounded-[100%] blur-sm -z-0" />
                </div>
            </div>

            {/* CỘT PHẢI: CỬA HÀNG (Grid) */}
            <div className="w-full md:w-2/3 flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-stone-100 p-6 md:p-8">

                <h2 className="text-2xl font-black text-stone-900 mb-6 flex items-center gap-3 tracking-tight">
                    <ShoppingBag className="w-7 h-7 text-emerald-500" />
                    Cửa hàng trang phục
                </h2>

                {/* Navigation Tabs */}
                <div className="flex overflow-x-auto gap-2 pb-4 no-scrollbar mb-4">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${activeTab === cat
                                ? 'bg-stone-900 text-white shadow-md'
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid Item */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map((item) => {
                            const isOwned = ownedItems.includes(item.id);
                            const isEquipped = Object.values(equipped).includes(item.id);
                            const isPreview = previewItem?.id === item.id;

                            return (
                                <motion.div
                                    key={item.id}
                                    layout
                                    whileHover={{ y: -4 }}
                                    onClick={() => handleItemClick(item)}
                                    className={`relative flex flex-col p-4 rounded-3xl cursor-pointer transition-all border-2 ${isPreview
                                        ? 'border-orange-400 bg-orange-50 shadow-md'
                                        : isEquipped
                                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                            : isOwned
                                                ? 'border-stone-200 bg-stone-50/50 grayscale-[0.2]'
                                                : 'border-stone-100 bg-white hover:border-stone-200 hover:shadow-lg'
                                        }`}
                                >
                                    {/* Status Badge */}
                                    <div className="absolute top-3 left-3 z-10">
                                        {isEquipped && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase">Đang mặc</span>}
                                        {isOwned && !isEquipped && <span className="bg-stone-200 text-stone-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase">Đã mua</span>}
                                    </div>

                                    <div className="w-16 h-16 mx-auto bg-white/60 rounded-2xl flex items-center justify-center text-4xl mb-4 mt-2 drop-shadow-sm">
                                        {item.icon}
                                    </div>

                                    <h3 className="font-bold text-stone-900 text-sm mb-1 leading-tight text-center">{item.name}</h3>

                                    <div className="mt-auto pt-3">
                                        {!isOwned && (
                                            <div className="flex items-center justify-center gap-1.5 font-black text-rose-500 bg-rose-50 py-1.5 rounded-xl">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                {item.price}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Thanh Action nổi (1-screen 1-action rule) */}
                <AnimatePresence>
                    {previewItem && selectedToBuy && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="absolute bottom-6 left-6 right-6 md:left-auto md:w-[calc(66.666%-3rem)] bg-stone-900 rounded-[2rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-stone-700 z-50"
                        >
                            <div className="flex items-center gap-3 text-white pl-2">
                                <div className="text-3xl">{selectedToBuy.icon}</div>
                                <div>
                                    <h4 className="font-bold">{selectedToBuy.name}</h4>
                                    <p className="text-sm font-medium text-stone-400">Giá: {selectedToBuy.price} Sao</p>
                                </div>
                            </div>

                            {paymentStatus === 'idle' && (
                                <button
                                    onClick={handleConfirmPurchase}
                                    className="bg-white text-stone-900 font-bold px-6 py-3.5 rounded-2xl shadow-sm hover:scale-105 transition-transform"
                                >
                                    Mua ngay
                                </button>
                            )}

                            {paymentStatus === 'confirm' && (
                                <button
                                    onClick={executePurchase}
                                    className="bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Xác nhận mua
                                </button>
                            )}

                            {paymentStatus === 'error' && (
                                <div className="bg-rose-500 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Thiếu {selectedToBuy.price - balance} Sao
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
