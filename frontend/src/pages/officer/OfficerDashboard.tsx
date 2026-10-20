import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  Map as MapIcon,
  List,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { municipalApi, taxonomyApi } from '../../services/api';
import {
  IDashboardStats,
  IIncident,
  IIncidentMapFeature,
  IDepartment,
  UrgencyLevel,
} from '../../types';
import { StatusBadge, UrgencyBadge } from '../../components/StatusBadge';
import { IncidentMap } from '../../components/IncidentMap';
import { IncidentDetailModal } from './IncidentDetailModal';

export const OfficerDashboard: React.FC = () => {
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [mapFeatures, setMapFeatures] = useState<IIncidentMapFeature[]>([]);
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('active');
  const [priorityFilter, setPriorityFilter] = useState<UrgencyLevel | ''>('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // View state: 'split' | 'queue' | 'map'
  const [activeView, setActiveView] = useState<'split' | 'queue' | 'map'>('split');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, mapRes, depts] = await Promise.all([
        municipalApi.getDashboard(),
        municipalApi.getIncidentMap(),
        taxonomyApi.getDepartments(),
      ]);

      setStats(statsRes);
      setMapFeatures(mapRes.features);
      setDepartments(depts);
    } catch (err) {
      console.error('Error fetching dashboard aggregations:', err);
    }
  }, []);

  const fetchIncidentQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await municipalApi.getIncidents({
        page: currentPage,
        limit: 10,
        status: statusFilter,
        priority: priorityFilter || undefined,
        department: deptFilter !== 'ALL' ? deptFilter : undefined,
        isOverdue: overdueOnly,
        search: searchTerm.trim() || undefined,
        isDuplicate: duplicatesOnly || undefined,
      });

      setIncidents(res.incidents);
      setTotalIncidents(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching incident queue:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, priorityFilter, deptFilter, overdueOnly, duplicatesOnly, searchTerm]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchIncidentQueue();
  }, [fetchIncidentQueue]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchIncidentQueue()]);
    setRefreshing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Operations Control Center
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Municipal Officer Portal
          </h1>
          <p className="text-xs text-slate-600">
            Real-time incident dispatch, priority queue, SLA monitoring, and verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
            <button
              onClick={() => setActiveView('split')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                activeView === 'split' ? 'bg-civic-navy text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Split
            </button>
            <button
              onClick={() => setActiveView('queue')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                activeView === 'queue' ? 'bg-civic-navy text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Queue
            </button>
            <button
              onClick={() => setActiveView('map')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                activeView === 'map' ? 'bg-civic-navy text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map View
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-civic-saffron' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Active */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Queue</span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats ? stats.totalOpen : '--'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Requiring operational action</p>
        </div>

        {/* Critical Priority */}
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-sm">
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critical Tier</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700">
            {stats ? stats.priorityBreakdown.Critical : '--'}
          </p>
          <p className="text-[11px] text-red-600 mt-0.5">Highest urgency rank</p>
        </div>

        {/* SLA Overdue */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">SLA Overdue</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800">
            {stats ? stats.slaOverdue : '--'}
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">Exceeded target deadline</p>
        </div>

        {/* Awaiting Verification */}
        <Link
          to="/officer/verifications"
          className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm hover:border-purple-400 transition block group"
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider group-hover:underline">Verification</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-800">
            {stats ? stats.awaitingVerification : '--'}
          </p>
          <p className="text-[11px] text-purple-600 mt-0.5">Click to audit & approve &rarr;</p>
        </Link>

        {/* Resolved Today */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800">
            {stats ? stats.resolvedToday : '--'}
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Closed in current cycle</p>
        </div>
      </div>

      {/* Suspected Duplicates Alert Banner */}
      {stats && stats.pendingDuplicateReviews && stats.pendingDuplicateReviews > 0 ? (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-900">
                {stats.pendingDuplicateReviews} Suspected Duplicate Complaint{stats.pendingDuplicateReviews > 1 ? 's' : ''} Pending Review:
              </span>
              <span className="text-amber-800 ml-1.5">
                AI detected civic reports that match existing unresolved incidents nearby.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setDuplicatesOnly(!duplicatesOnly);
              setCurrentPage(1);
            }}
            className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg transition self-start sm:self-auto shrink-0"
          >
            {duplicatesOnly ? 'Show All Incidents' : 'Filter Pending Duplicates'}
          </button>
        </div>
      ) : null}

      {/* Main Content Area: Split, Queue, or Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Map (Visible in 'split' or 'map' views) */}
        {(activeView === 'split' || activeView === 'map') && (
          <div className={activeView === 'split' ? 'lg:col-span-5' : 'lg:col-span-12'}>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-civic-navy" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Geospatial Heatmap ({mapFeatures.length} Active)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-500">Click pin to manage</span>
              </div>

              <IncidentMap
                features={mapFeatures}
                onSelectIncident={(id) => setSelectedIncidentId(id)}
              />
            </div>
          </div>
        )}

        {/* Priority Incident Queue (Visible in 'split' or 'queue' views) */}
        {(activeView === 'split' || activeView === 'queue') && (
          <div className={activeView === 'split' ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Priority Incident Queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sorted by: Priority Rank (Critical &rarr; Low), SLA Deadline, FIFO
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Showing {incidents.length} of {totalIncidents} incidents
                </span>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                {/* Search input */}
                <div className="relative col-span-2 md:col-span-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search incidents..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-civic-navy"
                  />
                </div>

                {/* Department filter */}
                <select
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-civic-navy"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>

                {/* Priority filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value as UrgencyLevel);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-civic-navy"
                >
                  <option value="">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-civic-navy"
                >
                  <option value="active">Active (Open/Assigned/InProgress)</option>
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="InProgress">InProgress</option>
                  <option value="AwaitingVerification">Awaiting Verification</option>
                  <option value="Resolved">Resolved</option>
                </select>

                {/* SLA Overdue Checkbox */}
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={overdueOnly}
                    onChange={(e) => {
                      setOverdueOnly(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span>Overdue Only</span>
                </label>

                {/* Duplicates / Merged Filter */}
                <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer px-2.5 py-1.5 rounded-lg border transition ${
                  duplicatesOnly ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={duplicatesOnly}
                    onChange={(e) => {
                      setDuplicatesOnly(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>🔁 Duplicates / Merged</span>
                </label>
              </div>

              {/* Incidents Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Incident</th>
                      <th className="py-2.5 px-3">Dept</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">SLA Target</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">
                          <div className="inline-block w-6 h-6 border-2 border-civic-navy border-t-transparent rounded-full animate-spin"></div>
                          <p className="mt-2 text-xs">Loading priority incident queue...</p>
                        </td>
                      </tr>
                    ) : incidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500">
                          No incidents found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      incidents.map((inc) => {
                        const isOverdue =
                          new Date(inc.slaDeadline) < new Date() &&
                          !['Resolved', 'Closed'].includes(inc.status);

                        return (
                          <tr key={inc._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-900 block">
                                  {inc.incidentId}
                                </span>
                                {inc.duplicateReviewState === 'pending_review' && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                                    ⚠️ REVIEW
                                  </span>
                                )}
                                {inc.reportCount > 1 && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 rounded">
                                    🔁 {inc.reportCount} merged
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-600 line-clamp-1 font-medium mt-0.5">
                                {inc.title}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-700">{inc.department}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <UrgencyBadge urgency={inc.effectivePriority} />
                            </td>
                            <td className="py-2.5 px-3">
                              <StatusBadge status={inc.status} />
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock
                                  className={`w-3.5 h-3.5 ${
                                    isOverdue ? 'text-red-500' : 'text-slate-400'
                                  }`}
                                />
                                <span
                                  className={`font-mono text-[11px] ${
                                    isOverdue ? 'text-red-600 font-bold' : 'text-slate-600'
                                  }`}
                                >
                                  {new Date(inc.slaDeadline).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => setSelectedIncidentId(inc.incidentId)}
                                className="px-2.5 py-1 text-xs font-semibold bg-civic-navy text-white rounded hover:bg-slate-800 transition inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> Manage
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Incident Detail / Assignment Modal */}
      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
          onIncidentUpdated={() => {
            fetchDashboardData();
            fetchIncidentQueue();
          }}
        />
      )}
    </div>
  );
};
