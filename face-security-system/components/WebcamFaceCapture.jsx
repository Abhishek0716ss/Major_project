"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MODEL_URL = "/models";
const REQUIRED_SAMPLES = 5;
const MIN_DETECTION_SCORE = 0.7;
const MIN_FACE_WIDTH_RATIO = 0.18; // face box width vs. video width — rejects "too far away"
const CAPTURE_INTERVAL_MS = 1200;

// face-api.js touches `window`, so it must only ever be imported on the client,
// inside this component, not at module load time on the server.
let faceapi = null;
let modelsLoaded = false;

export default function WebcamFaceCapture({ onComplete, onReset }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureLoopRef = useRef(null);
  const samplesRef = useRef([]);

  const [phase, setPhase] = useState("idle"); // idle | loading-models | camera-on | capturing | done | error
  const [message, setMessage] = useState("");
  const [samplesTaken, setSamplesTaken] = useState(0);

  const stopEverything = useCallback(() => {
    if (captureLoopRef.current) clearInterval(captureLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopEverything(), [stopEverything]);

  async function loadModelsIfNeeded() {
    if (!faceapi) {
      faceapi = await import("face-api.js");
    }
    if (modelsLoaded) return;
    setPhase("loading-models");
    setMessage("Loading face recognition models…");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  }

  async function startCamera() {
    setMessage("");
    try {
      await loadModelsIfNeeded();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      samplesRef.current = [];
      setSamplesTaken(0);
      setPhase("camera-on");
      setMessage("Position your face in the frame. Capturing will begin automatically.");

      captureLoopRef.current = setInterval(tryCaptureSample, CAPTURE_INTERVAL_MS);
      setPhase("capturing");
    } catch (err) {
      setPhase("error");
      setMessage(
        "Could not access the camera. Check browser permissions and that no other app is using it."
      );
    }
  }

  async function tryCaptureSample() {
    if (!videoRef.current || samplesRef.current.length >= REQUIRED_SAMPLES) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detection) {
      setMessage("No face detected. Center your face in the frame.");
      return;
    }

    const { score, box } = detection.detection;
    const faceWidthRatio = box.width / videoRef.current.videoWidth;

    faceapi.draw.drawDetections(canvas, [detection.detection]);

    if (score < MIN_DETECTION_SCORE) {
      setMessage(`Low detection confidence (${Math.round(score * 100)}%). Improve lighting.`);
      return;
    }
    if (faceWidthRatio < MIN_FACE_WIDTH_RATIO) {
      setMessage("Move closer to the camera.");
      return;
    }

    samplesRef.current.push({
      descriptor: Array.from(detection.descriptor),
      qualityScore: score,
    });
    setSamplesTaken(samplesRef.current.length);
    setMessage(`Captured sample ${samplesRef.current.length} of ${REQUIRED_SAMPLES}.`);

    if (samplesRef.current.length >= REQUIRED_SAMPLES) {
      clearInterval(captureLoopRef.current);
      stopEverything();
      setPhase("done");
      setMessage("Enrollment samples captured.");
      onComplete(samplesRef.current);
    }
  }

  function reset() {
    stopEverything();
    samplesRef.current = [];
    setSamplesTaken(0);
    setPhase("idle");
    setMessage("");
    if (onReset) onReset();
  }

  return (
    <div>
      <div className="video-wrap">
        <video ref={videoRef} muted playsInline width={320} height={240} />
        <canvas ref={canvasRef} width={320} height={240} />
      </div>

      <p className="subtitle" style={{ marginTop: 12, minHeight: 20 }}>{message}</p>

      {(phase === "idle" || phase === "error") && (
        <button className="btn-primary" type="button" onClick={startCamera}>
          Start Camera &amp; Capture Face
        </button>
      )}

      {(phase === "capturing" || phase === "loading-models") && (
        <button className="btn-secondary" type="button" onClick={reset}>
          Cancel ({samplesTaken}/{REQUIRED_SAMPLES})
        </button>
      )}

      {phase === "done" && (
        <>
          <div className="success-box">{REQUIRED_SAMPLES} good samples captured.</div>
          <button className="btn-secondary" type="button" onClick={reset}>
            Recapture
          </button>
        </>
      )}
    </div>
  );
}
