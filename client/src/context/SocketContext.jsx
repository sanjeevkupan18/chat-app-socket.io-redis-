// import { createContext, useContext, useEffect, useState } from "react";

// import { io } from "socket.io-client";

// import { useAuth } from "./AuthContext";

// const SocketContext = createContext(null);

// export const SocketProvider = ({ children }) => {
//   const { user } = useAuth();

//   const [socket, setSocket] = useState(null);

//   const [isConnected, setIsConnected] = useState(false);

//   useEffect(() => {
//     if (!user) {
//       setSocket(null);
//       setIsConnected(false);

//       return;
//     }

//     const token = localStorage.getItem("token");

//     if (!token) {
//       return;
//     }

//     const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
//       auth: {
//         token,
//       },

//       transports: ["websocket", "polling"],
//     });

//     newSocket.on("connect", () => {
//       console.log("Socket connected:", newSocket.id);

//       setIsConnected(true);
//     });

//     newSocket.on("disconnect", () => {
//       console.log("Socket disconnected");

//       setIsConnected(false);
//     });

//     newSocket.on("connect_error", (error) => {
//       console.error("Socket connection error:", error.message);

//       setIsConnected(false);
//     });

//     setSocket(newSocket);

//     return () => {
//       newSocket.disconnect();
//     };
//   }, [user]);

//   return (
//     <SocketContext.Provider
//       value={{
//         socket,
//         isConnected,
//       }}
//     >
//       {children}
//     </SocketContext.Provider>
//   );
// };

// export const useSocket = () => {
//   const context = useContext(SocketContext);

//   if (!context) {
//     throw new Error("useSocket must be used inside SocketProvider");
//   }

//   return context;
// };

// import { createContext, useContext, useEffect, useState } from "react";

// import { io } from "socket.io-client";

// import { useAuth } from "./AuthContext";

// const SocketContext = createContext(null);

// export const SocketProvider = ({ children }) => {
//   const { user, loading } = useAuth();

//   const [socket, setSocket] = useState(null);

//   const [isConnected, setIsConnected] = useState(false);

//   /*
//    * SOCKET CONNECTION
//    */

//   useEffect(() => {
//     /*
//      * WAIT FOR AUTH INITIALIZATION
//      */

//     if (loading) {
//       console.log("Auth is still loading...");

//       return;
//     }

//     /*
//      * USER NOT LOGGED IN
//      */

//     if (!user?._id) {
//       console.log("No authenticated user. Socket will not connect.");

//       setSocket(null);

//       setIsConnected(false);

//       return;
//     }

//     /*
//      * GET JWT TOKEN
//      */

//     const token = localStorage.getItem("token");

//     if (!token) {
//       console.log("No token found. Socket will not connect.");

//       setSocket(null);

//       setIsConnected(false);

//       return;
//     }

//     /*
//      * CREATE SOCKET
//      */

//     console.log("Creating socket for user:", user._id);

//     const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
//       auth: {
//         token,
//       },

//       transports: ["websocket", "polling"],
//     });

//     /*
//      * SOCKET CONNECT
//      */

//     newSocket.on("connect", () => {
//       console.log("Socket connected:", newSocket.id);

//       setIsConnected(true);
//     });

//     /*
//      * SOCKET DISCONNECT
//      */

//     newSocket.on("disconnect", (reason) => {
//       console.log("Socket disconnected:", newSocket.id, reason);

//       setIsConnected(false);
//     });

//     /*
//      * SOCKET CONNECTION ERROR
//      */

//     newSocket.on("connect_error", (error) => {
//       console.error("Socket connection error:", error.message);

//       setIsConnected(false);
//     });

//     /*
//      * SAVE SOCKET INSTANCE
//      */

//     setSocket(newSocket);

//     /*
//      * CLEANUP
//      */

//     return () => {
//       console.log("Cleaning socket:", newSocket.id);

//       /*
//        * Remove all socket listeners
//        */

//       newSocket.removeAllListeners();

//       /*
//        * Disconnect socket
//        */

//       newSocket.disconnect();

//       /*
//        * Clear React state
//        */

//       setSocket(null);

//       setIsConnected(false);
//     };
//   }, [loading, user?._id]);

//   return (
//     <SocketContext.Provider
//       value={{
//         socket,
//         isConnected,
//       }}
//     >
//       {children}
//     </SocketContext.Provider>
//   );
// };

// export const useSocket = () => {
//   const context = useContext(SocketContext);

//   if (!context) {
//     throw new Error("useSocket must be used inside SocketProvider");
//   }

//   return context;
// };

import { createContext, useContext, useEffect, useState } from "react";

import { io } from "socket.io-client";

import { useAuth } from "./AuthContext";
import { SOCKET_URL } from "../config/endpoints";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);

  const [isConnected, setIsConnected] = useState(false);

  /*
   * Store currently online users.
   *
   * Example:
   *
   * [
   *   "userId1",
   *   "userId2"
   * ]
   */

  const [onlineUsers, setOnlineUsers] = useState([]);

  /*
   * ============================================================
   * CREATE SOCKET CONNECTION
   * ============================================================
   */

  useEffect(() => {
    /*
     * No authenticated user
     */

    if (!user) {
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);

      return;
    }

    /*
     * Get JWT token
     */

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    console.log("Creating socket for user:", user._id);

    /*
     * ==========================================================
     * CREATE SOCKET
     * ==========================================================
     */

    const newSocket = io(SOCKET_URL, {
      auth: {
        token,
      },

      transports: ["websocket", "polling"],
    });

    /*
     * ==========================================================
     * CONNECT
     * ==========================================================
     */

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);

      setIsConnected(true);
      /*

   * Ask backend for all currently

   * online users.

   */
  

      newSocket.emit("getOnlineUsers");
    });

    newSocket.on("onlineUsers", (userIds) => {
      console.log("Currently online users:", userIds);

      setOnlineUsers(userIds);
    });

    /*
     * ==========================================================
     * DISCONNECT
     * ==========================================================
     */

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");

      setIsConnected(false);
    });

    /*
     * ==========================================================
     * CONNECTION ERROR
     * ==========================================================
     */

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);

      setIsConnected(false);
    });

    /*
     * ==========================================================
     * USER ONLINE
     * ==========================================================
     */

    newSocket.on("userOnline", ({ userId }) => {
      console.log("User online:", userId);

      setOnlineUsers((previous) => {
        /*
         * Prevent duplicate IDs.
         */

        if (previous.includes(userId)) {
          return previous;
        }

        return [...previous, userId];
      });
    });

    /*
     * ==========================================================
     * USER OFFLINE
     * ==========================================================
     */

    newSocket.on("userOffline", ({ userId }) => {
      console.log("User offline:", userId);

      setOnlineUsers((previous) => previous.filter((id) => id !== userId));
    });

    /*
     * ==========================================================
     * SAVE SOCKET
     * ==========================================================
     */

    setSocket(newSocket);

    /*
     * ==========================================================
     * CLEANUP
     * ==========================================================
     */

    return () => {
      console.log("Cleaning socket for user:", user._id);

      newSocket.removeAllListeners();

      newSocket.disconnect();

      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  /*
   * ============================================================
   * CONTEXT
   * ============================================================
   */

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

/*
 * ==============================================================
 * USE SOCKET
 * ==============================================================
 */

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
};
