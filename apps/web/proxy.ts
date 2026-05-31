import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from './src/next/lib/supabase/proxy';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/__pwa_ping') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
