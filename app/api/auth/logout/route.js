import { NextResponse } from 'next/server';

// POST /api/auth/logout
// Clears any auth cookies (if present) and returns success.
export async function POST() {
  try {
    const res = NextResponse.json({ success: true, message: 'Logged out' });
    // Proactively clear common auth cookies if they exist
    res.cookies.set('authToken', '', { maxAge: 0, path: '/' });
    res.cookies.set('userRole', '', { maxAge: 0, path: '/' });
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
