import dotenv from 'dotenv';
dotenv.config();

import { LessonRepository } from '../repositories/LessonRepository';
import { LessonService } from '../services/LessonService';

async function testService() {
    const repo = new LessonRepository();
    const service = new LessonService(repo);
    console.log("Testing LessonService.getLessons...");
    try {
        const result = await service.getLessons("test-uid-fake-123");
        console.log(`Returned ${result.length} nodes:`);
        console.log(JSON.stringify(result, null, 2));

        console.log("Testing getLessonGroup for cd1_l1...");
        const group = await service.getLessonGroup("cd1_l1");
        console.log(`Group returned ${group.length} steps.`);
        if (group.length > 0) {
            console.log("First step:", JSON.stringify(group[0], null, 2));
        }
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testService().catch(console.error);
