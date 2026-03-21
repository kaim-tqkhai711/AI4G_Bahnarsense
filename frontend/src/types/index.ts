export type UserState = {
    id: string;
    name: string;
    level?: string;
    xp: number;
    sao_vang: number; // Tên mới theo backend
    gems: number;  // Premium Currency
    streak: number;
    inventory: string[]; // Kho đồ đã mua
    equippedItems: {
        skin?: string;
        clothes?: string;
        hair?: string;
        accessory?: string;
    }; // Object theo backend
    completedLessons: string[]; // IDs of completed lessons
    isGuest?: boolean;
};

export type LessonType = 'vocab' | 'grammar' | 'pronunciation' | 'vocabulary' | 'alphabet';

export type Lesson = {
    id: string;
    topic: string;
    difficulty: number;
    type: LessonType;
    status?: 'locked' | 'active' | 'done';
};

export type Mistake = {
    id: string;
    item_id?: string;
    word: string;
    meaning: string;
    errorCount: number;
    lesson_type?: string;
    content?: any;
    description?: string;
    correct_answer?: string;
};
