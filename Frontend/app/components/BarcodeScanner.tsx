"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionError, setPermissionError] = useState(false);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);

  // Keep a ref to the latest callback so the effect (which runs once) never
  // captures a stale closure, and so changes to onDetected don't restart the
  // camera stream.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    // Empty deps: start the camera exactly once when the modal mounts.
    const reader = new BrowserMultiFormatReader();
    let mounted = true;

    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result, _error, controls) => {
          if (!mounted || detectedRef.current) return;
          if (result) {
            detectedRef.current = true;
            controls.stop();
            BrowserMultiFormatReader.releaseAllStreams();
            onDetectedRef.current(result.getText());
          }
        }
      )
      .then((controls) => {
        if (!mounted) {
          controls.stop();
          BrowserMultiFormatReader.releaseAllStreams();
        } else {
          controlsRef.current = controls;
        }
      })
      .catch((err: Error) => {
        if (!mounted) return;
        if (err?.name === "NotAllowedError") {
          setPermissionError(true);
        } else {
          setPermissionError(true);
        }
      });

    return () => {
      mounted = false;
      controlsRef.current?.stop();
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white z-10"
          title="Cancel"
        >
          <X className="w-7 h-7" />
        </button>

        {permissionError ? (
          <div className="bg-white rounded-2xl p-6 text-center space-y-3">
            <div className="text-4xl">📷</div>
            <p className="text-gray-800 font-semibold">Camera access denied</p>
            <p className="text-gray-500 text-sm">
              Please allow camera access in your browser settings and try again.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />

            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative w-56 h-36 border-2 border-white/80 rounded-lg bg-transparent z-10">
                {/* Corner accents */}
                <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-green-400 rounded-tl" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-green-400 rounded-tr" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-green-400 rounded-bl" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-green-400 rounded-br" />
                {/* Animated scan line – class defined in globals.css */}
                <div className="absolute inset-x-0 h-0.5 bg-green-400/80 barcode-scan-line" />
              </div>
            </div>

            <p className="absolute bottom-4 inset-x-0 text-center text-white/90 text-sm font-medium">
              Point at a barcode
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
