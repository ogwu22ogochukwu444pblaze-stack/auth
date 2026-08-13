import axios from 'axios';

export async function getIpGeoLocation(ipAddress) {
  try {
    const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
    return {
      city: response.data.city || 'Unknown',
      country: response.data.country_name || 'Unknown',
    };
  } catch (err) {
    console.error('Error fetching geolocation:', err);
    return {
      city: 'Unknown',
      country: 'Unknown',
    };
  }
}

export function getIpFromRequest(req) {
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const clientIp = req.headers.get('x-client-ip');
  if (clientIp) return clientIp;
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  // Fallback to connection remote address
  return req.socket?.remoteAddress || '0.0.0.0';
}

export function normalizeDeviceFingerprint(fingerprint) {
  // Ensure fingerprint is a string
  return String(fingerprint).toLowerCase().trim();
}
