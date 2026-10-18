import React from 'react';
import { IncidentStatus, UrgencyLevel } from '../types';

export const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'Open':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Assigned':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'InProgress':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'AwaitingVerification':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Resolved':
      case 'Closed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Reopened':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'AwaitingVerification':
        return 'Awaiting Verification';
      case 'InProgress':
        return 'In Progress';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {getLabel()}
    </span>
  );
};

export const UrgencyBadge: React.FC<{ urgency: UrgencyLevel }> = ({ urgency }) => {
  const getStyle = () => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-50 text-red-700 border-red-200 font-bold';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200 font-semibold';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStyle()}`}
    >
      {urgency}
    </span>
  );
};
