import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Clock,
  MapPin,
  ExternalLink,
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { workerApi } from '../../services/api';
import { IWorkOrder } from '../../types';
import { StatusBadge, UrgencyBadge } from '../../components/StatusBadge';

export const WorkerDashboard: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<IWorkOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      const filter = statusFilter === 'active' ? undefined : statusFilter;
      const data = await workerApi.getWorkOrders(filter);

      // If active filter, show Assigned and InProgress
      if (statusFilter === 'active') {
        setWorkOrders(data.filter((wo) => ['Assigned', 'InProgress'].includes(wo.status)));
      } else {
        setWorkOrders(data);
      }
    } catch (err) {
      console.error('Error fetching worker tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleStartWork = async (workOrderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setStartingId(workOrderId);
      await workerApi.startWork(workOrderId);
      setActionSuccess(`Work Order ${workOrderId} started!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchWorkOrders();
    } catch (err) {
      console.error('Failed to start work:', err);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Mobile-first Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Wrench className="w-4 h-4" />
            <span>Field Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Assigned Work Orders
          </h1>
          <p className="text-xs text-slate-500">
            Field execution, navigation, and resolution capture
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchWorkOrders().then(() => setRefreshing(false));
          }}
          disabled={refreshing}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-civic-saffron' : ''}`} />
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Chips - Horizontal Scroll for Mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { key: 'active', label: 'Active Tasks' },
          { key: 'Assigned', label: 'New Assigned' },
          { key: 'InProgress', label: 'In Progress' },
          { key: 'AwaitingVerification', label: 'Awaiting Review' },
          { key: 'Verified', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition border ${
              statusFilter === tab.key
                ? 'bg-civic-navy text-white border-civic-navy shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Work Orders List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Fetching assigned work orders...</p>
        </div>
      ) : workOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Work Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no tasks matching this filter. Refresh or check back later when new incidents are dispatched.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {workOrders.map((wo) => {
            const inc = wo.incidentId as any;
            const isOverdue =
              new Date(wo.deadline) < new Date() &&
              !['Verified'].includes(wo.status);

            const coords = inc?.canonicalLocation?.coordinates;
            const mapsUrl = coords
              ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
              : null;

            return (
              <div
                key={wo._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden p-4 space-y-3"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-civic-navy bg-slate-100 px-2.5 py-1 rounded-md">
                      {wo.workOrderId}
                    </span>
                    {inc?.effectivePriority && (
                      <UrgencyBadge urgency={inc.effectivePriority} />
                    )}
                  </div>
                  <StatusBadge status={wo.status as any} />
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {inc?.title || 'Municipal Task'}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                    {inc?.standardizedDescription || 'No description available'}
                  </p>
                </div>

                {/* Location & Navigation */}
                {inc?.addressText && (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{inc.addressText}</span>
                    </div>

                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-civic-saffron font-bold text-xs shrink-0 flex items-center gap-1 hover:underline"
                      >
                        Navigate <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* SLA target & Deadlines */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock
                      className={`w-3.5 h-3.5 ${
                        isOverdue ? 'text-red-500' : 'text-slate-400'
                      }`}
                    />
                    <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                      Deadline:{' '}
                      {new Date(wo.deadline).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {isOverdue && (
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      OVERDUE
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  {wo.status === 'Assigned' && (
                    <button
                      onClick={(e) => handleStartWork(wo.workOrderId, e)}
                      disabled={startingId === wo.workOrderId}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <PlayCircle className="w-4 h-4" />
                      {startingId === wo.workOrderId ? 'Starting...' : 'Start Work Now'}
                    </button>
                  )}

                  <Link
                    to={`/worker/tasks/${wo.workOrderId}`}
                    className="flex-1 py-2.5 px-3 bg-civic-navy text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1.5 text-center shadow-xs"
                  >
                    <span>View Task & Resolve</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
