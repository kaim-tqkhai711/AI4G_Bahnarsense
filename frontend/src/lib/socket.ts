import { io } from 'socket.io-client';

// Kết nối tới Backend Server (Port 8000 đã setup)
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
    autoConnect: false, // Chỉ kết nối khi vào phòng
    reconnection: true,
});
