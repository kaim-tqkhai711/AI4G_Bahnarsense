import { app } from './app';
import { config } from '@/config/unifiedConfig';
import http from 'http';
import { Server } from 'socket.io';
import { setupCommunitySocket } from '@/sockets/communitySocket';

const startServer = async () => {
    try {
        // Init Native HTTP Server for Websocket support
        const httpServer = http.createServer(app);

        // Bind Socket.io to HTTP Server
        const io = new Server(httpServer, {
            cors: {
                origin: "*", // allow all config for MVP
                methods: ["GET", "POST"]
            }
        });

        // Khởi chạy các WS Handlers
        setupCommunitySocket(io);

        // Start listening
        const PORT = config.port;
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server + WS running on http://localhost:${PORT} in ${config.env} mode.`);
            console.log(`🛡️  Architecture Mode: BFRI Strict`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
