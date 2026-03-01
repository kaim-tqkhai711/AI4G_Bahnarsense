import { Server, Socket } from 'socket.io';
import { supabase } from '@/utils/supabaseAdmin';

const connectedUsers = new Map<string, string>();
const activeRooms = new Map<string, {
    participants: string[],
    scores: Record<string, { points: number, completionTime: number, finished: boolean }>,
    startTime: number
}>();

export const setupCommunitySocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`[WS] Client đã kết nối: ${socket.id}`);

        socket.on('authenticate', (data: { user_id: string }) => {
            if (data.user_id) {
                connectedUsers.set(data.user_id, socket.id);
                console.log(`[WS] Auth match: User ${data.user_id} - Socket ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[WS] Client ngắt kết nối: ${socket.id}`);
            for (const [userId, sockId] of connectedUsers.entries()) {
                if (sockId === socket.id) {
                    connectedUsers.delete(userId);
                    break;
                }
            }
        });

        socket.on('send_challenge', async (payload: { user_a_id: string, target_user_id: string }) => {
            const targetSocket = connectedUsers.get(payload.target_user_id);
            if (targetSocket) {
                try {
                    const { data: userA } = await supabase.from('profiles').select('level').eq('id', payload.user_a_id).single();
                    const { data: target } = await supabase.from('profiles').select('level').eq('id', payload.target_user_id).single();

                    const levelA = (userA as { level?: string } | null)?.level;
                    const levelB = (target as { level?: string } | null)?.level;

                    if (levelA && levelB && levelA === levelB) {
                        io.to(targetSocket).emit('receive_challenge', { from_user: payload.user_a_id });
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

        socket.on('accept_challenge', (payload: { user_b_id: string, user_a_id: string }) => {
            const room_id = `room_${Date.now()}_${payload.user_a_id}_${payload.user_b_id}`;
            const sockA = connectedUsers.get(payload.user_a_id);
            const sockB = connectedUsers.get(payload.user_b_id);

            if (sockA && sockB) {
                const sA = io.sockets.sockets.get(sockA);
                const sB = io.sockets.sockets.get(sockB);

                if (sA) sA.join(room_id);
                if (sB) sB.join(room_id);

                activeRooms.set(room_id, {
                    participants: [payload.user_a_id, payload.user_b_id],
                    scores: {
                        [payload.user_a_id]: { points: 0, completionTime: 0, finished: false },
                        [payload.user_b_id]: { points: 0, completionTime: 0, finished: false }
                    },
                    startTime: Date.now() + 3000
                });

                const randomQuestions = [
                    { type: 'vocab', data: "Tìm từ nối..." },
                    { type: 'grammar', data: "Điền vào..." }
                ];

                io.to(room_id).emit('match_start', {
                    room_id,
                    countdown: 3,
                    questions: randomQuestions
                });
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
                completionTime: payload.timestamp - roomNode.startTime,
                finished: true
            };

            const players = Object.keys(roomNode.scores);
            const p1 = roomNode.scores[players[0]];
            const p2 = roomNode.scores[players[1]];

            if (p1.finished && p2.finished) {
                let winnerId: string | null = null;

                if (p1.points > p2.points) {
                    winnerId = players[0];
                } else if (p2.points > p1.points) {
                    winnerId = players[1];
                } else {
                    if (p1.completionTime < p2.completionTime) winnerId = players[0];
                    else if (p2.completionTime < p1.completionTime) winnerId = players[1];
                }

                if (winnerId) {
                    const { data: profile } = await supabase.from('profiles').select('sao_vang, win_count').eq('id', winnerId).single();
                    if (profile) {
                        const sao = ((profile as { sao_vang?: number }).sao_vang ?? 0) + 50;
                        const wins = ((profile as { win_count?: number }).win_count ?? 0) + 1;
                        await supabase.from('profiles').update({ sao_vang: sao, win_count: wins }).eq('id', winnerId);
                    }
                }

                io.to(payload.room_id).emit('match_end', {
                    winner_id: winnerId,
                    final_scores: roomNode.scores,
                    message: "Thanh toán thành công / Cấp phần thưởng"
                });

                activeRooms.delete(payload.room_id);
            }
        });
    });
};
