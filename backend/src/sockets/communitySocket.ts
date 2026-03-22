import { Server, Socket } from 'socket.io';
import { supabase } from '@/utils/supabaseAdmin';

const connectedUsers = new Map<string, string>();
const activeRooms = new Map<string, {
    participants: string[],
    scores: Record<string, { points: number, completionTime: number, finished: boolean }>,
    startTime: number,
    wager: number,
    matchId?: string
}>();

export const setupCommunitySocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`[WS] Client đã kết nối: ${socket.id}`);

        socket.on('authenticate', (data: { user_id: string }) => {
            if (data.user_id) {
                socket.data.user_id = data.user_id;
                connectedUsers.set(data.user_id, socket.id);
                console.log(`[WS] Auth match: User ${data.user_id} - Socket ${socket.id}`);
            }
        });

        socket.on('disconnect', async () => {
            console.log(`[WS] Client ngắt kết nối: ${socket.id}`);
            const disconnectedUserId = socket.data?.user_id;
            
            for (const [userId, sockId] of connectedUsers.entries()) {
                if (sockId === socket.id) {
                    connectedUsers.delete(userId);
                    break;
                }
            }

            if (disconnectedUserId) {
                for (const [roomId, room] of activeRooms.entries()) {
                    if (room.participants.includes(disconnectedUserId) && !room.scores[disconnectedUserId]?.finished) {
                        const winnerId = room.participants.find(p => p !== disconnectedUserId);
                        
                        if (winnerId) {
                            try {
                                // Reward winner with 2x wager (with fallback in case win_count column missing)
                                try {
                                    const { data: profile } = await supabase.from('profiles').select('sao_vang, win_count').eq('id', winnerId).single();
                                    if (profile) {
                                        const sao = Number(profile.sao_vang ?? 0) + (Number(room.wager) * 2);
                                        const updatePayload: any = { sao_vang: sao };
                                        if (profile.win_count !== undefined) {
                                            updatePayload.win_count = Number(profile.win_count ?? 0) + 1;
                                        }
                                        await supabase.from('profiles').update(updatePayload).eq('id', winnerId);
                                    }
                                } catch (dbError) {
                                    console.error('[Disconnect] Lỗi update profile, fallback sao_vang only:', dbError);
                                    const { data: pSafe } = await supabase.from('profiles').select('sao_vang').eq('id', winnerId).single();
                                    if (pSafe) {
                                        const sao = Number(pSafe.sao_vang ?? 0) + (Number(room.wager) * 2);
                                        await supabase.from('profiles').update({ sao_vang: sao }).eq('id', winnerId);
                                    }
                                }

                                if (room.matchId) {
                                    await supabase.from('matches').update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() }).eq('id', room.matchId);
                                }

                                io.to(roomId).emit('match_end', {
                                    winner_id: winnerId,
                                    final_scores: room.scores,
                                    message: "Đối thủ đã ngắt kết nối cuộc thi! Bạn được xử thắng."
                                });
                                
                                activeRooms.delete(roomId);
                            } catch (e) {
                                console.error('Lỗi khi xử lý disconnect forfeit:', e);
                            }
                        }
                    }
                }
            }
        });

        socket.on('send_challenge', async (payload: { user_a_id: string, target_user_id: string, wager: number }) => {
            const targetSocket = connectedUsers.get(payload.target_user_id);
            if (targetSocket) {
                if (payload.wager < 50) {
                    return socket.emit('challenge_failed', { message: 'Cược tối thiểu là 50 Sao Vàng.' });
                }
                try {
                    const { data: userA } = await supabase.from('profiles').select('level, sao_vang').eq('id', payload.user_a_id).single();
                    if (!userA || Number(userA.sao_vang || 0) < payload.wager) {
                        return socket.emit('challenge_failed', { message: 'Bạn không đủ Sao Vàng.' });
                    }

                    const { data: target } = await supabase.from('profiles').select('level').eq('id', payload.target_user_id).single();

                    const levelA = (userA as { level?: string } | null)?.level || 'A1';
                    const levelB = (target as { level?: string } | null)?.level || 'A1';

                    if (levelA === levelB) {
                        io.to(targetSocket).emit('receive_challenge', { from_user: payload.user_a_id, wager: payload.wager });
                    } else {
                        socket.emit('challenge_failed', { message: `Trình độ chênh lệch. Bạn là ${levelA}, Đối thủ là ${levelB}.` });
                    }
                } catch (error) {
                    socket.emit('challenge_failed', { message: "Lỗi hệ thống khi Matchmaking." });
                }
            } else {
                socket.emit('challenge_failed', { message: "Đối thủ đã offline." });
            }
        });

        socket.on('accept_challenge', async (payload: { user_b_id: string, user_a_id: string, wager: number }) => {
            try {
                const { user_a_id, user_b_id, wager } = payload;
                if (wager < 50) return socket.emit('challenge_failed', { message: 'Cược tối thiểu 50 sao.'});
                
                // Check balance
                const { data: users } = await supabase.from('profiles').select('id, sao_vang').in('id', [user_a_id, user_b_id]);
                const uA = users?.find(u => u.id === user_a_id);
                const uB = users?.find(u => u.id === user_b_id);
                if (!uA || !uB || Number(uA.sao_vang || 0) < wager || Number(uB.sao_vang || 0) < wager) {
                    return socket.emit('challenge_failed', { message: 'Một trong hai người không đủ sao vàng.'});
                }

                // Deduct wager
                await supabase.from('profiles').update({ sao_vang: Number(uA.sao_vang || 0) - wager }).eq('id', user_a_id);
                await supabase.from('profiles').update({ sao_vang: Number(uB.sao_vang || 0) - wager }).eq('id', user_b_id);

                // Create match record
                const { data: matchObj } = await supabase.from('matches').insert({
                    host_id: user_a_id,
                    guest_id: user_b_id,
                    wager_amount: wager,
                    status: 'playing'
                }).select('id').single();

                const matchId = matchObj?.id;
                const room_id = `room_${matchId || Date.now()}_${user_a_id}_${user_b_id}`;
                const sockA = connectedUsers.get(user_a_id);
                const sockB = connectedUsers.get(user_b_id);

                if (sockA && sockB) {
                    const sA = io.sockets.sockets.get(sockA);
                    const sB = io.sockets.sockets.get(sockB);

                    if (sA) sA.join(room_id);
                    if (sB) sB.join(room_id);

                    activeRooms.set(room_id, {
                        participants: [user_a_id, user_b_id],
                        scores: {
                            [user_a_id]: { points: 0, completionTime: 0, finished: false },
                            [user_b_id]: { points: 0, completionTime: 0, finished: false }
                        },
                        startTime: Date.now() + 3000,
                        wager: wager,
                        matchId: matchId
                    });

                    // Find intersection sets
                    const { data: progA } = await supabase.from('user_progress').select('lesson_id').eq('user_id', user_a_id);
                    const { data: progB } = await supabase.from('user_progress').select('lesson_id').eq('user_id', user_b_id);
                    
                    const setA = new Set((progA || []).map(p => p.lesson_id));
                    const intersect = (progB || []).map(p => p.lesson_id).filter(id => setA.has(id));

                    let questions: any[] = [];
                    if (intersect.length > 0) {
                        const { data: lessons } = await supabase.from('lessons').select('content, type, correct_answer').in('lesson_id', intersect).limit(20);
                        (lessons || []).forEach(l => {
                            const content = typeof l.content === 'string' ? JSON.parse(l.content) : l.content;
                            if (l.type === 'vocabulary' || l.type === 'grammar') {
                                let textCorrect = l.correct_answer || content.correctAnswer || "A";
                                const label = typeof textCorrect === 'string' ? textCorrect.trim().toUpperCase() : '';
                                if (['A', 'B', 'C', 'D'].includes(label)) {
                                    if (content.options) {
                                        if (Array.isArray(content.options)) {
                                            const idx = label.charCodeAt(0) - 65;
                                            if (content.options[idx]) textCorrect = content.options[idx];
                                        } else if (typeof content.options === 'object') {
                                            if (content.options[label]) {
                                                textCorrect = content.options[label];
                                            } else {
                                                const vals = Object.values(content.options);
                                                const idx = label.charCodeAt(0) - 65;
                                                if (vals[idx]) textCorrect = vals[idx] as string;
                                            }
                                        }
                                    }
                                }
                                questions.push({ 
                                    type: l.type, 
                                    data: content.question || content.word || content.structure || "Câu hỏi lỗi", 
                                    content,
                                    correct_answer: textCorrect
                                });
                            }
                        });
                    }

                    if (questions.length < 5) {
                        try {
                            const { data: randLessons } = await supabase.from('lessons').select('content, type, correct_answer').in('type', ['vocabulary', 'grammar']).limit(20);
                            let fallbackQuestions: any[] = [];
                            (randLessons || []).forEach(l => {
                                const content = typeof l.content === 'string' ? JSON.parse(l.content) : l.content;
                                let textCorrect = l.correct_answer || content.correctAnswer || "A";
                                const label = typeof textCorrect === 'string' ? textCorrect.trim().toUpperCase() : '';
                                if (['A', 'B', 'C', 'D'].includes(label)) {
                                    if (content.options) {
                                        if (Array.isArray(content.options)) {
                                            const idx = label.charCodeAt(0) - 65;
                                            if (content.options[idx]) textCorrect = content.options[idx];
                                        } else if (typeof content.options === 'object') {
                                            if (content.options[label]) {
                                                textCorrect = content.options[label];
                                            } else {
                                                const vals = Object.values(content.options);
                                                const idx = label.charCodeAt(0) - 65;
                                                if (vals[idx]) textCorrect = vals[idx] as string;
                                            }
                                        }
                                    }
                                }
                                fallbackQuestions.push({ 
                                    type: l.type, 
                                    data: content.question || content.word || content.structure || "Câu hỏi lỗi", 
                                    content,
                                    correct_answer: textCorrect
                                });
                            });
                            questions = fallbackQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
                            
                            if (questions.length === 0) throw new Error("Fallback DB empty");
                        } catch (e) {
                            questions = [
                                { type: 'vocab', data: "Tìm từ nối...", content: { options: ["A", "B", "C", "D"] }, correct_answer: "A" },
                                { type: 'grammar', data: "Điền vào...", content: { options: ["A", "B", "C", "D"] }, correct_answer: "B" },
                                { type: 'vocab', data: "Dịch câu...", content: { options: ["A", "B", "C", "D"] }, correct_answer: "C" },
                                { type: 'vocab', data: "Từ đồng nghĩa...", content: { options: ["A", "B", "C", "D"] }, correct_answer: "D" },
                                { type: 'grammar', data: "Chia động từ...", content: { options: ["A", "B", "C", "D"] }, correct_answer: "A" }
                            ];
                        }
                    }
                    questions = questions.sort(() => 0.5 - Math.random()).slice(0, 10);

                    io.to(room_id).emit('match_start', {
                        room_id,
                        countdown: 3,
                        questions: questions
                    });
                }
            } catch (error) {
                console.error('Accept challenge error:', error);
                socket.emit('challenge_failed', { message: "Lỗi hệ thống khi tải trận đấu." });
            }
        });

        socket.on('submit_answer', (payload: { room_id: string, user_id: string, is_correct: boolean, timestamp: number }) => {
            const roomNode = activeRooms.get(payload.room_id);
            if (!roomNode) return;
            socket.to(payload.room_id).emit('opponent_progress', { user_id: payload.user_id, correct: payload.is_correct });
        });

        socket.on('match_result', async (payload: { room_id: string, user_id: string, total_points: number, timestamp: number }) => {
            const roomNode = activeRooms.get(payload.room_id);
            if (!roomNode) return;

            roomNode.scores[payload.user_id] = {
                points: payload.total_points,
                completionTime: Date.now() - roomNode.startTime,
                finished: true
            };

            const players = Object.keys(roomNode.scores);
            const p1 = roomNode.scores[players[0]];
            const p2 = roomNode.scores[players[1]];

            if (p1.finished && p2.finished) {
                let winnerId: string | null = null;
                const userA = players[0];
                const userB = players[1];

                if (p1.points > p2.points) {
                    winnerId = userA;
                } else if (p2.points > p1.points) {
                    winnerId = userB;
                } else {
                    if (p1.completionTime < p2.completionTime) winnerId = userA;
                    else if (p2.completionTime < p1.completionTime) winnerId = userB;
                }

                try {
                    if (winnerId) {
                        try {
                            const { data: profile } = await supabase.from('profiles').select('sao_vang, win_count').eq('id', winnerId).single();
                            if (profile) {
                                const sao = Number(profile.sao_vang ?? 0) + (Number(roomNode.wager) * 2);
                                const updatePayload: any = { sao_vang: sao };
                                if (profile.win_count !== undefined) {
                                    updatePayload.win_count = Number(profile.win_count ?? 0) + 1;
                                }
                                await supabase.from('profiles').update(updatePayload).eq('id', winnerId);
                            }
                        } catch (dbError) {
                            try {
                                const { data: pSafe } = await supabase.from('profiles').select('sao_vang').eq('id', winnerId).single();
                                if (pSafe) {
                                    const sao = Number(pSafe.sao_vang ?? 0) + (Number(roomNode.wager) * 2);
                                    await supabase.from('profiles').update({ sao_vang: sao }).eq('id', winnerId);
                                }
                            } catch (e2) {}
                        }
                        if (roomNode.matchId) {
                            await supabase.from('matches').update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() }).eq('id', roomNode.matchId);
                        }
                    } else {
                        // Draw: refund to both
                        const { data: users } = await supabase.from('profiles').select('id, sao_vang').in('id', [userA, userB]);
                        for (const u of (users || [])) {
                            await supabase.from('profiles').update({ sao_vang: Number(u.sao_vang || 0) + Number(roomNode.wager) }).eq('id', u.id);
                        }
                        if (roomNode.matchId) {
                            await supabase.from('matches').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', roomNode.matchId);
                        }
                    }
                } catch (e) {
                    console.error('Lỗi khi cấp phần thưởng:', e);
                }

                io.to(payload.room_id).emit('match_end', {
                    winner_id: winnerId,
                    final_scores: roomNode.scores,
                    message: winnerId ? "Đã trao thưởng cho người thắng!" : "Trận hòa! Hoàn cược cho cả 2."
                });

                activeRooms.delete(payload.room_id);
            }
        });
    });
};
