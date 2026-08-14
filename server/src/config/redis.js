import { createClient } from "redis";

const memoryStore = new Map();

let redisClient = null;
let redisReady = false;

const getSet = (key) => {
  if (!memoryStore.has(key)) {
    memoryStore.set(key, new Set());
  }

  return memoryStore.get(key);
};

const memoryAdapter = {
  async scard(key) {
    return getSet(key).size;
  },

  async sadd(key, ...members) {
    const set = getSet(key);
    let added = 0;

    members.flat().forEach((member) => {
      if (!set.has(member)) {
        set.add(member);
        added += 1;
      }
    });

    return added;
  },

  async srem(key, ...members) {
    const set = getSet(key);
    let removed = 0;

    members.flat().forEach((member) => {
      if (set.delete(member)) {
        removed += 1;
      }
    });

    return removed;
  },

  async smembers(key) {
    return [...getSet(key)];
  },

  async sismember(key, member) {
    return getSet(key).has(member) ? 1 : 0;
  },

  async del(key) {
    return memoryStore.delete(key) ? 1 : 0;
  },
};

const redisAdapter = {
  async scard(key) {
    return redisClient.sCard(key);
  },

  async sadd(key, ...members) {
    return redisClient.sAdd(key, members.flat());
  },

  async srem(key, ...members) {
    return redisClient.sRem(key, members.flat());
  },

  async smembers(key) {
    return redisClient.sMembers(key);
  },

  async sismember(key, member) {
    return redisClient.sIsMember(key, member);
  },

  async del(key) {
    return redisClient.del(key);
  },
};

const normalizeUrl = (value) => value?.trim();

const getRedisUrl = () =>
  normalizeUrl(process.env.REDIS_URL) ||
  normalizeUrl(process.env.UPSTASH_REDIS_REST_URL);

export const connectRedis = async () => {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    redisReady = false;
    console.warn(
      "REDIS_URL is not set. Falling back to in-memory presence storage.",
    );
    return;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: () => false,
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis Error:", error);
    });

    redisClient.on("connect", () => {
      console.log("Redis connecting...");
    });

    redisClient.on("ready", () => {
      console.log("Redis ready");
    });

    redisClient.on("end", () => {
      console.log("Redis connection closed");
    });

    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Redis connection timed out"));
        }, 5000);
      }),
    ]);
    redisReady = true;

    console.log("Redis connected successfully");
  } catch (error) {
    redisReady = false;

    if (redisClient?.isOpen) {
      try {
        await redisClient.destroy();
      } catch (destroyError) {
        console.warn("Redis cleanup failed:", destroyError.message);
      }
    }

    redisClient = null;

    console.warn(
      "Redis connection failed. Falling back to in-memory presence storage.",
      error.message,
    );
  }
};

export const isRedisAvailable = () => redisReady && Boolean(redisClient);

export default new Proxy(redisAdapter, {
  get(target, prop) {
    if (isRedisAvailable()) {
      return Reflect.get(redisAdapter, prop);
    }

    return Reflect.get(memoryAdapter, prop);
  },
});
