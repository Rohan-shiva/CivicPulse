import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  ExternalLink,
  PlayCircle,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { workerApi } from '../../services/api';
import { IWorkOrder } from '../../types';
import { StatusBadge, UrgencyBadge } from '../../components/StatusBadge';

export const WorkOrderDetailPage: React.FC = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [linkedReports, setLinkedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!workOrderId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await workerApi.getWorkOrderById(workOrderId);
        setWorkOrder(res.workOrder);
        setLinkedReports(res.linkedReports || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [workOrderId]);

  const handleStartWork = async () => {
    if (!workOrderId) return;
    try {
      setStarting(true);
      await workerApi.startWork(workOrderId);
      // Reload
      const res = await workerApi.getWorkOrderById(workOrderId);
      setWorkOrder(res.workOrder);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start work order');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Loading work order details...</p>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error || 'Task not found'}
        </div>
        <button
          onClick={() => navigate('/worker')}
          className="px-4 py-2 text-xs font-bold text-civic-navy bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          &larr; Back to Tasks
        </button>
      </div>
    );
  }

  const inc = workOrder.incidentId as any;
  const isOverdue =
    new Date(workOrder.deadline) < new Date() &&
    !['Verified'].includes(workOrder.status);

  const coords = inc?.canonicalLocation?.coordinates;
  const mapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/worker')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Task List
        </button>

        <span className="font-mono text-xs font-bold text-slate-700">
          {workOrder.workOrderId}
        </span>
      </div>

      {/* Main Task Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-slate-500">
                {inc?.incidentId}
              </span>
              {inc?.effectivePriority && (
                <UrgencyBadge urgency={inc.effectivePriority} />
              )}
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-snug">
              {inc?.title || 'Municipal Task'}
            </h1>
          </div>
          <StatusBadge status={workOrder.status as any} />
        </div>

        {/* Rejection Notice if any */}
        {workOrder.rejectionReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Rework Required: Resolution Rejected</span>
            </div>
            <p className="text-red-700 italic">{workOrder.rejectionReason}</p>
          </div>
        )}

        {/* Standardized Description */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
            Standardized Issue Details
          </p>
          <p>{inc?.standardizedDescription || 'No description provided.'}</p>
        </div>

        {/* Location & Directions */}
        {inc?.addressText && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Incident Location
              </p>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{inc.addressText}</span>
              </div>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-civic-saffron text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs hover:bg-orange-700 transition"
              >
                Directions <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Deadlines */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
            <span>Target Deadline: {new Date(workOrder.deadline).toLocaleString()}</span>
          </div>

          {isOverdue && (
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              SLA Overdue
            </span>
          )}
        </div>
      </div>

      {/* Citizen Evidence Photos & Reports */}
      {linkedReports.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            Citizen Evidence Photos ({linkedReports.length} reports)
          </h2>

          <div className="space-y-3">
            {linkedReports.map((report) => (
              <div key={report._id} className="space-y-2">
                <p className="text-xs text-slate-600 italic">"{report.description}"</p>
                {report.photoUrls && report.photoUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {report.photoUrls.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <img
                          src={url}
                          alt="Citizen evidence"
                          className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-2xs hover:opacity-90"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer (Sticky on Mobile) */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 shadow-lg space-y-2">
        {workOrder.status === 'Assigned' && (
          <button
            onClick={handleStartWork}
            disabled={starting}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <PlayCircle className="w-5 h-5" />
            {starting ? 'Updating Status...' : 'Start Work (Transition to InProgress)'}
          </button>
        )}

        {(workOrder.status === 'InProgress' || workOrder.status === 'Assigned') && (
          <Link
            to={`/worker/tasks/${workOrder.workOrderId}/resolve`}
            className="w-full py-3 bg-civic-navy text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm text-center"
          >
            <Camera className="w-5 h-5 text-civic-saffron" />
            Submit Resolution Evidence
          </Link>
        )}

        {workOrder.status === 'AwaitingVerification' && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 text-center font-medium">
            Resolution submitted & awaiting officer review. You will be notified once verified or if rework is required.
          </div>
        )}

        {workOrder.status === 'Verified' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            This work order has been verified and resolved by the municipal officer.
          </div>
        )}
      </div>
    </div>
  );
};
