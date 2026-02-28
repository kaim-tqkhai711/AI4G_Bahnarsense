import { db } from '@/utils/firebaseAdmin';

export class GameRepository {
  /**
   * Mua đồ bằng Firebase Firestore Transaction để đảm bảo tính Acid (chống Double Spend)
   */
  async purchaseItem(userId: string, itemId: string): Promise<boolean> {
    const profileRef = db.collection('profiles').doc(userId);
    const itemRef = db.collection('shop_items').doc(itemId);
    const inventoryRef = db.collection('inventory').doc(`${userId}_${itemId}`);

    await db.runTransaction(async (transaction) => {
      const profileDoc = await transaction.get(profileRef);
      const itemDoc = await transaction.get(itemRef);

      if (!profileDoc.exists) throw new Error('User profile not found.');
      if (!itemDoc.exists) throw new Error('Item not found or not active.');

      const profileData = profileDoc.data()!;
      const itemData = itemDoc.data()!;

      if (profileData.sao_vang < itemData.price) {
        throw new Error('Không đủ Sao Vàng.');
      }

      const invDoc = await transaction.get(inventoryRef);
      if (invDoc.exists) {
        throw new Error('User already owns this item.');
      }

      // 1. Map type sang key của equippedItems
      let categoryKey = '';
      if (itemData.type === 'Màu da') categoryKey = 'skin';
      else if (itemData.type === 'Trang phục') categoryKey = 'clothes';
      else if (itemData.type === 'Tóc') categoryKey = 'hair';
      else if (itemData.type === 'Phụ kiện') categoryKey = 'accessory';

      // 2. Chống lỗi map category
      if (!categoryKey) {
        throw new Error('Item type mapping failed.');
      }

      // 3. Chuẩn bị object update cho Profile
      const newInventory = [...(profileData.inventory || []), itemId];
      const newEquippedItems = {
        ...(profileData.equippedItems || {}),
        [categoryKey]: itemId
      };

      transaction.update(profileRef, {
        sao_vang: profileData.sao_vang - itemData.price,
        inventory: newInventory,
        equippedItems: newEquippedItems
      });

      // (Tùy chọn) Vẫn giữ lại Subcollection inventory_records để truy xuất riêng
      transaction.set(inventoryRef, {
        user_id: userId,
        item_id: itemId,
        is_equipped: true, // Vì tự động mặc vào luôn
        category: categoryKey,
        acquired_at: new Date().toISOString()
      });

      // 3. Ghi Log
      const logRef = db.collection('transaction_log').doc();
      transaction.set(logRef, {
        user_id: userId,
        amount: -itemData.price,
        currency: 'sao_vang',
        type: 'shop_purchase',
        metadata: { item_id: itemId, item_name: itemData.name },
        created_at: new Date().toISOString()
      });
    });

    return true;
  }

  /**
   * Tính năng Khôi phục chuỗi (Streak Recovery)
   * Tối đa 2 lần/tháng. Trừ Sao Vàng thay vì gongs.
   */
  async recoverStreak(userId: string): Promise<boolean> {
    const profileRef = db.collection('profiles').doc(userId);
    const STREAK_RECOVERY_COST = 20; // Giả sử tốn 20 Sao Vàng
    const currentMonth = new Date().toISOString().substring(0, 7); // Format: 'YYYY-MM'

    await db.runTransaction(async (transaction) => {
      const profileDoc = await transaction.get(profileRef);
      if (!profileDoc.exists) throw new Error('User profile not found.');

      const data = profileDoc.data()!;

      // 1. Kiểm tra số dư Sao Vàng
      if ((data.sao_vang || 0) < STREAK_RECOVERY_COST) {
        throw new Error('Bạn không đủ Sao Vàng để khôi phục chuỗi!');
      }

      // 2. Kiểm tra giới hạn 2 lần/tháng
      let count = data.streak_recovery_count || 0;
      const month = data.streak_recovery_month || '';

      if (month !== currentMonth) {
        // Reset nếu sang tháng mới
        count = 0;
      }

      if (count >= 2) {
        throw new Error('Bạn đã hết lượt khôi phục chuỗi trong tháng này (Tối đa 2 lần/tháng).');
      }

      // 3. Thực thi trừ tiền, tăng lượt và khôi phục
      transaction.update(profileRef, {
        sao_vang: data.sao_vang - STREAK_RECOVERY_COST,
        streak_recovery_count: count + 1,
        streak_recovery_month: currentMonth,
        // (Logic khôi phục streak: Phụ thuộc vào việc lưu previous_streak. Xin ví dụ mô phỏng +1 để nối tiếp)
        streak: (data.streak || 0) + 1
      });

      // 4. Ghi Log
      const logRef = db.collection('transaction_log').doc();
      transaction.set(logRef, {
        user_id: userId,
        amount: -STREAK_RECOVERY_COST,
        currency: 'sao_vang',
        type: 'streak_recovery',
        created_at: new Date().toISOString()
      });
    });

    return true;
  }
}
