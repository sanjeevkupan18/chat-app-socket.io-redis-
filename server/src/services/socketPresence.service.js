// import redisClient from "../config/redis.js";

// /*
//  * ============================================================
//  * REDIS KEY HELPERS
//  * ============================================================
//  */

// /*
//  * Key containing all socket IDs belonging
//  * to a particular user.
//  *
//  * Example:
//  *
//  * user:64abc123:sockets
//  */

// const getUserSocketKey = (userId) => {
//   return `user:${userId}:sockets`;
// };

// /*
//  * Redis Set containing all currently
//  * online users.
//  *
//  * Example:
//  *
//  * online:users
//  *
//  *   userA
//  *   userB
//  *   userC
//  */

// const ONLINE_USERS_KEY = "online:users";

// /*
//  * ============================================================
//  * ADD SOCKET
//  * ============================================================
//  */

// export const addUserSocket = async (userId, socketId) => {
//   const socketKey = getUserSocketKey(userId);

//   /*
//    * Check how many sockets the user
//    * currently has.
//    */

//   const existingSocketCount = await redisClient.sCard(socketKey);

//   /*
//    * Add current socket.
//    */

//   await redisClient.sAdd(socketKey, socketId);

//   /*
//    * Add user to online users.
//    *
//    * Even if the user already exists,
//    * Redis Set prevents duplicates.
//    */

//   await redisClient.sAdd(ONLINE_USERS_KEY, userId);

//   return {
//     existingSocketCount,
//     socketCount: existingSocketCount + 1,
//   };
// };

// /*
//  * ============================================================
//  * REMOVE SOCKET
//  * ============================================================
//  */

// export const removeUserSocket = async (userId, socketId) => {
//   const socketKey = getUserSocketKey(userId);

//   /*
//    * Remove this socket.
//    */

//   await redisClient.sRem(socketKey, socketId);

//   /*
//    * Check remaining sockets.
//    */

//   const remainingSockets = await redisClient.sCard(socketKey);

//   /*
//    * If no sockets remain,
//    * user is completely offline.
//    */

//   if (remainingSockets === 0) {
//     /*
//      * Remove empty socket key.
//      */

//     await redisClient.del(socketKey);

//     /*
//      * Remove user from online users.
//      */

//     await redisClient.sRem(ONLINE_USERS_KEY, userId);
//   }

//   return remainingSockets;
// };

// /*
//  * ============================================================
//  * GET USER SOCKETS
//  * ============================================================
//  */

// export const getUserSockets = async (userId) => {
//   const socketKey = getUserSocketKey(userId);

//   return await redisClient.sMembers(socketKey);
// };

// /*
//  * ============================================================
//  * CHECK USER ONLINE
//  * ============================================================
//  */

// export const isUserOnline = async (userId) => {
//   return await redisClient.sIsMember(ONLINE_USERS_KEY, userId);
// };

// /*
//  * ============================================================
//  * GET ALL ONLINE USERS
//  * ============================================================
//  */

// export const getOnlineUsers = async () => {
//   return await redisClient.sMembers(ONLINE_USERS_KEY);
// };

import redisClient from "../config/redis.js";

/*
 * ============================================================
 * REDIS KEY HELPERS
 * ============================================================
 */

/*
 * Redis Set containing all socket IDs
 * belonging to a particular user.
 *
 * Example:
 *
 * user:64abc123:sockets
 *
 *    socketA
 *    socketB
 *    socketC
 */

const getUserSocketKey = (userId) => {
  return `user:${userId}:sockets`;
};

/*
 * Redis Set containing all currently
 * online users.
 *
 * Example:
 *
 * online:users
 *
 *    userA
 *    userB
 *    userC
 */

const ONLINE_USERS_KEY = "online:users";

/*
 * ============================================================
 * ADD SOCKET
 * ============================================================
 */

export const addUserSocket = async (userId, socketId) => {
  const socketKey = getUserSocketKey(userId);

  /*
   * Get existing socket count
   * BEFORE adding the new socket.
   */

  const existingSocketCount = await redisClient.sCard(socketKey);

  /*
   * Add socket ID to user's Redis Set.
   *
   * Redis Set automatically prevents
   * duplicate socket IDs.
   */

  await redisClient.sAdd(socketKey, socketId);

  /*
   * Add user to global online users Set.
   *
   * Example:
   *
   * online:users
   *      ├── userA
   *      ├── userB
   *      └── userC
   */

  await redisClient.sAdd(ONLINE_USERS_KEY, userId);

  /*
   * Get the latest socket count.
   */

  const socketCount = await redisClient.sCard(socketKey);

  return {
    existingSocketCount,
    socketCount,
  };
};

/*
 * ============================================================
 * REMOVE SOCKET
 * ============================================================
 */

export const removeUserSocket = async (userId, socketId) => {
  const socketKey = getUserSocketKey(userId);

  /*
   * Remove disconnected socket.
   */

  await redisClient.sRem(socketKey, socketId);

  /*
   * Check how many sockets
   * are still active.
   */

  const remainingSockets = await redisClient.sCard(socketKey);

  /*
   * If there are no sockets left,
   * the user is completely offline.
   */

  if (remainingSockets === 0) {
    /*
     * Delete empty socket Set.
     */

    await redisClient.del(socketKey);

    /*
     * Remove user from global
     * online users Set.
     */

    await redisClient.sRem(ONLINE_USERS_KEY, userId);
  }

  return remainingSockets;
};

/*
 * ============================================================
 * GET USER SOCKETS
 * ============================================================
 *
 * This function is important for
 * real-time message routing.
 *
 * Example:
 *
 * getUserSockets("user123")
 *
 * returns:
 *
 * [
 *   "socketABC",
 *   "socketXYZ"
 * ]
 */

export const getUserSockets = async (userId) => {
  const socketKey = getUserSocketKey(userId);

  return await redisClient.sMembers(socketKey);
};

/*
 * ============================================================
 * CHECK USER ONLINE
 * ============================================================
 */

export const isUserOnline = async (userId) => {
  return await redisClient.sIsMember(ONLINE_USERS_KEY, userId);
};

/*
 * ============================================================
 * GET ALL ONLINE USERS
 * ============================================================
 */

export const getOnlineUsers = async () => {
  return await redisClient.sMembers(ONLINE_USERS_KEY);
};