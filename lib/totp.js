import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export function generateTotpSecret(email) {
  const secret = speakeasy.generateSecret({
    name: `Adaptive Auth (${email})`,
    issuer: 'Adaptive Auth',
    length: 32,
  });
  
  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url,
  };
}

export function verifyTotpCode(secret, code) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: code,
    window: 2,
  });
}

export async function generateQrCodeDataUrl(otpAuthUrl) {
  try {
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    return qrCode;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return null;
  }
}

export function formatSecret(secret) {
  // Format the secret in groups of 4 characters
  return secret.match(/.{1,4}/g)?.join(' ') || secret;
}
