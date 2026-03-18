import { db } from './db';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import { NextRequest } from 'next/server';

// Hash password
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Generate session token
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Generate next 8-digit userId (starts from 10000001)
export async function generateNextUserId(): Promise<number> {
  const lastUser = await db.user.findFirst({
    orderBy: { userId: 'desc' },
    select: { userId: true }
  });
  
  if (!lastUser) {
    return 10000001; // First user
  }
  
  return lastUser.userId + 1;
}

// Get current user from cookie or authorization header
// This fixes the "missing X-Token header" error in public browsers
export async function getCurrentUser(request?: NextRequest) {
  let sessionToken: string | undefined;
  
  // Try Authorization header first (for public browser access)
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }
  }
  
  // Fall back to cookie
  if (!sessionToken) {
    const cookieStore = await cookies();
    sessionToken = cookieStore.get('session_token')?.value;
  }
  
  if (!sessionToken) {
    return null;
  }
  
  // Parse session token - format is "{userId}_{token}"
  const parts = sessionToken.split('_');
  if (parts.length < 1) {
    return null;
  }
  
  const userId = parts[0];
  
  // Find user by ID
  const user = await db.user.findUnique({
    where: { id: userId }
  });
  
  return user;
}

// Set session cookie
export async function setSession(userId: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set('session_token', `${userId}_${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  });
}

// Clear session
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
}

// Verify Google ID token using Google's public API
export async function verifyGoogleToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
  sub: string;
} | null> {
  try {
    // Call Google's tokeninfo endpoint
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    
    if (!response.ok) {
      console.error('Google token verification failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Verify the token is valid
    if (!data.email || !data.sub) {
      console.error('Invalid Google token data');
      return null;
    }
    
    return {
      email: data.email,
      name: data.name || data.email.split('@')[0],
      picture: data.picture || '',
      sub: data.sub
    };
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}
