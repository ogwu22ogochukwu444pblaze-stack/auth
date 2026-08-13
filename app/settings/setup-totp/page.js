'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SetupTotpPage() {
  const [secret, setSecret] = useState('');
  const [formattedSecret, setFormattedSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchTotpSecret = async () => {
      try {
        const res = await fetch('/api/auth/setup-totp', { method: 'POST' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setSecret(data.secret);
        setFormattedSecret(data.formattedSecret);
        setQrCode(data.qrCode);
      } catch (err) {
        setError('Failed to generate TOTP secret');
      } finally {
        setLoading(false);
      }
    };
    fetchTotpSecret();
  }, [router]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerifying(true);

    if (totpCode.length !== 6) {
      setError('Code must be 6 digits');
      setVerifying(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/confirm-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totpSecret: secret,
          totpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to verify code');
        return;
      }

      setSuccess('Two-factor authentication enabled successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Enable Two-Factor Authentication
        </h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="mb-6 text-center">
          <p className="text-gray-600 mb-4">
            Scan this QR code with your authenticator app:
          </p>
          {qrCode && (
            <div className="flex justify-center mb-4">
              <img
                src={qrCode}
                alt="QR Code"
                className="w-48 h-48 border border-gray-300 rounded"
              />
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded mb-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Or enter this key manually:</p>
          <p className="font-mono text-lg tracking-wider text-gray-800">
            {formattedSecret}
          </p>
        </div>

        <form onSubmit={handleVerify}>
          <p className="text-gray-600 mb-3 text-center">
            Enter the 6-digit code from your authenticator:
          </p>
          <input
            type="text"
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength="6"
            className="auth-input text-center text-2xl tracking-widest"
            required
          />
          <button
            type="submit"
            className="auth-button"
            disabled={verifying || totpCode.length !== 6}
          >
            {verifying ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>
        </form>
      </div>
    </div>
  );
}
