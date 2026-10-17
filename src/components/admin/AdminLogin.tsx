import React, { useState } from 'react';
import { loginAdmin, resetAdminPasswordWithMasterKey } from '../../services/catalogService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStore }) => {
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forgot password & override states
  const [overridePass, setOverridePass] = useState('');
  const [showOverridePass, setShowOverridePass] = useState(false);
  const [showChangeFields, setShowChangeFields] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // 1. Standard Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Please enter your admin email or username.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your admin password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginAdmin(cleanEmail, cleanPassword);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Authentication failed. Please verify your credentials or click "Forgot Password".');
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Override Password Validation & Direct Login Attempt (When Forgot Password is clicked)
  const handleOverrideLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanOverride = overridePass.trim();

    if (!cleanOverride) {
      setError('Please enter the recovery password.');
      return;
    }

    // Strict validation of the override password
    if (cleanOverride !== 'mnbvcxz12') {
      setError('Invalid recovery password. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      const targetUser = email.trim() || 'anmolkala.in@gmail.com';
      const result = await loginAdmin(targetUser, 'mnbvcxz12');
      if (result.success) {
        setSuccess('Recovery password validated successfully! Signing in...');
        setTimeout(() => {
          onLoginSuccess();
        }, 300);
      } else {
        setError(result.error || 'Failed to authenticate with recovery password.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during recovery login.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Reset Password Using Override Password
  const handleResetWithOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanOverride = overridePass.trim();
    const cleanNew = newPass.trim();
    const cleanConfirm = confirmPass.trim();

    if (!cleanOverride) {
      setError('Please enter the recovery password.');
      return;
    }
    if (cleanOverride !== 'mnbvcxz12') {
      setError('Invalid recovery password. Please try again.');
      return;
    }
    if (!cleanNew) {
      setError('Please enter a new password.');
      return;
    }
    if (cleanNew.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const resetResult = await resetAdminPasswordWithMasterKey(cleanOverride, cleanNew);
      if (resetResult.success) {
        setSuccess('Password updated successfully! Logging you in with your new credentials...');
        const targetUser = email.trim() || 'anmolkala.in@gmail.com';
        const loginResult = await loginAdmin(targetUser, cleanNew);
        if (loginResult.success) {
          setTimeout(() => {
            onLoginSuccess();
          }, 400);
        } else {
          setPassword(cleanNew);
          setViewMode('login');
        }
      } else {
        setError(resetResult.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0e1624 0%, #172235 50%, #1f2c42 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.45)',
          padding: '36px 32px',
          color: '#1e293b',
          border: '1px solid rgba(216, 180, 90, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="AnmolKala"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '2px solid #d8b45a',
              margin: '0 auto 12px',
              display: 'block',
              objectFit: 'cover',
              background: '#f8fafc',
            }}
          />
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0',
              letterSpacing: '-0.3px',
            }}
          >
            {viewMode === 'login' ? 'Anmol Kala Admin Portal' : 'Admin Password Recovery'}
          </h1>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="alert"
          >
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="alert"
          >
            <span style={{ fontSize: '16px' }}>✅</span>
            <span>{success}</span>
          </div>
        )}

        {viewMode === 'login' ? (
          /* STANDARD LOGIN VIEW */
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="admin-email"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Admin Email / Username
              </label>
              <input
                id="admin-email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. anmolkala.in@gmail.com"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#d8b45a')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor="admin-password"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    color: '#947021',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#d8b45a')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                />
              </div>
            </div>

            {/* Forgot Password action link */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                marginBottom: '18px',
                fontSize: '12px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setOverridePass('');
                  setViewMode('forgot');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#2874f0',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🔑 Forgot Password?</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '6px',
                border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #182235 0%, #0e1624 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(24, 34, 53, 0.25)',
                transition: 'transform 0.15s, opacity 0.2s',
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <span style={{ fontSize: '16px' }}>➔</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD / RECOVERY VIEW */
          <div>
            <form onSubmit={handleResetWithOverride} style={{ marginBottom: '14px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="override-password"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#334155',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Master Recovery Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOverridePass(!showOverridePass)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '11px',
                      color: '#947021',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {showOverridePass ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="override-password"
                  type={showOverridePass ? 'text' : 'password'}
                  value={overridePass}
                  onChange={(e) => setOverridePass(e.target.value)}
                  placeholder="Enter recovery password"
                  disabled={loading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 13px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
                <div style={{ marginBottom: '14px' }}>
                  <label
                    htmlFor="new-admin-password"
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    New Password (Min 8 Characters)
                  </label>
                  <input
                    id="new-admin-password"
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Enter new admin password"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor="confirm-admin-password"
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-admin-password"
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new admin password"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #182235 0%, #0e1624 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Updating Password...' : 'Validate & Set New Password ➔'}
                </button>
              </form>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setShowChangeFields(false);
                setViewMode('login');
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: '26px',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <button
            type="button"
            onClick={onBackToStore}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            <span>← Back to Storefront</span>
          </button>
          <span style={{ color: '#94a3b8' }}>Anmol Kala v2.0</span>
        </div>
      </div>
    </div>
  );
};
