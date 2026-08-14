import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectRedis } from "./src/config/redis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

import http from "http";

import { Server } from "socket.io";

import app from "./src/app.js";

import connectDB from "./src/config/db.js";
import { getCorsOrigin } from "./src/config/origins.js";

import { setupSocket } from "./src/socket/socketHandler.js";
import config from "./src/config/config.js";

const PORT = config.PORT;

const startServer = async () => {
  try {
    /*
     * CONNECT DATABASE
     */

    await connectDB();

    // CONNECT REDIS
    
    await connectRedis();

    /*
     * CREATE HTTP SERVER
     */

    const httpServer = http.createServer(app);

    /*
     * CREATE SOCKET.IO SERVER
     */

    const io = new Server(httpServer, {
      cors: {
        origin: getCorsOrigin(),

        methods: ["GET", "POST"],

        credentials: true,
      },
    });

    /*
     * INITIALIZE SOCKET
     */

    setupSocket(io);

    /*
     * START SERVER
     */

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);

    process.exit(1);
  }
};

startServer();
