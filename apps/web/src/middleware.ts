import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/workflows', '/executions', '/settings'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has('ff_session');
  const { pathname } = request.nextUrl;

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/workflows/:path*', '/executions/:path*', '/settings/:path*', '/login', '/register', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
