import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { Shield, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, loginCitizen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      if (user.role === 'officer') navigate('/officer');
      else if (user.role === 'field_worker') navigate('/worker');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.trim();
      const res = await authApi.sendOtp(cleanPhone, 'citizen_login');
      setOtpSent(true);
      setCooldown(res.cooldownSeconds || 60);
      setInfoMsg(res.message || 'OTP dispatched to your mobile number.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      await loginCitizen(phone.trim(), otp.trim(), name.trim(), email.trim() || undefined);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-civic-bg-warm">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xs border border-civic-border overflow-hidden">
        {/* Card Header */}
        <div className="bg-civic-navy px-6 py-6 text-white text-center relative">
          <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Shield className="w-7 h-7 text-civic-navy" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Citizen Portal Access</h2>
          <p className="text-xs text-slate-300 mt-1">
            Quick passwordless login with verified Mobile OTP
          </p>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-sm font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-r-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-semibold text-white bg-civic-saffron hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Request OTP'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">Mobile: </span>
                  +91 {phone}
                </div>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-civic-blue hover:underline font-semibold"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter 6-Digit OTP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-lg font-bold px-3 py-2.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-semibold text-white bg-civic-navy hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP & Enter Portal'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-xs text-slate-600 hover:text-civic-navy font-medium disabled:opacity-40"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-slate-200 text-center">
            <Link
              to="/staff/login"
              className="text-xs font-semibold text-slate-600 hover:text-civic-navy"
            >
              Municipal Officer or Field Worker? Access Staff Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
