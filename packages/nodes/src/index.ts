import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import nodemailer from 'nodemailer';
import { createLogger } from '@flowforge/logger';
import { type JobResult, type NodeType } from '@flowforge/contracts';

const logger = createLogger('@flowforge/nodes');

export const executeHttpNode = async (
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  },
  input: Record<string, unknown>,
): Promise<JobResult> => {
  const startTime = Date.now();
  
  try {
    const url = interpolateString(config.url, input);
    const body = config.body ? interpolateObject(config.body, input) : undefined;
    const headers = config.headers
      ? Object.fromEntries(
          Object.entries(config.headers).map(([k, v]) => [k, interpolateString(v, input)])
        ) : undefined;
    
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url,
      headers,
      data: body,
      timeout: config.timeout || 10000,
      validateStatus: () => true,
    };
    
    const response = await axios(axiosConfig);
    const durationMs = Date.now() - startTime;
    
    const isSuccess = response.status >= 200 && response.status < 300;
    
    return {
      success: isSuccess,
      output: {
        statusCode: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
        durationMs,
      },
      retry: !isSuccess
        ? { shouldRetry: response.status >= 500 || response.status === 429, retryDelayMs: 1000 }
        : undefined,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error({ error: axiosError.message, url: config.url }, 'HTTP node failed');
    
    return {
      success: false,
      error: axiosError.message,
      retry: { shouldRetry: true, retryDelayMs: 1000 },
    };
  }
};

export const executeEmailNode = async (
  config: {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
  },
  input: Record<string, unknown>,
): Promise<JobResult> => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  
  const to = Array.isArray(config.to)
    ? config.to.map((e) => interpolateString(e, input))
    : interpolateString(config.to, input);
  const subject = interpolateString(config.subject, input);
  const body = interpolateString(config.body, input);
  const html = config.html ? interpolateString(config.html, input) : undefined;
  
  try {
    await transporter.sendMail({ to, subject, text: body, html });
    return { success: true, output: { sent: true } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const executeConditionNode = async (
  config: { expression: string },
  input: Record<string, unknown>,
): Promise<JobResult> => {
  try {
    const result = evaluateCondition(config.expression, input);
    return { success: true, output: { result: Boolean(result) } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const executeDelayNode = async (
  config: { durationMs: number },
): Promise<JobResult> => {
  return {
    success: true,
    output: { delayed: true, durationMs: config.durationMs },
    retry: { shouldRetry: false },
  };
};

export const executeTransformNode = async (
  config: Record<string, string>,
  input: Record<string, unknown>,
): Promise<JobResult> => {
  try {
    const output: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        output[key] = getValueByPath(input, path);
      } else {
        output[key] = value;
      }
    }
    
    return { success: true, output };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

const interpolateString = (str: string, data: Record<string, unknown>): string => {
  return str.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const value = getValueByPath(data, path);
    return typeof value === 'string' ? value : JSON.stringify(value);
  });
};

const interpolateObject = (
  obj: unknown,
  data: Record<string, unknown>,
): unknown => {
  if (typeof obj === 'string') return interpolateString(obj, data);
  if (Array.isArray(obj)) return obj.map((v) => interpolateObject(v, data));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, interpolateObject(v, data)]),
    );
  }
  return obj;
};

const getValueByPath = (obj: Record<string, unknown>, path: string): unknown => {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
};

const evaluateCondition = (expression: string, data: Record<string, unknown>): unknown => {
  const func = new Function('data', `with(data) { return ${expression} }`);
  return func(data);
};

export const executeNode = async (
  nodeType: NodeType,
  config: Record<string, unknown>,
  input: Record<string, unknown>,
): Promise<JobResult> => {
  const handlers: Record<string, (config: any, input: any) => Promise<JobResult>> = {
    'action.http': executeHttpNode,
    'action.email': executeEmailNode,
    'action.condition': executeConditionNode,
    'action.delay': executeDelayNode,
    'action.transform': executeTransformNode,
  };
  
  const handler = handlers[nodeType];
  
  if (!handler) {
    return { success: false, error: `Unknown node type: ${nodeType}` };
  }
  
  return handler(config, input);
};

const nodeRegistry: Record<string, (config: any, input: any) => Promise<JobResult>> = {
  'action.http': executeHttpNode,
  'action.email': executeEmailNode,
  'action.condition': executeConditionNode,
  'action.delay': executeDelayNode,
  'action.transform': executeTransformNode,
};

export const registerNode = (
  type: string,
  handler: (config: any, input: any) => Promise<JobResult>,
) => {
  nodeRegistry[type] = handler;
};

export const getNodeHandler = (type: string) => {
  return nodeRegistry[type];
};

export default { executeNode, registerNode, getNodeHandler };