import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { workerApi } from '../../services/api';
import { IWorkOrder } from '../../types';

export const ResolutionSubmitPage: React.FC = () => {
  const { workOrderId } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState<IWorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchWorkOrder = async () => {
      if (!workOrderId) return;
      try {
        setLoading(true);
        const res = await workerApi.getWorkOrderById(workOrderId);
        setWorkOrder(res.workOrder);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load work order');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkOrder();
  }, [workOrderId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const totalAllowed = 3;
    const remainingSlots = totalAllowed - selectedFiles.length;

    if (files.length > remainingSlots) {
      setError(`You can upload a maximum of ${totalAllowed} evidence photos.`);
    }

    const validNewFiles = files.slice(0, remainingSlots);
    const newFiles = [...selectedFiles, ...validNewFiles];
    setSelectedFiles(newFiles);

    // Create object URLs for previews
    const newPreviews = validNewFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    const updatedFiles = [...selectedFiles];
    const updatedPreviews = [...previewUrls];

    URL.revokeObjectURL(updatedPreviews[index]);
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);

    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderId) return;

    if (!notes.trim()) {
      setError('Please provide notes describing the resolution work done.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('notes', notes.trim());

      selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });

      await workerApi.submitResolution(workOrderId, formData);

      // Clean up object URLs
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      navigate('/worker');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to submit resolution evidence. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Loading task for resolution...</p>
      </div>
    );
  }

  const inc = workOrder?.incidentId as any;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/worker/tasks/${workOrderId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Back
        </button>
        <span className="font-mono text-xs font-bold text-slate-700">
          {workOrderId}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
            Step: Field Verification
          </span>
          <h1 className="text-lg font-black text-slate-900 tracking-tight mt-1.5">
            Submit Resolution Evidence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Document completed work for officer inspection and verification
          </p>
        </div>

        {inc?.title && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
            <span className="font-bold text-slate-800 block">{inc.title}</span>
            <span className="text-slate-500 line-clamp-1">{inc.addressText}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notes Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Resolution Notes & Work Executed *
            </label>
            <textarea
              rows={4}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail actions taken (e.g., pothole patched with hot-mix asphalt, streetlight bulb replaced, garbage cleared and bin disinfected)..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 leading-relaxed"
            ></textarea>
          </div>

          {/* Evidence Photos Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Before / After Photo Proof (Up to 3 Photos)
            </label>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo Previews Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-2xs group">
                  <img
                    src={url}
                    alt="Resolution preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black text-white rounded-full shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add Photo Button */}
              {selectedFiles.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-emerald-600 transition bg-slate-50/50"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-[11px] font-bold">Add Photo</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Clear photos of the resolved issue speed up municipal officer verification.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !notes.trim()}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading Proof & Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Submit Resolution for Verification</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
