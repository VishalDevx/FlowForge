import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}

async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Remove /api prefix since API_URL already includes /api/v1
  const path = pathname.replace(/^\/api/, '');
  const url = `${API_URL}${path}${search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const data = await res.arrayBuffer();

  return new NextResponse(data, {
    status: res.status,
    headers: responseHeaders,
  });
}
