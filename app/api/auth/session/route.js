import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session' },
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

    // Get user and device info
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        isTotpEnabled: true,
      },
    });

    const device = await prisma.device.findUnique({
      where: { id: session.deviceId },
      select: {
        id: true,
        city: true,
        country: true,
        lastSeen: true,
      },
    });

    if (!user || !device) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        user,
        device,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
