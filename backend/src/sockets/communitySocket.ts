import { Server, Socket } from 'socket.io';
import { db } from '@/utils/firebaseAdmin';
import * as admin from 'firebase-admin';

// Map để lưu trữ user_id --> socket_id (Hỗ trợ 1-1 session)
const connectedUsers = new Map<string, string>();
const activeRooms = new Map<string, {
    participants: string[],
    scores: Record<string, { points: number, completionTime: number, finished: boolean }>,
    startTime: number
}>();

export const setupCommunitySocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`[WS] Client đã kết nối: ${socket.id}`);

        // Tạm coi user gửi uid lúc connect qua handshake auth, hoặc trigger qua event
        socket.on('authenticate', (data: { user_id: string }) => {
            if (data.user_id) {
                connectedUsers.set(data.user_id, socket.id);
                console.log(`[WS] Auth match: User ${data.user_id} - Socket ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[WS] Client ngắt kết nối: ${socket.id}`);
            // Xóa khỏi danh sách theo value
            for (const [userId, sockId] of connectedUsers.entries()) {
                if (sockId === socket.id) {
                    connectedUsers.delete(userId);
                    break;
                }
            }
        });

        // ==========================================
        // 1. NHÓM EVENT: CHUẨN BỊ VÀ MATCHMAKING
        // ==========================================
        socket.on('send_challenge', async (payload: { user_a_id: string, target_user_id: string }) => {
            const targetSocket = connectedUsers.get(payload.target_user_id);
            if (targetSocket) {
                try {
                    // Check Trình độ (Level) từ Database Firestore
                    const userADoc = await db.collection('profiles').doc(payload.user_a_id).get();
                    const targetDoc = await db.collection('profiles').doc(payload.target_user_id).get();

                    const levelA = userADoc.data()?.level;
                    const levelB = targetDoc.data()?.level;

                    if (levelA && levelB && levelA === levelB) {
                        // Bắn popup lời mời cho B nếu cùng Level
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

        // ==========================================
        // 2. NHÓM EVENT: TRONG TRẬN ĐẤU
        // ==========================================
        socket.on('accept_challenge', (payload: { user_b_id: string, user_a_id: string }) => {
            const room_id = `room_${Date.now()}_${payload.user_a_id}_${payload.user_b_id}`;
            const sockA = connectedUsers.get(payload.user_a_id);
            const sockB = connectedUsers.get(payload.user_b_id);

            if (sockA && sockB) {
                const sA = io.sockets.sockets.get(sockA);
                const sB = io.sockets.sockets.get(sockB);

                if (sA) sA.join(room_id);
                if (sB) sB.join(room_id);

                // Khởi tạo trạng thái phòng chờ
                activeRooms.set(room_id, {
                    participants: [payload.user_a_id, payload.user_b_id],
                    scores: {
                        [payload.user_a_id]: { points: 0, completionTime: 0, finished: false },
                        [payload.user_b_id]: { points: 0, completionTime: 0, finished: false }
                    },
                    startTime: Date.now() + 3000 // Server cho 3s đếm ngược
                });

                // Random bộ câu hỏi
                const randomQuestions = [
                    { type: 'vocab', data: "Tìm từ nối..." },
                    { type: 'grammar', data: "Điền vào..." }
                    // Mở rộng dựa theo DB
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

            // Broadcast UI đối thủ tăng tiến trình
            socket.to(payload.room_id).emit('opponent_progress', { user_id: payload.user_id, correct: payload.is_correct });
        });

        // ==========================================
        // 3. NHÓM EVENT: KẾT THÚC & TRẢ THƯỞNG
        // ==========================================
        socket.on('match_result', async (payload: { room_id: string, user_id: string, total_points: number, timestamp: number }) => {
            const roomNode = activeRooms.get(payload.room_id);
            if (!roomNode) return;

            // Cập nhật record 
            roomNode.scores[payload.user_id] = {
                points: payload.total_points,
                completionTime: payload.timestamp - roomNode.startTime,
                finished: true
            };

            // Nếu cả 2 đều đã xong
            const players = Object.keys(roomNode.scores);
            const p1 = roomNode.scores[players[0]];
            const p2 = roomNode.scores[players[1]];

            if (p1.finished && p2.finished) {
                // Determine Winner
                let winnerId = null;

                if (p1.points > p2.points) {
                    winnerId = players[0];
                } else if (p2.points > p1.points) {
                    winnerId = players[1];
                } else {
                    // Cùng điểm -> So time
                    if (p1.completionTime < p2.completionTime) winnerId = players[0];
                    else if (p2.completionTime < p1.completionTime) winnerId = players[1];
                }

                // Cập nhật Database ngầm (Cộng vàng và win_count cho người thắng)
                if (winnerId) {
                    const winnerRef = db.collection('profiles').doc(winnerId);
                    await winnerRef.update({
                        sao_vang: admin.firestore.FieldValue.increment(50),
                        win_count: admin.firestore.FieldValue.increment(1)
                    });
                }

                // Trả kết quả + Băng rôn pháo sáng (Confetti flag)
                io.to(payload.room_id).emit('match_end', {
                    winner_id: winnerId,
                    final_scores: roomNode.scores,
                    message: "Thanh toán thành công / Cấp phần thưởng"
                });

                // Xóa room cache
                activeRooms.delete(payload.room_id);
            }
        });
    });
};
