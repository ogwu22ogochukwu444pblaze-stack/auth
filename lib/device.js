import axios from 'axios';

export async function getIpGeoLocation(req, ipAddress) {
  // Vercel injects geo headers on every production request — use these first,
  // no external API call, no rate limits, works instantly.
  const vercelCity = req?.headers.get('x-vercel-ip-city');
  const vercelCountry = req?.headers.get('x-vercel-ip-country');

  if (vercelCity || vercelCountry) {
    return {
      city: vercelCity ? decodeURIComponent(vercelCity) : 'Unknown',
      country: vercelCountry || 'Unknown',
    };
  }

  // Fallback for local dev (no Vercel headers) or non-loopback IPs
  const LOCAL_IPS = ['::1', '127.0.0.1', '::ffff:127.0.0.1', '0.0.0.0'];
  if (!ipAddress || LOCAL_IPS.includes(ipAddress)) {
    return { city: 'Localhost', country: 'Local' };
  }

  try {
    const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, { timeout: 5000 });
    return {
      city: response.data.city || 'Unknown',
      country: response.data.country_name || 'Unknown',
    };
  } catch (err) {
    console.error('Error fetching geolocation:', err.message);
    return {
      city: 'Unknown',
      country: 'Unknown',
    };
  }
}

export function getIpFromRequest(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const clientIp = req.headers.get('x-client-ip');
  if (clientIp) return clientIp;

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return req.socket?.remoteAddress || '0.0.0.0';
}

export function normalizeDeviceFingerprint(fingerprint) {
  return String(fingerprint).toLowerCase().trim();
}