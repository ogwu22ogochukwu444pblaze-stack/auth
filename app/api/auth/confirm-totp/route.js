import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { verifyTotpCode } from '@/lib/totp';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { totpSecret, totpCode } = await req.json();

    if (!totpSecret || !totpCode) {
      return NextResponse.json(
        { error: 'TOTP secret and code are required' },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Verify TOTP code
    const isValid = verifyTotpCode(totpSecret, totpCode);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 400 }
      );
    }

    // Save TOTP secret to user and enable it
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        totpSecret,
        isTotpEnabled: true,
      },
    });

    return NextResponse.json(
      { message: 'Two-factor authentication enabled' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Confirm TOTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
