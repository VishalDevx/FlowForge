import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
});

export const connectRedis = async () => {
  await redis.connect();
};

export const disconnectRedis = async () => {
  await redis.quit();
};

export const getCache = async (key: string) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const setCache = async (key: string, value: unknown, ttlSeconds?: number) => {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    return redis.setex(key, ttlSeconds, serialized);
  }
  return redis.set(key, serialized);
};

export const deleteCache = async (key: string) => {
  return redis.del(key);
};

export const acquireLock = async (lockKey: string, ttlSeconds = 10) => {
  const result = await redis.set(`lock:${lockKey}`, process.pid.toString(), 'EX', ttlSeconds, 'NX');
  return result === 'OK';
};

export const releaseLock = async (lockKey: string) => {
  return redis.del(`lock:${lockKey}`);
};

export const publish = async (channel: string, message: unknown) => {
  return redis.publish(channel, JSON.stringify(message));
};

export const subscribe = (channel: string, callback: (message: string) => void) => {
  const subscriber = redis.duplicate();
  subscriber.subscribe(channel);
  subscriber.on('message', (_ch, message) => callback(message));
  return subscriber;
};

export default redis;