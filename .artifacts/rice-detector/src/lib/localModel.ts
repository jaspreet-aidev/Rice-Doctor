import * as tf from "@tensorflow/tfjs";
import { useEffect, useRef, useState } from "react";

/* ── Helper: distinguish tf.Shape from tf.Shape[] ────────────────── */
// tf.Shape  = Array<number|null>  — a flat array of dimensions
// tf.Shape[] = nested array       — first element is itself an array
// Array.isArray() returns true for BOTH, so we need the nested check.

function passthroughShape(s: tf.Shape | tf.Shape[]): tf.Shape {
  if (Array.isArray(s) && Array.isArray(s[0])) {
    // s is tf.Shape[] — return first shape
    return (s as tf.Shape[])[0];
  }
  return s as tf.Shape;
}

/* ── Register custom Keras layers that TF.js doesn't know about ─── */

// Data-augmentation layers — identity at inference time (training=False)
// `call` is intentionally NOT marked override — TF.js Layer's call signature
// is abstract/protected in some versions and differs across packages.
class RandomFlip extends tf.layers.Layer {
  static className = "RandomFlip";
  call(inputs: tf.Tensor | tf.Tensor[]) {
    return Array.isArray(inputs) ? inputs[0] : inputs;
  }
  override computeOutputShape(s: tf.Shape | tf.Shape[]) { return passthroughShape(s); }
  getConfig() { return { ...super.getConfig() }; }
}

class RandomRotation extends tf.layers.Layer {
  static className = "RandomRotation";
  call(inputs: tf.Tensor | tf.Tensor[]) {
    return Array.isArray(inputs) ? inputs[0] : inputs;
  }
  override computeOutputShape(s: tf.Shape | tf.Shape[]) { return passthroughShape(s); }
  getConfig() { return { ...super.getConfig() }; }
}

class RandomZoom extends tf.layers.Layer {
  static className = "RandomZoom";
  call(inputs: tf.Tensor | tf.Tensor[]) {
    return Array.isArray(inputs) ? inputs[0] : inputs;
  }
  override computeOutputShape(s: tf.Shape | tf.Shape[]) { return passthroughShape(s); }
  getConfig() { return { ...super.getConfig() }; }
}

// TrueDivide — divides input by 127.5  (scalar constant stripped from inbound_nodes;
// our call() hard-codes the divisor the model originally baked in via args[1]=127.5)
class TrueDivide extends tf.layers.Layer {
  static className = "TrueDivide";
  call(inputs: tf.Tensor | tf.Tensor[]) {
    const t = Array.isArray(inputs) ? inputs[0] : inputs;
    return tf.div(t, tf.scalar(127.5));
  }
  override computeOutputShape(s: tf.Shape | tf.Shape[]) { return passthroughShape(s); }
  getConfig() { return { ...super.getConfig() }; }
}

// Subtract — subtracts 1.0 from input  (maps [0,2] → [-1,1] after ÷127.5)
// Scalar arg stripped from inbound_nodes; hard-coded here.
class SubtractLayer extends tf.layers.Layer {
  static className = "Subtract";
  call(inputs: tf.Tensor | tf.Tensor[]) {
    const t = Array.isArray(inputs) ? inputs[0] : inputs;
    return tf.sub(t, tf.scalar(1.0));
  }
  override computeOutputShape(s: tf.Shape | tf.Shape[]) { return passthroughShape(s); }
  getConfig() { return { ...super.getConfig() }; }
}

// Register all custom classes once at module load
tf.serialization.registerClass(RandomFlip);
tf.serialization.registerClass(RandomRotation);
tf.serialization.registerClass(RandomZoom);
tf.serialization.registerClass(TrueDivide);
tf.serialization.registerClass(SubtractLayer);

/* ── Class mapping ───────────────────────────────────────────────── */
// Classes 0–4 as specified by the model author.
// Classes 5–9 are common MobileNetV2 rice-disease labels — correct if needed.

export const LOCAL_CLASSES: Array<{ en: string; hi: string; isHealthy: boolean }> = [
  { en: "Healthy",            hi: "स्वस्थ",            isHealthy: true  },
  { en: "Brown Spot",         hi: "भूरा धब्बा",         isHealthy: false },
  { en: "Blast Disease",      hi: "झुलसा रोग",          isHealthy: false },
  { en: "Bacterial Blight",   hi: "जीवाणु झुलसा",       isHealthy: false },
  { en: "Sheath Blight",      hi: "शीथ ब्लाइट",        isHealthy: false },
  { en: "Tungro Virus",       hi: "टुंग्रो वायरस",      isHealthy: false },
  { en: "Sheath Rot",         hi: "शीथ रोट",           isHealthy: false },
  { en: "False Smut",         hi: "झूठा कंड",          isHealthy: false },
  { en: "Neck Blast",         hi: "गर्दन झुलसा",        isHealthy: false },
  { en: "Rice Hispa",         hi: "राइस हिस्पा",        isHealthy: false },
];

/* ── Types ───────────────────────────────────────────────────────── */

export interface LocalPrediction {
  classIndex: number;
  className: string;
  classNameHi: string;
  confidence: number; // 0–1
  isHealthy: boolean;
}

export type ModelStatus = "loading" | "ready" | "error";

/* ── Helper: draw a File to a canvas ────────────────────────────── */

export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

/* ── Hook ────────────────────────────────────────────────────────── */

export function useLocalModel() {
  const modelRef = useRef<tf.LayersModel | null>(null);
  const [status, setStatus] = useState<ModelStatus>("loading");

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const url  = `${base}/model/model.json`;

    tf.loadLayersModel(url)
      .then((model) => {
        modelRef.current = model;
        // Warmup: cold-start costs ~200 ms; pay it once at mount time
        const dummy = tf.zeros([1, 224, 224, 3]);
        (model.predict(dummy) as tf.Tensor).dispose();
        dummy.dispose();
        setStatus("ready");
      })
      .catch((err) => {
        console.warn("[localModel] Failed to load:", err);
        setStatus("error");
      });

    return () => {
      modelRef.current?.dispose();
      modelRef.current = null;
    };
  }, []);

  const predict = async (canvas: HTMLCanvasElement): Promise<LocalPrediction | null> => {
    const model = modelRef.current;
    if (!model || status !== "ready") return null;

    try {
      // Model handles its own normalization:  (raw / 127.5) - 1  → [-1, 1]
      // so we pass raw uint8 pixels cast to float32 — do NOT divide by 255.
      const tensor = tf.tidy(() =>
        tf.browser
          .fromPixels(canvas)           // → uint8 [H, W, 3]
          .resizeBilinear([224, 224])   // → [224, 224, 3]
          .toFloat()                    // → float32, values 0–255
          .expandDims(0)                // → [1, 224, 224, 3]
      );

      const output = model.predict(tensor) as tf.Tensor;
      const probs  = Array.from(await output.data() as Float32Array);
      tensor.dispose();
      output.dispose();

      const maxIdx = probs.indexOf(Math.max(...probs));
      const cls    = LOCAL_CLASSES[maxIdx] ?? { en: "Unknown Disease", hi: "अज्ञात रोग", isHealthy: false };

      return {
        classIndex:   maxIdx,
        className:    cls.en,
        classNameHi:  cls.hi,
        confidence:   probs[maxIdx],
        isHealthy:    cls.isHealthy,
      };
    } catch (err) {
      console.warn("[localModel] Prediction error:", err);
      return null;
    }
  };

  return { status, predict };
}
