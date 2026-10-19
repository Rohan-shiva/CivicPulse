import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { municipalApi } from '../../services/api';
import { IVerificationItem, IWorkOrder } from '../../types';
import { UrgencyBadge } from '../../components/StatusBadge';

export const VerificationQueuePage: React.FC = () => {
  const navigate = useNavigate();

  const [queue, setQueue] = useState<IVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingWo, setRejectingWo] = useState<IWorkOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await municipalApi.getVerificationQueue();
      setQueue(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleVerify = async (workOrderId: string) => {
    try {
      setProcessingId(workOrderId);
      setError(null);
      await municipalApi.verifyResolution(workOrderId);
      setSuccessMsg(`Work Order ${workOrderId} verified and marked as Resolved!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchQueue();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to verify resolution');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingWo) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setError('Please provide a specific rejection reason (at least 5 characters).');
      return;
    }

    try {
      setProcessingId(rejectingWo.workOrderId);
      setError(null);
      await municipalApi.rejectResolution(rejectingWo.workOrderId, rejectionReason.trim());
      setSuccessMsg(
        `Work Order ${rejectingWo.workOrderId} rejected and returned to Assigned for rework.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      setRejectingWo(null);
      setRejectionReason('');
      await fetchQueue();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reject work order');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button
            onClick={() => navigate('/officer')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Quality Assurance & Field Audit
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Resolution Verification Queue
          </h1>
          <p className="text-xs text-slate-500">
            Audit field-worker resolution evidence against citizen reports before closing issues
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchQueue().then(() => setRefreshing(false));
          }}
          disabled={refreshing}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-civic-saffron' : ''}`} />
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Content */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-civic-navy border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Loading pending verifications...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Verification Queue is Empty</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are currently no incidents in AwaitingVerification state. All submitted field tasks have been audited!
          </p>
          <Link
            to="/officer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-civic-navy text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
          >
            <span>Return to Priority Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {queue.map(({ incident, workOrders }) => (
            <div
              key={incident._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Incident Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-civic-navy bg-white px-2.5 py-0.5 rounded border border-slate-200">
                      {incident.incidentId}
                    </span>
                    <UrgencyBadge urgency={incident.effectivePriority} />
                    <span className="text-xs font-semibold text-slate-600 uppercase">
                      Dept: {incident.department}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {incident.title}
                  </h2>
                </div>

                <div className="text-xs text-slate-500 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>SLA Deadline: {new Date(incident.slaDeadline).toLocaleString()}</span>
                  </div>
                  {incident.addressText && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{incident.addressText}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-side Evidence Comparison Section */}
              <div className="p-6 space-y-6">
                {workOrders.map((wo) => (
                  <div key={wo._id} className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                      <span className="font-mono font-bold text-slate-800">
                        Work Order: {wo.workOrderId}
                      </span>
                      <span>
                        Submitted:{' '}
                        {wo.submittedAt
                          ? new Date(wo.submittedAt).toLocaleString()
                          : 'Recently'}
                      </span>
                    </div>

                    {/* Side-by-Side Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Original Citizen Complaint */}
                      <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200/60 space-y-3">
                        <div className="flex items-center justify-between text-amber-900">
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            1. Reported Issue & Citizen Evidence
                          </span>
                          <span className="text-[11px] font-medium">
                            {incident.reportCount} report(s)
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-100">
                          {incident.standardizedDescription}
                        </p>
                      </div>

                      {/* Right: Field Worker Resolution Evidence */}
                      <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-200/60 space-y-3">
                        <div className="flex items-center justify-between text-emerald-900">
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            2. Field Worker Resolution Proof
                          </span>
                          <span className="text-[11px] font-medium">
                            {wo.assignedWorkerIds
                              .map((w: any) => (typeof w === 'object' ? w.name : w))
                              .join(', ')}
                          </span>
                        </div>

                        <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 text-xs text-slate-700 leading-relaxed space-y-2">
                          <p className="font-medium">
                            <strong>Action Notes:</strong> {wo.resolutionNotes || 'No notes provided'}
                          </p>

                          {wo.resolutionEvidencePhotoUrls &&
                            wo.resolutionEvidencePhotoUrls.length > 0 && (
                              <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                                  Proof Photos ({wo.resolutionEvidencePhotoUrls.length})
                                </p>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {wo.resolutionEvidencePhotoUrls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0"
                                    >
                                      <img
                                        src={url}
                                        alt="Resolution evidence"
                                        className="w-20 h-20 rounded-lg object-cover border border-slate-200 shadow-2xs hover:opacity-90"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Officer Decision Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setRejectingWo(wo)}
                        disabled={processingId === wo.workOrderId}
                        className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <XCircle className="w-4 h-4" /> Reject & Request Rework
                      </button>

                      <button
                        onClick={() => handleVerify(wo.workOrderId)}
                        disabled={processingId === wo.workOrderId}
                        className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {processingId === wo.workOrderId
                          ? 'Verifying...'
                          : 'Approve & Mark Resolved'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingWo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Return for Field Rework</span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1">
                Reject Resolution for {rejectingWo.workOrderId}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The work order will return to Assigned status. Your reason will be delivered to the assigned workers.
              </p>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this resolution is unacceptable (e.g., photo does not clearly show completed pothole patch, debris remains on site, etc.)..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 leading-relaxed"
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingWo(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectionReason.trim().length < 5 || processingId === rejectingWo.workOrderId}
                  className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
