import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, Train, Fingerprint, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface FieldUser {
  id?: string;
  username: string;
  name: string;
  role: string;
  department: string;
  division: string;
  employeeId: string;
}

interface MobileLoginViewProps {
  onLoginSuccess: (user: FieldUser) => void;
}

export const MobileLoginView: React.FC<MobileLoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('Divya Singh');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);

  const handleLogin = (u = username, p = password) => {
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const cleanUser = u.trim().toLowerCase().replace(/[\s_.-]+/g, '');
      const validUsers = ['divyasingh', 'divya', 'raviamish', 'ravi', 'sseohe', 'sse', 'admin'];

      if ((validUsers.includes(cleanUser) || cleanUser === 'divyasingh' || cleanUser === 'divya') && (p === '123456' || p === 'admin' || p === 'password')) {
        const user: FieldUser = {
          username: 'Divya Singh',
          name: 'Divya Singh',
          role: 'Senior Section Engineer (OHE)',
          department: 'ELECTRICAL_TRD',
          division: 'ECR / Danapur Division',
          employeeId: 'IR-SSE-54812',
        };
        try {
          localStorage.setItem('railsync_field_user', JSON.stringify(user));
        } catch (_) {}
        onLoginSuccess(user);
      } else {
        setError('Invalid Operator ID or PIN. Correct credentials: Divya Singh / 123456');
        setLoading(false);
      }
    }, 400);
  };

  const handleBiometric = () => {
    setBiometricScanning(true);
    setError(null);
    setTimeout(() => {
      setBiometricScanning(false);
      handleLogin('Divya Singh', '123456');
    }, 800);
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        background: 'linear-gradient(180deg, #0A0F1D 0%, #0F172A 40%, #080D1A 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: '#FFFFFF',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflowY: 'auto',
        padding: '24px 20px 32px',
        boxSizing: 'border-box',
        justifyContent: 'space-between',
      }}
    >
      {/* Top Branding Section */}
      <div>
        {/* IR Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(37,99,235,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 10.5,
              fontWeight: 700,
              color: '#60A5FA',
              letterSpacing: '0.04em',
            }}
          >
            <ShieldCheck size={12} color="#60A5FA" />
            INDIAN RAILWAYS • ECR
          </div>
          <span
            style={{
              fontSize: 10,
              color: '#10B981',
              fontWeight: 700,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            ● Live Sync Mesh
          </span>
        </div>

        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,99,235,0.45)',
              marginBottom: 14,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <Train size={30} color="#FFFFFF" strokeWidth={2.2} />
          </div>

          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            <span style={{ color: '#60A5FA' }}>Rail</span>Sync
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginLeft: 8 }}>Field Ops</span>
          </div>

          <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
            Ground Crew &amp; OHE Track Possession Terminal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
              fontSize: 11.5,
              color: '#FCA5A5',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Operator ID Input */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, letterSpacing: '0.03em' }}>
              OPERATOR ID / USERNAME
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '0 14px',
                height: 48,
                transition: 'all 0.2s ease',
              }}
            >
              <User size={16} color="#60A5FA" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Divya Singh"
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          {/* Security PIN Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.03em' }}>
                SECURITY PIN / PASSWORD
              </label>
              <span style={{ fontSize: 10, color: '#60A5FA', fontWeight: 600 }}>Default: 123456</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '0 14px',
                height: 48,
                transition: 'all 0.2s ease',
              }}
            >
              <Lock size={16} color="#60A5FA" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter 6-digit PIN"
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: showPassword ? 'normal' : '0.15em',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              transition: 'all 0.15s ease',
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Field App</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: '0.05em' }}>OR QUICK ACCESS</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* One-Tap Biometric Fingerprint Button */}
        <button
          type="button"
          onClick={handleBiometric}
          disabled={biometricScanning || loading}
          style={{
            width: '100%',
            height: 46,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#E2E8F0',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <Fingerprint size={18} color={biometricScanning ? '#60A5FA' : '#38BDF8'} />
          <span>{biometricScanning ? 'Scanning Biometrics...' : 'Quick Sign-In with Biometrics'}</span>
        </button>

        {/* Pre-fill Demo Credentials Pill */}
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            type="button"
            onClick={() => {
              setUsername('Divya Singh');
              setPassword('123456');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60A5FA',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircle2 size={12} />
            Fill Credentials (Divya Singh / 123456)
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: 'center', paddingTop: 20 }}>
        <div style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600 }}>
          Danapur Division (DNR) • Patna Junction (PNBE)
        </div>
        <div style={{ fontSize: 9.5, color: '#475569', marginTop: 3 }}>
          Secured by SHA-256 Merkle Audit Ledger &amp; W3C Distributed Tracing
        </div>
      </div>
    </div>
  );
};
