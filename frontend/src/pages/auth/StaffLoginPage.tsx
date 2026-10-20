import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi, taxonomyApi } from '../../services/api';
import { IDepartment } from '../../types';
import {
  Building2,
  Wrench,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  UserPlus,
  LogIn,
  ShieldCheck,
} from 'lucide-react';

export const StaffLoginPage: React.FC = () => {
  const { loginStaff, registerStaff } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Role: 'officer' | 'field_worker'
  const portalParam = searchParams.get('portal');
  const [role, setRole] = useState<'officer' | 'field_worker'>(
    portalParam === 'worker' ? 'field_worker' : 'officer'
  );

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('ROADS');
  const [ward, setWard] = useState('');
  const [otp, setOtp] = useState('');

  // UI state
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [departments, setDepartments] = useState<IDepartment[]>([]);

  useEffect(() => {
    if (portalParam === 'worker') {
      setRole('field_worker');
    } else if (portalParam === 'officer') {
      setRole('officer');
    }
  }, [portalParam]);

  useEffect(() => {
    // Load departments
    taxonomyApi.getDepartments().then((depts) => {
      if (depts && depts.length > 0) {
        setDepartments(depts);
      }
    }).catch(() => {
      // fallback departments
    });
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRoleChange = (newRole: 'officer' | 'field_worker') => {
    setRole(newRole);
    setSearchParams({ portal: newRole === 'field_worker' ? 'worker' : 'officer' });
    setError(null);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!phone || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (mode === 'register' && (!name || name.trim().length < 2)) {
      setError('Please enter your full official name (minimum 2 characters)');
      return;
    }

    setLoading(true);
    try {
      const purpose = mode === 'register' ? 'staff_register' : 'staff_login';
      const res = await authApi.sendOtp(phone.trim(), purpose);
      setOtpSent(true);
      setCooldown(res.cooldownSeconds || 60);
      setInfoMsg(res.message || 'Verification OTP dispatched to your mobile.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send OTP';
      setError(msg);
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
      let loggedInUser;

      if (mode === 'register') {
        loggedInUser = await registerStaff({
          name: name.trim(),
          phone: phone.trim(),
          otp: otp.trim(),
          role,
          departmentName: department,
          ward: ward.trim() || undefined,
        });
      } else {
        loggedInUser = await loginStaff(phone.trim(), otp.trim());
      }

      if (loggedInUser.role === 'officer' || loggedInUser.role === 'admin') {
        navigate('/officer');
      } else if (loggedInUser.role === 'field_worker') {
        navigate('/worker');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const isOfficer = role === 'officer';

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-civic-bg-warm">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className={`px-6 py-6 text-white text-center transition-colors ${isOfficer ? 'bg-civic-navy' : 'bg-emerald-900'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs ${isOfficer ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            {isOfficer ? <Building2 className="w-6 h-6 text-white" /> : <Wrench className="w-6 h-6 text-white" />}
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {isOfficer ? 'Municipal Officer Portal' : 'Field Worker Operations Portal'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isOfficer
              ? 'Control Center for Incident Dispatch & Quality Verification'
              : 'Mobile Task Execution, GPS Navigation & Proof Capture'}
          </p>
        </div>

        {/* Portal Switching Tabs */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleRoleChange('officer')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              isOfficer ? 'bg-white text-civic-navy shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Officer Portal</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('field_worker')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              !isOfficer ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Field Worker</span>
          </button>
        </div>

        {/* Mode Toggle: Login vs Register */}
        <div className="px-6 pt-5 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {mode === 'login' ? 'Staff Sign In' : 'New Staff Registration'}
          </span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setOtpSent(false);
              }}
              className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1 transition ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3 h-3" /> Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setOtpSent(false);
              }}
              className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1 transition ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3 h-3" /> Register
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {/* If no account found, provide one-click switch to registration */}
              {error.includes('No municipal staff account registered') && mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="w-full mt-1 py-1.5 px-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register this phone number now as {isOfficer ? 'Officer' : 'Field Worker'}</span>
                </button>
              )}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              {/* Registration Fields */}
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Official Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isOfficer ? 'e.g. Suresh Sharma' : 'e.g. Ramesh Kumar'}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-civic-navy focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department *
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-civic-navy focus:outline-hidden"
                      >
                        {departments.length > 0 ? (
                          departments.map((d) => (
                            <option key={d.code} value={d.code}>
                              {d.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="ROADS">Roads & Infrastructure</option>
                            <option value="SANITATION">Solid Waste & Sanitation</option>
                            <option value="WATER">Water Supply & Sewerage</option>
                            <option value="ELECTRICAL">Street Lighting & Electrical</option>
                            <option value="DRAINAGE">Storm Water Drainage</option>
                            <option value="HEALTH">Public Health</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ward / Zone (Optional)
                      </label>
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        placeholder="e.g. Ward 42"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-civic-navy focus:outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {mode === 'register' ? 'Mobile Number for OTP *' : 'Registered Staff Mobile Number *'}
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-xs font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-1 focus:ring-civic-navy focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {mode === 'register'
                    ? `You are registering as: ${isOfficer ? 'Municipal Operations Officer' : 'Field Operations Worker'}`
                    : 'Enter the mobile number associated with your staff account'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                  isOfficer ? 'bg-civic-navy hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading
                  ? 'Requesting OTP...'
                  : mode === 'register'
                  ? 'Send Registration OTP'
                  : 'Request Staff OTP'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">Mobile: </span>
                  +91 {phone}
                  {mode === 'register' && name && (
                    <div className="text-[11px] text-slate-500">
                      Registering: <strong>{name}</strong> ({isOfficer ? 'Officer' : 'Field Worker'} - {department})
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-blue-600 hover:underline font-semibold text-xs"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest text-lg font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-civic-navy focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className={`w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                  isOfficer ? 'bg-civic-navy hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                {loading
                  ? 'Verifying...'
                  : mode === 'register'
                  ? `Complete Registration & Enter ${isOfficer ? 'Officer' : 'Worker'} Portal`
                  : `Verify & Enter ${isOfficer ? 'Officer' : 'Worker'} Portal`}
              </button>

              <div className="text-center pt-1">
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

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-medium text-slate-500">
            <Link to="/login" className="hover:text-civic-navy">
              &larr; Citizen Login
            </Link>
            <span className="text-[11px] text-slate-400">
              CivicPulse Public Operations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
