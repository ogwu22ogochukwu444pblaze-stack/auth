'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyTotpPage() {
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const deviceFingerprint = sessionStorage.getItem('deviceFingerprint');

    if (!userId || !deviceFingerprint) {
      router.push('/login');
      return;
    }

    setUserId(userId);
    setDeviceFingerprint(deviceFingerprint);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (totpCode.length !== 6) {
      setError('Code must be 6 digits');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          totpCode,
          deviceFingerprint,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code. Try again.');
        return;
      }

      // Clear session storage
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('deviceFingerprint');

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          New Device Detected
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Enter the code from your authenticator app to continue:
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
            disabled={loading || totpCode.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
