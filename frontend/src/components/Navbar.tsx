import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, PlusCircle, FileText, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-civic-border sticky top-0 z-40 shadow-xs">
      {/* Subtle public-service tricolor top accent band */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-white to-emerald-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Portal Identity */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-civic-navy flex items-center justify-center text-white shadow-xs group-hover:bg-civic-blue transition-colors">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-civic-navy">CivicPulse</span>
                <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium">
                  Public Service
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Municipal Issue Reporting & Resolution</p>
            </div>
          </Link>

          {/* Navigation & User Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <>
                <Link
                  to="/report"
                  className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm font-semibold rounded-md shadow-xs text-white bg-civic-saffron hover:bg-orange-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Report Issue</span>
                  <span className="sm:hidden">Report</span>
                </Link>

                <Link
                  to="/my-complaints"
                  className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-1.5 text-slate-500" />
                  <span className="hidden md:inline">My Complaints</span>
                </Link>

                {/* User Profile Pill */}
                <div className="flex items-center pl-2 border-l border-slate-200 space-x-3">
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-semibold text-civic-navy leading-none">{user.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:text-civic-navy"
                >
                  Citizen Login
                </Link>
                <Link
                  to="/staff/login"
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded text-slate-600 hover:bg-slate-50"
                >
                  Staff Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
