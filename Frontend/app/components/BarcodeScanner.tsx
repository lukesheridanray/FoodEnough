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
  const [permissionErrorMsg, setPermissionErrorMsg] = useState(
    "Please allow camera access in your browser settings and try again."
  );
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);

  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    let mounted = true;

    function cleanup() {
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      BrowserMultiFormatReader.releaseAllStreams();
    }

    async function start() {
      // 1. Request the camera directly so we control the constraints.
      //    Using `ideal` (not exact) means Chrome falls back to the front
      //    webcam on desktops that have no "environment"-facing camera instead
      //    of silently selecting an IR/depth sensor that produces black frames.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (err: unknown) {
        if (!mounted) return;
        const name = (err as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPermissionErrorMsg(
            "Please allow camera access in your browser settings and try again."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setPermissionErrorMsg("No camera was found on this device.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setPermissionErrorMsg(
            "Camera is already in use by another application."
          );
        } else {
          setPermissionErrorMsg(
            "Could not access the camera. Please try again."
          );
        }
        setPermissionError(true);
        return;
      }

      if (!mounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      // 2. Attach stream to the video element and start playback.
      const video = videoRef.current!;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // play() can be interrupted during cleanup — ignore
        if (!mounted) return;
      }

      if (!mounted) {
        cleanup();
        return;
      }

      // 3. Hand the already-playing video to ZXing for barcode decoding only.
      //    decodeFromVideoElement skips getUserMedia (we did it above) and
      //    just starts the decode loop on the element.
      const reader = new BrowserMultiFormatReader();
      try {
        const controls = await reader.decodeFromVideoElement(
          video,
          (result, _error) => {
            if (!mounted || detectedRef.current) return;
            if (result) {
              detectedRef.current = true;
              cleanup();
              onDetectedRef.current(result.getText());
            }
          }
        );

        if (!mounted) {
          controls.stop();
          cleanup();
        } else {
          controlsRef.current = controls;
        }
      } catch {
        if (!mounted) return;
        setPermissionErrorMsg("Could not start the barcode scanner. Please try again.");
        setPermissionError(true);
        cleanup();
      }
    }

    start();

    return () => {
      mounted = false;
      cleanup();
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
            <p className="text-gray-800 font-semibold">Camera unavailable</p>
            <p className="text-gray-500 text-sm">{permissionErrorMsg}</p>
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
              autoPlay
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
