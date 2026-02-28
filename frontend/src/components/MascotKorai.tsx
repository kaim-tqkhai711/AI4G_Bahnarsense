import React from 'react';
import { motion } from 'framer-motion';

interface EquippedItems {
    skin?: string;
    clothes?: string;
    hair?: string;
    accessory?: string;
}

interface MascotKoraiProps {
    equippedItems?: EquippedItems;
    className?: string;
}

export const MascotKorai: React.FC<MascotKoraiProps> = ({ equippedItems = {}, className = '' }) => {
    // Helper để resolve skin color
    const getSkinColor = () => {
        if (equippedItems.skin === 'item_skin_1') return 'bg-orange-800'; // Da bánh mật
        if (equippedItems.skin === 'item_skin_2') return 'bg-orange-200'; // Sáng hơn
        return 'bg-orange-400'; // Default
    };

    return (
        <div className={`relative flex items-center justify-center ${className} w-32 h-32`}>
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="relative w-full h-full"
            >
                {/* Z-Index 1 & 2: Base Body + Skin together since it's simple colored div for now */}
                <div className={`absolute inset-0 m-auto w-24 h-24 ${getSkinColor()} rounded-[40%] flex items-center justify-center object-contain shadow-lg shadow-orange-200/50 z-[1]`}>
                    {/* Eyes */}
                    <div className="absolute top-6 left-5 w-4 h-4 bg-white rounded-full flex items-center justify-center z-[1]">
                        <div className="w-2 h-2 bg-stone-900 rounded-full" />
                    </div>
                    <div className="absolute top-6 right-5 w-4 h-4 bg-white rounded-full flex items-center justify-center z-[1]">
                        <div className="w-2 h-2 bg-stone-900 rounded-full" />
                    </div>
                    {/* Mouth */}
                    <div className="absolute bottom-6 w-6 h-3 bg-red-500 rounded-b-full z-[1]" />
                </div>

                {/* Z-Index 3: Clothes */}
                {equippedItems.clothes === 'item_scarf_1' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-red-600 border-2 border-red-800 rounded-md z-[3]" />
                )}

                {/* Z-Index 4: Hair */}
                {equippedItems.hair === 'item_hair_1' && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-10 bg-stone-900 rounded-t-full -translate-y-full z-[4]" />
                )}

                {/* Z-Index 5: Accessories */}
                {equippedItems.accessory === 'item_glasses_1' && (
                    <div className="absolute top-[3.5rem] left-1/2 -translate-x-1/2 w-[5.5rem] h-6 border-4 border-stone-800 rounded-lg z-[5]" />
                )}
                {equippedItems.accessory === 'item_hat_1' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-10 bg-yellow-600 rounded-t-full -translate-y-1/2 border-b-4 border-yellow-800 z-[5]" />
                )}
                {equippedItems.accessory === 'item_crown_1' && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-12 bg-yellow-400 rounded-t-md -translate-y-1/2 border-2 border-yellow-600 z-[5] flex justify-center items-center">
                        <span className="text-xl">👑</span>
                    </div>
                )}

            </motion.div>
        </div>
    );
};
