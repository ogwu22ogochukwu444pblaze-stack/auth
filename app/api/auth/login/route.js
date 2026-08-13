import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getIpFromRequest, getIpGeoLocation, normalizeDeviceFingerprint } from '@/lib/device';
import { calculateRisk, shouldRequireTotp } from '@/lib/risk';
import { generateSessionToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email, password, deviceFingerprint } = await req.json();

    if (!email || !password || !deviceFingerprint) {
      return NextResponse.json(
        { error: 'Email, password, and device fingerprint are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get IP and geolocation
    const ipAddress = getIpFromRequest(req);
    const geoLocation = await getIpGeoLocation(req, ipAddress);
    const normalizedFingerprint = normalizeDeviceFingerprint(deviceFingerprint);

    // Check for existing device
    let device = await prisma.device.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId: user.id,
          deviceFingerprint: normalizedFingerprint,
        },
      },
    });

    // Calculate risk
    const risk = calculateRisk(device);

    // Check if TOTP is required
    if (shouldRequireTotp(risk, user.isTotpEnabled)) {
      return NextResponse.json(
        { requiresTotp: true, userId: user.id },
        { status: 200 }
      );
    }

    // If no device found, create it
    if (!device) {
      device = await prisma.device.create({
        data: {
          userId: user.id,
          deviceFingerprint: normalizedFingerprint,
          ipAddress,
          city: geoLocation.city,
          country: geoLocation.country,
          isTrusted: false,
        },
      });
    } else {
      // Update last seen and refresh location data
      await prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeen: new Date(),
          city: geoLocation.city,
          country: geoLocation.country,
          ipAddress,
        },
      });
    }

    // Create session
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        expiresAt,
      },
    });

    // Generate session token
    const token = generateSessionToken(user.id, device.id);

    const response = NextResponse.json(
      { message: 'Login successful' },
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
