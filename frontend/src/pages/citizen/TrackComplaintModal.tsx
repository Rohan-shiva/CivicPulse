import React, { useState, useEffect } from 'react';
import { reportApi } from '../../services/api';
import { StatusBadge, UrgencyBadge } from '../../components/StatusBadge';
import { X, FileDown, MapPin, CheckCircle2, Layers } from 'lucide-react';

interface TrackComplaintModalProps {
  complaintId: string;
  onClose: () => void;
}

export const TrackComplaintModal: React.FC<TrackComplaintModalProps> = ({
  complaintId,
  onClose,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await reportApi.getReport(complaintId);
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load tracking details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [complaintId]);

  const stages = [
    { key: 'SUBMITTED', label: 'Report Filed', desc: 'Complaint registered and verified' },
    { key: 'AI_ASSESSED', label: 'AI Triaged', desc: 'Categorized and department assigned' },
    { key: 'ASSIGNED', label: 'Work Dispatched', desc: 'Assigned to municipal field maintenance crew' },
    { key: 'IN_PROGRESS', label: 'In Progress', desc: 'Work underway at reported location' },
    { key: 'VERIFICATION', label: 'Verification', desc: 'Officer reviewing after-repair evidence' },
    { key: 'RESOLVED', label: 'Resolved', desc: 'Issue resolved and closed' },
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'Open':
        return 1;
      case 'Assigned':
        return 2;
      case 'InProgress':
        return 3;
      case 'AwaitingVerification':
        return 4;
      case 'Resolved':
      case 'Closed':
        return 5;
      default:
        return 0;
    }
  };

  const currentStageIndex = data?.incident?.status ? getStageIndex(data.incident.status) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-civic-navy">{complaintId}</span>
              {data?.incident?.status && <StatusBadge status={data.incident.status} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Live Municipal Resolution Timeline</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-3 border-civic-saffron border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs">Loading complaint tracking data...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Linked Incident Information Banner */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-700" />
                  <span className="text-blue-900 font-semibold">
                    Linked Municipal Incident:
                  </span>
                  <span className="font-mono font-bold text-civic-navy">
                    {data.incident?.incidentId || 'INC-Pending'}
                  </span>
                </div>
                {data.incident?.reportCount > 1 && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-medium">
                    {data.incident.reportCount} Citizens Reported This
                  </span>
                )}
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Resolution Progress
                </h4>
                <div className="space-y-4">
                  {stages.map((stage, idx) => {
                    const isDone = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div key={stage.key} className="flex items-start">
                        <div className="flex flex-col items-center mr-3.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          {idx < stages.length - 1 && (
                            <div
                              className={`w-0.5 h-8 my-1 ${
                                isDone ? 'bg-emerald-600' : 'bg-slate-200'
                              }`}
                            ></div>
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-xs font-semibold ${
                              isCurrent
                                ? 'text-blue-700 font-bold'
                                : isDone
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {stage.label}
                          </p>
                          <p className="text-[11px] text-slate-500">{stage.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details Card */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">Problem Description:</span>
                  <p className="mt-1 text-slate-800 font-medium">{data.description}</p>
                </div>

                {data.nativeTranscript && data.nativeTranscript !== data.description && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Original Spoken Input:</span>
                    <p className="mt-1 text-slate-600 italic">"{data.nativeTranscript}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500">Department:</span>
                    <p className="font-semibold text-slate-800">{data.incident?.department || 'Unassigned'}</p>
                  </div>

                  <div>
                    <span className="text-slate-500">Priority Tier:</span>
                    <div className="mt-0.5">
                      <UrgencyBadge urgency={data.incident?.priority || 'Medium'} />
                    </div>
                  </div>
                </div>

                {data.coordinates && (
                  <div className="pt-2 border-t border-slate-200 flex items-center text-slate-600">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <span>
                      Coordinates: {data.coordinates[1].toFixed(5)}, {data.coordinates[0].toFixed(5)}
                    </span>
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {data.photoUrls?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Submitted Evidence Photos
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {data.photoUrls.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Complaint evidence ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-md border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <a
            href={reportApi.downloadPdfUrl(complaintId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-3.5 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <FileDown className="w-4 h-4 mr-1.5 text-civic-saffron" />
            Download PDF Acknowledgement
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-civic-navy text-white text-xs font-semibold rounded hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
