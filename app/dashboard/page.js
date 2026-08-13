'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setDevice(data.device);
      } catch (err) {
        setError('Failed to fetch session');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      setError('Logout failed');
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
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Welcome to Dashboard
        </h1>

        {error && <div className="error-message">{error}</div>}

        {user && (
          <div className="mb-6">
            <p className="text-lg text-gray-700 mb-2">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="text-lg text-gray-700 mb-4">
              <strong>2FA Status:</strong>{' '}
              {user.isTotpEnabled ? (
                <span className="badge">✓ Enabled</span>
              ) : (
                <span className="text-orange-600 font-medium">Disabled</span>
              )}
            </p>

            {device && (
              <p className="text-sm text-gray-600">
                <strong>Current Device:</strong> {device.city}, {device.country}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          {user && !user.isTotpEnabled && (
            <Link href="/settings/setup-totp" className="auth-button text-center">
              Enable Two-Factor Authentication
            </Link>
          )}

          <button onClick={handleLogout} className="auth-button bg-red-600 hover:bg-red-700">
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
