import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { generateTotpSecret, generateQrCodeDataUrl, formatSecret } from '@/lib/totp';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
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

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate TOTP secret
    const { secret, qrCodeUrl } = generateTotpSecret(user.email);
    const qrCodeDataUrl = await generateQrCodeDataUrl(qrCodeUrl);
    const formattedSecret = formatSecret(secret);

    return NextResponse.json(
      {
        secret,
        formattedSecret,
        qrCode: qrCodeDataUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Setup TOTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
