import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Get the JWT token from the request
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the session token from cookies
    const sessionTokenName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token';
    
    const sessionToken = request.cookies.get(sessionTokenName)?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      sessionToken,
      userId: token.id,
      email: token.email
    });
  } catch (error) {
    console.error('Error fetching session token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session token' },
      { status: 500 }
    );
  }
}