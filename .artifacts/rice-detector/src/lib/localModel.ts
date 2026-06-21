import { useEffect, useState } from "react";

export type ModelStatus = "loading" | "ready" | "error";

export interface LocalPrediction {
  classIndex: number;
  className: string;
  classNameHi: string;
  confidence: number; // 0–1
  isHealthy: boolean;
}

/* ── Helper: draw a File to a canvas (unchanged) ────────────────── */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

/* ── Stubbed local model hook ──────────────────────────────────── */
// We intentionally do NOT load TensorFlow.js in the deployed web build.
// The app will use the cloud API for inference. This stub keeps the
// frontend component imports working while disabling local inference.
export function useLocalModel() {
  const [status, setStatus] = useState<ModelStatus>("error");

  useEffect(() => {
    // Immediately mark local model as unavailable in production builds.
    setStatus("error");
  }, []);

  const predict = async (_canvas: HTMLCanvasElement): Promise<LocalPrediction | null> => {
    return null;
  };

  return { status, predict };
}
