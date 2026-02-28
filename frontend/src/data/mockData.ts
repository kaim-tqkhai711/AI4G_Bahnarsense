import { UserState, Lesson, Mistake } from '../types';

export const MOCK_USER: UserState = {
    id: 'user-1',
    name: 'Học sinh Ba Na',
    xp: 1250,
    sao_vang: 450,
    gems: 25,
    streak: 5,
    inventory: ['item_hat_1', 'item_glasses_1'],
    equippedItems: { accessory: 'item_hat_1' },
    completedLessons: ['l-1', 'l-2'],
    isGuest: true,
};

export const MOCK_LESSONS: Lesson[] = [
    { id: 'l-1', topic: 'Chào hỏi', difficulty: 1, type: 'vocab' },
    { id: 'l-2', topic: 'Số đếm từ 1-10', difficulty: 1, type: 'vocab' },
    { id: 'l-3', topic: 'Gia đình', difficulty: 2, type: 'vocab' },
    { id: 'l-4', topic: 'Câu khẳng định', difficulty: 2, type: 'grammar' },
    { id: 'l-5', topic: 'Động vật', difficulty: 3, type: 'vocab' },
    { id: 'l-6', topic: 'Ăn uống', difficulty: 3, type: 'grammar' },
];

export const MOCK_MISTAKES: Mistake[] = [
    { id: 'm-1', word: 'Nhươ', meaning: 'Nhà', errorCount: 3 },
    { id: 'm-2', word: 'Pơlei', meaning: 'Làng', errorCount: 2 },
    { id: 'm-3', word: 'Đak', meaning: 'Nước', errorCount: 1 },
];
