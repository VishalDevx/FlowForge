import { randomBytes, createHash } from 'crypto';

export const generateId = (): string => {
  return randomBytes(16).toString('hex');
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.substring(0, 2) + '***';
  return `${masked}@${domain}`;
};

export const maskString = (str: string, visible = 4): string => {
  if (str.length <= visible) return '*'.repeat(str.length);
  return str.substring(0, visible) + '*'.repeat(str.length - visible);
};

export const hashString = (str: string, algorithm = 'sha256'): string => {
  return createHash(algorithm).update(str).digest('hex');
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  options: { attempts: number; delayMs: number; backoff?: number } = { attempts: 3, delayMs: 1000 },
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let i = 1; i <= options.attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < options.attempts) {
        const delay = options.delayMs * (options.backoff ? Math.pow(options.backoff, i - 1) : 1);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

export const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

export const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => {
  return arr.reduce((acc, item) => {
    const groupKey = String(item[key]);
    (acc[groupKey] = acc[groupKey] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

export const isValidUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export const isValidEmail = (str: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

export const isValidUuid = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const parseJson = <T = unknown>(str: string, fallback?: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback as T;
  }
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

export const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const asyncMap = async <T, R>(
  arr: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> => {
  const results: R[] = [];
  const queue = arr.map((item, index) => ({ item, index }));
  
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const { item, index } = queue.shift()!;
      results[index] = await fn(item, index);
    }
  });
  
  await Promise.all(workers);
  return results;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number,
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  };
};