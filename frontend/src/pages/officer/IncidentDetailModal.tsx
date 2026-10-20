import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  FileText,
  History,
  Users,
} from 'lucide-react';
import { municipalApi } from '../../services/api';
import { IIncident, IFieldWorker, IWorkOrder, IncidentStatus } from '../../types';
import { StatusBadge, UrgencyBadge } from '../../components/StatusBadge';

interface IncidentDetailModalProps {
  incidentId: string;
  onClose: () => void;
  onIncidentUpdated: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incidentId,
  onClose,
  onIncidentUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    incident: IIncident;
    linkedReports: any[];
    workOrders: IWorkOrder[];
    auditLogs: any[];
  } | null>(null);

  const [fieldWorkers, setFieldWorkers] = useState<IFieldWorker[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workerDeptFilter, setWorkerDeptFilter] = useState<'ALL' | 'MATCHING'>('ALL');
  const [assigning, setAssigning] = useState(false);
  const [reviewingDuplicate, setReviewingDuplicate] = useState(false);
  const [newStatus, setNewStatus] = useState<IncidentStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await municipalApi.getIncidentById(incidentId);
      setData(res);

      // Load all available active staff & field workers
      const workers = await municipalApi.getFieldWorkers();
      setFieldWorkers(workers);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [incidentId]);

  const handleReviewDuplicate = async (decision: 'confirm_merge' | 'dismiss') => {
    try {
      setReviewingDuplicate(true);
      setError(null);
      const res = await municipalApi.reviewDuplicate(incidentId, decision);
      setSuccessMsg(res.message || 'Duplicate review completed.');
      await loadDetails();
      onIncidentUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update duplicate review');
    } finally {
      setReviewingDuplicate(false);
    }
  };

  const handleAssignWorkers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkerIds.length === 0) {
      setError('Please select at least one field worker');
      return;
    }

    try {
      setAssigning(true);
      setError(null);
      await municipalApi.assignWorkers(incidentId, selectedWorkerIds);
      setSuccessMsg('Work order assigned successfully!');
      setSelectedWorkerIds([]);
      await loadDetails();
      onIncidentUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to assign workers');
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    try {
      setUpdatingStatus(true);
      setError(null);
      await municipalApi.updateStatus(incidentId, newStatus as IncidentStatus, statusReason);
      setSuccessMsg(`Status updated to ${newStatus}`);
      setNewStatus('');
      setStatusReason('');
      await loadDetails();
      onIncidentUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-civic-navy border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { incident, linkedReports, workOrders, auditLogs } = data;
  const isOverdue =
    new Date(incident.slaDeadline) < new Date() &&
    !['Resolved', 'Closed'].includes(incident.status);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-civic-navy bg-white px-2.5 py-1 rounded-md border border-slate-200">
              {incident.incidentId}
            </span>
            <UrgencyBadge urgency={incident.effectivePriority} />
            <StatusBadge status={incident.status} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle className="w-3 h-3" /> SLA OVERDUE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Suspected Duplicate Review Banner */}
          {incident.duplicateReviewState === 'pending_review' && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    AI Suspected Duplicate Review Required
                  </h4>
                  <p className="text-xs text-amber-800">
                    This incident was flagged by the duplicate detection engine as a potential duplicate of an existing unresolved incident in this area. You can merge it into the active complaint or dismiss the flag to keep it as an independent ticket.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={reviewingDuplicate}
                  onClick={() => handleReviewDuplicate('confirm_merge')}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {reviewingDuplicate ? 'Merging...' : 'Confirm & Merge Duplicate'}
                </button>
                <button
                  type="button"
                  disabled={reviewingDuplicate}
                  onClick={() => handleReviewDuplicate('dismiss')}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  Dismiss Flag (Keep Separate)
                </button>
              </div>
            </div>
          )}

          {/* Incident Overview Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{incident.title}</h2>
                  {incident.duplicateReviewState === 'pending_review' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                      SUSPECTED DUPLICATE
                    </span>
                  )}
                  {incident.reportCount > 1 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded">
                      🔁 {incident.reportCount} Reports Merged
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Dept: {incident.department} • Type: {incident.complaintType}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 shrink-0">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>SLA: {new Date(incident.slaDeadline).toLocaleString()}</span>
                </div>
                <p className="mt-0.5">Reports merged: <strong>{incident.reportCount}</strong></p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
              {incident.standardizedDescription}
            </p>

            {incident.priorityExplanation && (
              <p className="text-xs text-slate-500 italic">
                AI Urgency Assessment: {incident.aiSuggestedUrgency} — {incident.priorityExplanation}
              </p>
            )}

            {incident.addressText && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{incident.addressText}</span>
                <span className="text-slate-400">
                  [{incident.canonicalLocation.coordinates[1].toFixed(5)}, {incident.canonicalLocation.coordinates[0].toFixed(5)}]
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions: Assign Workers & Change Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assign Workers Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-civic-saffron" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Assign Field Workers
                  </h3>
                </div>
                {/* Department Filter Toggle */}
                <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setWorkerDeptFilter('ALL')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      workerDeptFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    All Staff ({fieldWorkers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkerDeptFilter('MATCHING')}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      workerDeptFilter === 'MATCHING' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    {incident.department} Dept
                  </button>
                </div>
              </div>

              <form onSubmit={handleAssignWorkers} className="space-y-3">
                {(() => {
                  const filteredWorkers = fieldWorkers.filter((w) => {
                    if (workerDeptFilter === 'ALL') return true;
                    if (!w.departmentName || w.departmentName.toUpperCase() === 'ALL') return true;
                    return (
                      w.departmentName.toUpperCase().includes(incident.department.toUpperCase()) ||
                      incident.department.toUpperCase().includes(w.departmentName.toUpperCase())
                    );
                  });

                  if (filteredWorkers.length === 0) {
                    return (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 text-center space-y-1">
                        <p className="font-medium">No staff found for {incident.department} department.</p>
                        <p className="text-[11px] text-slate-400">
                          Switch to &ldquo;All Staff&rdquo; above to assign any registered team member.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                      {filteredWorkers.map((w) => {
                        const isMatch =
                          w.departmentName &&
                          (w.departmentName.toUpperCase().includes(incident.department.toUpperCase()) ||
                            incident.department.toUpperCase().includes(w.departmentName.toUpperCase()));

                        return (
                          <label
                            key={w._id}
                            className={`flex items-center justify-between text-xs p-1.5 rounded cursor-pointer transition ${
                              selectedWorkerIds.includes(w._id)
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-white border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedWorkerIds.includes(w._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedWorkerIds([...selectedWorkerIds, w._id]);
                                  } else {
                                    setSelectedWorkerIds(selectedWorkerIds.filter((id) => id !== w._id));
                                  }
                                }}
                                className="rounded border-slate-300 text-civic-navy focus:ring-civic-navy"
                              />
                              <div>
                                <span className="font-semibold text-slate-800">{w.name}</span>
                                <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                                  {w.phone}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isMatch && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                  MATCH
                                </span>
                              )}
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                                {w.departmentName || 'General'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={assigning || selectedWorkerIds.length === 0}
                  className="w-full py-2 px-3 text-xs font-semibold bg-civic-navy text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {assigning ? 'Dispatching...' : `Dispatch Work Order (${selectedWorkerIds.length})`}
                </button>
              </form>
            </div>

            {/* Change Status Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-civic-green" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Transition Status
                </h3>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IncidentStatus)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-civic-navy"
                >
                  <option value="">Select new status...</option>
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="InProgress">InProgress</option>
                  <option value="AwaitingVerification">AwaitingVerification</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Reopened">Reopened</option>
                </select>

                <input
                  type="text"
                  placeholder="Optional audit reason..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-civic-navy"
                />

                <button
                  type="submit"
                  disabled={updatingStatus || !newStatus}
                  className="w-full py-2 px-3 text-xs font-semibold bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {updatingStatus ? 'Updating...' : 'Update Incident Status'}
                </button>
              </form>
            </div>
          </div>

          {/* Linked Work Orders */}
          {workOrders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Work Orders ({workOrders.length})
              </h3>
              <div className="space-y-2">
                {workOrders.map((wo) => (
                  <div
                    key={wo._id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800">{wo.workOrderId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                        {wo.status}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Assigned workers:{' '}
                      {wo.assignedWorkerIds
                        .map((w: any) => (typeof w === 'object' ? w.name : w))
                        .join(', ')}
                    </div>

                    {wo.resolutionNotes && (
                      <div className="bg-white p-2 rounded border border-slate-200 text-slate-700">
                        <strong>Resolution Notes:</strong> {wo.resolutionNotes}
                      </div>
                    )}

                    {wo.resolutionEvidencePhotoUrls && wo.resolutionEvidencePhotoUrls.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pt-1">
                        {wo.resolutionEvidencePhotoUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Resolution Evidence"
                            className="w-16 h-16 rounded object-cover border border-slate-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Citizen Reports */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Linked Citizen Reports ({linkedReports.length})
            </h3>
            <div className="space-y-2">
              {linkedReports.map((report) => (
                <div
                  key={report._id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono font-bold text-slate-700">{report.complaintId}</span>
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800">{report.description}</p>
                  {report.photoUrls && report.photoUrls.length > 0 && (
                    <div className="flex gap-2">
                      {report.photoUrls.map((url: string, idx: number) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Citizen evidence"
                          className="w-14 h-14 rounded object-cover border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                  {report.reporterId && (
                    <p className="text-[11px] text-slate-500">
                      Reported by: <strong>{report.reporterId.name || 'Anonymous'}</strong> ({report.reporterId.phone})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audit History */}
          {auditLogs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Audit Trail ({auditLogs.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 text-[11px]">
                {auditLogs.map((log) => (
                  <div key={log._id} className="p-1.5 bg-white rounded border border-slate-100 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-800 uppercase">{log.action}</span>
                      <span className="text-slate-500 ml-2">by {log.actorRole} ({log.actorId?.name || 'System'})</span>
                      {log.reason && <p className="text-slate-600 mt-0.5 italic">{log.reason}</p>}
                    </div>
                    <span className="text-slate-400 shrink-0 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
