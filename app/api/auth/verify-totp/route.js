import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { verifyTotpCode } from '@/lib/totp';
import { generateSessionToken } from '@/lib/auth';
import { getIpFromRequest, getIpGeoLocation, normalizeDeviceFingerprint } from '@/lib/device';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { userId, totpCode, deviceFingerprint } = await req.json();

    if (!userId || !totpCode || !deviceFingerprint) {
      return NextResponse.json(
        { error: 'User ID, TOTP code, and device fingerprint are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isTotpEnabled) {
      return NextResponse.json(
        { error: 'User not found or TOTP not enabled' },
        { status: 404 }
      );
    }

    // Verify TOTP code
    const isValid = verifyTotpCode(user.totpSecret, totpCode);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid TOTP code' },
        { status: 401 }
      );
    }

    // Get or create device
    const ipAddress = getIpFromRequest(req);
    const geoLocation = await getIpGeoLocation(ipAddress);
    const normalizedFingerprint = normalizeDeviceFingerprint(deviceFingerprint);

    let device = await prisma.device.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId: user.id,
          deviceFingerprint: normalizedFingerprint,
        },
      },
    });

    if (!device) {
      device = await prisma.device.create({
        data: {
          userId: user.id,
          deviceFingerprint: normalizedFingerprint,
          ipAddress,
          city: geoLocation.city,
          country: geoLocation.country,
          isTrusted: true,
        },
      });
    } else {
      // Update device as trusted and last seen
      await prisma.device.update({
        where: { id: device.id },
        data: {
          isTrusted: true,
          lastSeen: new Date(),
        },
      });
    }

    // Create session
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        expiresAt,
      },
    });

    // Generate session token
    const token = generateSessionToken(user.id, device.id);

    const response = NextResponse.json(
      { message: 'TOTP verified successfully' },
      { status: 200 }
    );

    // Set cookie
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 3600,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify TOTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
