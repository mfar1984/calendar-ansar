import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get the origin from the request
  const origin = request.headers.get('origin');
  
  // List of allowed origins
  const allowedOrigins = [
    'https://cal.ansartechnologies.my',
    'https://cal.sibu.org.my',
    'http://localhost:3000',
  ];

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS,PROPFIND,REPORT,MKCALENDAR');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie, Depth'
    );

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
