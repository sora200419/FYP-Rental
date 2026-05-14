'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;
interface ImageFile { file: File; preview: string; }

export default function KycWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [icFront, setIcFront] = useState<ImageFile | null>(null);
  const [icBack, setIcBack] = useState<ImageFile | null>(null);
  const [selfie, setSelfie] = useState<ImageFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  function handleFile(file: File, setter: (img: ImageFile) => void) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are accepted.'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.'); return;
    }
    setError(null);
    setter({ file, preview: URL.createObjectURL(file) });
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setError('Could not access camera. Please upload a photo instead.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelfie({ file, preview: URL.createObjectURL(blob) });
      stopCamera();
    }, 'image/jpeg', 0.9);
  }

  async function handleSubmit() {
    if (!icFront || !icBack || !selfie) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('icFront', icFront.file);
      body.append('icBack', icBack.file);
      body.append('selfie', selfie.file);
      const res = await fetch('/api/kyc/submit', { method: 'POST', body });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Submission failed');
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Verification submitted</h2>
        <p className="mt-1 text-sm text-gray-500">
          An admin will review your documents and you&apos;ll be notified once approved.
        </p>
        <a href="/dashboard/profile" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Back to profile
        </a>
      </div>
    );
  }

  const stepLabels = ['IC Front', 'IC Back', 'Selfie'];

  return (
    <div className="max-w-lg">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">{stepLabels[step - 1]}</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <UploadStep
          title="Step 1 — IC Front"
          description="Upload a clear photo of the front of your Malaysian MyKad (JPG or PNG, max 10 MB)."
          value={icFront}
          onChange={(f) => handleFile(f, setIcFront)}
          onNext={() => { setError(null); setStep(2); }}
          canNext={!!icFront}
        />
      )}

      {step === 2 && (
        <UploadStep
          title="Step 2 — IC Back"
          description="Upload a clear photo of the back of your Malaysian MyKad (JPG or PNG, max 10 MB)."
          value={icBack}
          onChange={(f) => handleFile(f, setIcBack)}
          onNext={() => { setError(null); setStep(3); }}
          onBack={() => setStep(1)}
          canNext={!!icBack}
        />
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-1 text-base font-semibold text-gray-900">Step 3 — Selfie</h2>
          <p className="mb-4 text-sm text-gray-500">
            Take a selfie so we can verify your face matches your IC photo.
          </p>

          {selfie ? (
            <div className="mb-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selfie.preview} alt="Selfie preview" className="mx-auto h-48 w-48 rounded-xl border border-gray-200 object-cover" />
              <button onClick={() => setSelfie(null)} className="mt-2 block mx-auto text-xs text-red-500 hover:text-red-700">
                Retake
              </button>
            </div>
          ) : cameraActive ? (
            <div className="mb-4 text-center">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline className="mx-auto h-64 w-64 rounded-xl border border-gray-200 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-3 flex justify-center gap-2">
                <button onClick={captureFrame} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Capture
                </button>
                <button onClick={stopCamera} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex flex-col items-center gap-3">
              <button onClick={startCamera} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Open Camera
              </button>
              <p className="text-xs text-gray-400">or</p>
              <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                Upload a photo instead
                <input type="file" accept="image/jpeg,image/png" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, setSelfie); }} />
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { stopCamera(); setStep(2); }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Back
            </button>
            <button onClick={handleSubmit} disabled={!selfie || submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface UploadStepProps {
  title: string; description: string; value: ImageFile | null;
  onChange: (f: File) => void; onNext: () => void; onBack?: () => void; canNext: boolean;
}

function UploadStep({ title, description, value, onChange, onNext, onBack, canNext }: UploadStepProps) {
  return (
    <div>
      <h2 className="mb-1 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-sm text-gray-500">{description}</p>

      <label className="block cursor-pointer">
        <input type="file" accept="image/jpeg,image/png" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.preview} alt="Preview" className="mx-auto h-48 w-full max-w-xs rounded-xl border border-gray-200 object-cover" />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400">
            <svg className="mx-auto mb-2 h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Click to upload (JPG or PNG, max 10 MB)</p>
          </div>
        )}
      </label>

      {value && (
        <label className="mt-2 block cursor-pointer text-center text-xs text-gray-400 hover:text-gray-600">
          Replace photo
          <input type="file" accept="image/jpeg,image/png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
        </label>
      )}

      <div className="mt-6 flex gap-2">
        {onBack && (
          <button onClick={onBack} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            Back
          </button>
        )}
        <button onClick={onNext} disabled={!canNext}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
}
