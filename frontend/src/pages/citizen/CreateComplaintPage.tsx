import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { reportApi } from '../../services/api';
import { LocationPicker } from '../../components/LocationPicker';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { Camera, Upload, CheckCircle2, FileDown, ArrowLeft, AlertCircle, Send } from 'lucide-react';

export const CreateComplaintPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [addressText, setAddressText] = useState<string>('');
  const [nativeTranscript, setNativeTranscript] = useState<string>('');
  const [originalLanguageCode, setOriginalLanguageCode] = useState<string>('en');

  // Location State
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
    source: 'device' | 'exif' | 'manual';
  }>({
    latitude: 12.9716, // Bangalore default center
    longitude: 77.5946,
    source: 'manual',
  });

  const [discrepancyWarning, setDiscrepancyWarning] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    complaintId: string;
    incidentId: string;
    isDuplicate: boolean;
    department?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleVoiceTranscripts = (data: {
    nativeTranscript: string;
    englishTranslation: string;
    detectedLanguage: string;
  }) => {
    setNativeTranscript(data.nativeTranscript);
    setDescription(data.englishTranslation);
    setOriginalLanguageCode(data.detectedLanguage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please provide a complaint description (type or record your voice).');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('longitude', coordinates.longitude.toString());
      formData.append('latitude', coordinates.latitude.toString());
      formData.append('locationSource', coordinates.source);

      if (addressText.trim()) {
        formData.append('addressText', addressText.trim());
      }
      if (nativeTranscript.trim()) {
        formData.append('nativeTranscript', nativeTranscript.trim());
        formData.append('originalLanguageCode', originalLanguageCode);
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await reportApi.submitReport(formData);

      if (res.discrepancyWarning) {
        setDiscrepancyWarning(res.discrepancyWarning);
      }

      setSubmissionResult({
        complaintId: res.complaintId,
        incidentId: res.incidentId,
        isDuplicate: res.isDuplicate,
        department: res.report?.department,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden text-center p-8 space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Complaint Registered Successfully
            </span>
            <h2 className="text-2xl font-bold text-civic-navy mt-3">
              Official Reference ID: {submissionResult.complaintId}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your report has been logged and assigned to the municipal dispatch queue.
            </p>
          </div>

          {/* Incident linking outcome */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-600">Complaint Reference:</span>
              <span className="font-mono font-bold text-civic-navy">{submissionResult.complaintId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-600">Municipal Incident Code:</span>
              <span className="font-mono font-bold text-blue-700">{submissionResult.incidentId}</span>
            </div>
            {submissionResult.isDuplicate && (
              <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px]">
                ℹ️ Note: Other citizens have also reported this issue nearby. Your submission has been linked to fast-track municipal prioritization!
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <a
              href={reportApi.downloadPdfUrl(submissionResult.complaintId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-civic-saffron hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Download Acknowledgement PDF
            </a>

            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-civic-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-civic-navy">
            Report a Civic Issue
          </h1>
          <p className="text-xs text-slate-500">
            Submit photographic evidence, describe the problem, and confirm the location
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Photo Evidence */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <label className="block text-sm font-bold text-civic-navy">
            1. Photo Evidence
          </label>

          {/* Hidden inputs for camera capture vs file upload */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {!photoPreview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-civic-saffron hover:bg-orange-50/40 transition-colors text-slate-600"
              >
                <Camera className="w-8 h-8 text-civic-saffron mb-2" />
                <span className="text-xs font-bold text-civic-navy">Take Photo with Camera</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Captures EXIF GPS location if supported</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-civic-blue hover:bg-blue-50/40 transition-colors text-slate-600"
              >
                <Upload className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-xs font-bold text-civic-navy">Upload from Gallery</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Supports JPEG, PNG, WebP up to 10MB</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-slate-200 max-w-sm mx-auto">
              <img src={photoPreview} alt="Complaint preview" className="w-full h-48 object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-xs rounded font-medium shadow-xs"
              >
                Change Photo
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Voice or Typed Description */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-civic-navy">
            2. Describe the Issue
          </label>

          {/* Voice Recorder Component */}
          <VoiceRecorder
            onTranscriptsReady={handleVoiceTranscripts}
            initialNative={nativeTranscript}
            initialEnglish={description}
          />

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Complaint Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Deep pothole on the middle of the road near the metro pillar, causing traffic jam and hazard to bikers..."
              className="w-full text-xs p-3 border border-slate-300 rounded-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Groq AI will analyze your description to extract department, category, and urgency level.
            </p>
          </div>
        </div>

        {/* Step 3: Location Confirmation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <label className="block text-sm font-bold text-civic-navy">
            3. Pinpoint Location on Map
          </label>

          <LocationPicker
            initialCoordinates={[coordinates.latitude, coordinates.longitude]}
            onLocationChange={(coords) => setCoordinates(coords)}
            discrepancyWarning={discrepancyWarning}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Landmark / Street Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. Near Bus Stop 14, 2nd Cross, Indiranagar"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-civic-saffron hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Analyzing with AI & Filing Complaint...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Official Complaint
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
