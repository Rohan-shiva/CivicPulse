import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { reportApi } from '../../services/api';
import { ICitizenReportItem } from '../../types';
import { StatusBadge, UrgencyBadge } from '../../components/StatusBadge';
import { PlusCircle, Search, FileDown, Eye, AlertCircle, Clock, MapPin, Inbox } from 'lucide-react';
import { TrackComplaintModal } from './TrackComplaintModal';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ICitizenReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.getMyReports();
      setReports(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && ['Open', 'Assigned', 'InProgress', 'AwaitingVerification'].includes(r.incidentStatus)) ||
      (statusFilter === 'RESOLVED' && ['Resolved', 'Closed'].includes(r.incidentStatus));

    return matchesSearch && matchesStatus;
  });

  const activeCount = reports.filter((r) =>
    ['Open', 'Assigned', 'InProgress', 'AwaitingVerification'].includes(r.incidentStatus)
  ).length;

  const resolvedCount = reports.filter((r) =>
    ['Resolved', 'Closed'].includes(r.incidentStatus)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome & Action Banner */}
      <div className="bg-gradient-to-r from-civic-navy to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
            Citizen Public Service Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Welcome back, {user?.name}</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Report local civic hazards such as potholes, overflowing waste bins, broken streetlights, or drainage issues directly to municipal departments.
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center px-5 py-3 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-civic-saffron hover:bg-orange-700 transition-transform active:scale-95 shrink-0"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Submit New Complaint
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Reports</span>
            <Inbox className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-civic-navy mt-2">{reports.length}</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase">Under Resolution</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{activeCount}</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Resolved</span>
            <AlertCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{resolvedCount}</p>
        </div>
      </div>

      {/* Complaints List Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base font-bold text-civic-navy flex items-center">
            My Submitted Complaints
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredReports.length}
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, keyword..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
              />
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-3 py-2 bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Under Resolution</option>
              <option value="RESOLVED">Resolved Only</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-civic-saffron border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Fetching complaint records from municipal database...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={fetchReports}
              className="mt-3 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-medium"
            >
              Retry
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-civic-navy">No Complaints Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't filed any civic complaints matching this view. If you notice a hazard in your ward, file a complaint now.
            </p>
            <Link
              to="/report"
              className="inline-flex items-center px-4 py-2 mt-2 bg-civic-saffron text-white text-xs font-semibold rounded-md hover:bg-orange-700"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              File Your First Complaint
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-civic-navy px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {report.complaintId}
                    </span>
                    <StatusBadge status={report.incidentStatus} />
                    <UrgencyBadge urgency={report.urgency} />
                    <span className="text-[11px] font-semibold text-slate-500">
                      • {report.department}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 line-clamp-2 font-medium">
                    {report.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {new Date(report.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {report.location?.coordinates && (
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Lat: {report.location.coordinates[1].toFixed(4)}, Lng: {report.location.coordinates[0].toFixed(4)}
                      </span>
                    )}

                    {report.photoUrls?.length > 0 && (
                      <span className="text-[11px] text-blue-600 font-medium">
                        📷 {report.photoUrls.length} {report.photoUrls.length === 1 ? 'Photo' : 'Photos'} Attached
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setSelectedComplaintId(report.complaintId)}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Track Status
                  </button>

                  <a
                    href={reportApi.downloadPdfUrl(report.complaintId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                    title="Download Official Receipt"
                  >
                    <FileDown className="w-3.5 h-3.5 mr-1.5 text-civic-saffron" />
                    PDF Receipt
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for tracking single complaint */}
      {selectedComplaintId && (
        <TrackComplaintModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
        />
      )}
    </div>
  );
};
