import { UserRepository } from '@/repositories/UserRepository';

export class UserService {
    constructor(private readonly userRepository: UserRepository) { }

    async getProfile(uid: string) {
        return this.userRepository.getProfile(uid);
    }

    async updateProfile(uid: string, data: any) {
        return this.userRepository.updateProfile(uid, data);
    }

    /**
     * Tính toán Level User theo Rule-based (If-Else) từ kết quả khảo sát
     */
    async processSurvey(uid: string, surveyData: { purpose: string; platform_experience: string; time_commitment: number }) {
        let level = 'A1'; // Default
        let path = ['vocabulary_basics', 'grammar_intro']; // Default Path

        // Logic Rule-based MVP
        if (surveyData.platform_experience === 'high' || surveyData.time_commitment >= 30) {
            if (surveyData.purpose === 'communication') {
                level = 'A2';
                path = ['pronunciation_focus', 'listening_advanced'];
            } else {
                level = 'A2';
                path = ['grammar_advanced', 'reading_folklore'];
            }
        }

        if (surveyData.purpose === 'research' && surveyData.platform_experience === 'expert') {
            level = 'B';
            path = ['literature_reading', 'ai_conversation'];
        }

        return this.userRepository.updateLevelAndPath(uid, level, path);
    }
}
