import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS || '24');

export function generateSessionToken(userId, deviceId) {
  const expiresIn = `${SESSION_EXPIRY_HOURS}h`;
  const token = jwt.sign(
    { userId, deviceId },
    JWT_SECRET,
    { expiresIn }
  );
  return token;
}

export function verifySessionToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.cookies.set('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_HOURS * 3600,
    path: '/',
  });
}

export function getSessionFromCookie(req) {
  const token = req.cookies.get('authToken')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function clearSessionCookie(res) {
  res.cookies.set('authToken', '', {
    maxAge: 0,
    path: '/',
  });
}
