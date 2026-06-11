import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDetectDisease } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Sprout,
  ShieldAlert,
  Activity,
  Leaf,
  AlertCircle,
  Droplet,
  Sun,
  ShieldCheck,
  RefreshCcw,
  CheckCircle2,
  Languages,
  ShoppingBag,
  IndianRupee,
  Volume2,
  AlertTriangle,
  Clock,
  Camera,
  CameraOff,
  ImageIcon,
  Circle,
  RotateCcw,
  ScanLine,
  ZoomIn,
  CloudUpload,
  Microscope,
  Pill,
  Hourglass,
} from "lucide-react";

/* ── Image compression ───────────────────────────────────────────── */

async function compressImage(file: File, maxPx = 800, maxKB = 500): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let quality = 0.92;
      const attempt = () => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size <= maxKB * 1024 || quality <= 0.45) {
            resolve(new File([blob], "leaf.jpg", { type: "image/jpeg" }));
          } else {
            quality = Math.round((quality - 0.1) * 100) / 100;
            attempt();
          }
        }, "image/jpeg", quality);
      };
      attempt();
    };
    img.onerror = () => resolve(file);
    img.src = blobUrl;
  });
}

/* ── Loading steps ───────────────────────────────────────────────── */

const LOADING_STEPS = [
  { en: "Uploading photo…",     hi: "फोटो भेज रहे हैं…",          icon: <CloudUpload className="w-10 h-10" />, emoji: "📤" },
  { en: "Analyzing leaf…",      hi: "पत्ते की जांच हो रही है…",   icon: <Microscope  className="w-10 h-10" />, emoji: "🔬" },
  { en: "Finding treatment…",   hi: "इलाज खोज रहे हैं…",          icon: <Pill        className="w-10 h-10" />, emoji: "💊" },
  { en: "Almost ready…",        hi: "बस थोड़ा और…",               icon: <Hourglass   className="w-10 h-10" />, emoji: "⏳" },
];

/* ── Medicine lookup ─────────────────────────────────────────────── */

interface Medicine { name: string; price: string; }

const MEDICINE_MAP: Array<{ keywords: string[]; medicines: Medicine[] }> = [
  {
    keywords: ["brown spot", "helminthosporium", "भूरा धब्बा"],
    medicines: [
      { name: "Mancozeb 75% WP", price: "₹150–200" },
      { name: "Tebuconazole 25% EC", price: "₹200–250" },
    ],
  },
  {
    keywords: ["blast", "magnaporthe", "झुलसा"],
    medicines: [
      { name: "Tricyclazole 75% WP", price: "₹180–220" },
      { name: "Isoprothiolane 40% EC", price: "₹150–200" },
    ],
  },
  {
    keywords: ["bacterial blight", "xanthomonas", "जीवाणु झुलसा"],
    medicines: [
      { name: "Streptomycin Sulphate", price: "₹100–150" },
      { name: "Copper Oxychloride", price: "₹120–160" },
    ],
  },
];

function getMedicines(name: string): Medicine[] | null {
  const lower = name.toLowerCase();
  for (const e of MEDICINE_MAP)
    if (e.keywords.some((k) => lower.includes(k))) return e.medicines;
  return null;
}

/* ── Urgency ─────────────────────────────────────────────────────── */

type Urgency = "red" | "yellow" | "green";

function getUrgency(isHealthy: boolean, severity?: string | null): Urgency {
  if (isHealthy) return "green";
  if (severity === "Severe" || severity === "Moderate" || severity === "गंभीर" || severity === "मध्यम") return "red";
  return "yellow";
}

/* ── Voice ───────────────────────────────────────────────────────── */

function speakHindi(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "hi-IN"; u.rate = 0.82; u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

/* ── UI strings ──────────────────────────────────────────────────── */

type Lang = "en" | "hi";

const ui = {
  en: {
    appName: "Kisan Mitra", appSubtitle: "Rice crop field companion", langToggle: "हिंदी",
    useCamera: "Open Live Camera", useGallery: "Choose from Gallery",
    uploadTitle: "Scan a rice leaf", uploadDesc: "Use the live camera or pick a photo from your gallery.",
    compressing: "Optimizing photo…",
    cameraTitle: "Point camera at the leaf",
    hint1: "Hold phone 20 cm from leaf", hint2: "Make sure leaf fills the frame",
    placeLeaf: "Place leaf here",
    captureBtn: "Capture", switchCamera: "Flip camera",
    cameraError: "Camera not available. Use gallery instead.",
    previewTitle: "Is this photo clear?", previewDesc: "The leaf should be sharp and well-lit.",
    retake: "Retake", scanNow: "Scan Now",
    trustLine1: "PlantNet + AI powered", trustLine2: "Instant results",
    errorTitle: "Could not analyze", errorDesc: "Photo not clear. Take a closer photo of the leaf.",
    tryAgain: "Try Again", newPhoto: "Take New Photo",
    lowConfTitle: "Photo unclear — please retake",
    lowConfDesc: "The leaf was not visible clearly. Move to better lighting and hold the phone closer.",
    retakePhoto: "Retake Photo",
    healthy: "Healthy", diseased: "Diseased",
    severity: (s: string) => `${s} Severity`,
    confidence: (c: string) => `${c} Confidence`,
    plantId: "PlantNet ID", symptoms: "Symptoms Visible",
    treatmentPlan: "Treatment Plan", immediate: "Do This Now",
    chemical: "Chemical Spray", organic: "Natural Remedy", prevention: "Prevention",
    scanAnother: "Scan Another Plant", hindiSection: "हिंदी में जानकारी",
    whereToBuy: "Where to Buy Medicine",
    whereToBuyDesc: "Available at local Krishi Seva Kendra or agri shop",
    urgency: {
      red:    { label: "Treat urgently — within 2 days", sub: "Crop is at serious risk" },
      yellow: { label: "Treat within a week",            sub: "Early stage — act soon" },
      green:  { label: "Crop is healthy",                sub: "No treatment needed" },
    },
    speakBtn: "Hear in Hindi",
  },
  hi: {
    appName: "किसान मित्र", appSubtitle: "धान की फसल का साथी", langToggle: "English",
    useCamera: "लाइव कैमरा खोलो", useGallery: "गैलरी से फोटो चुनो",
    uploadTitle: "धान के पत्ते की जांच करो", uploadDesc: "लाइव कैमरे से फोटो लो या गैलरी से फोटो चुनो।",
    compressing: "फोटो तैयार हो रही है…",
    cameraTitle: "पत्ते पर कैमरा लगाओ",
    hint1: "पत्ते से 20 सेंटीमीटर दूर रखो फोन", hint2: "पत्ता पूरे फ्रेम में आना चाहिए",
    placeLeaf: "पत्ती यहाँ रखें",
    captureBtn: "फोटो लो", switchCamera: "कैमरा बदलो",
    cameraError: "कैमरा नहीं मिला। गैलरी से फोटो चुनो।",
    previewTitle: "क्या फोटो साफ है?", previewDesc: "पत्ता साफ और रोशनी में दिखना चाहिए।",
    retake: "दोबारा लो", scanNow: "अभी जांचो",
    trustLine1: "AI से जांच होती है", trustLine2: "फटाफट नतीजा",
    errorTitle: "पता नहीं चला", errorDesc: "फोटो साफ नहीं है। पत्ते के और पास से फोटो लो।",
    tryAgain: "फिर कोशिश करो", newPhoto: "नई फोटो लो",
    lowConfTitle: "फोटो साफ नहीं — दोबारा लो",
    lowConfDesc: "पत्ता ठीक से नहीं दिखा। अच्छी रोशनी में और पास से फोटो लो।",
    retakePhoto: "दोबारा फोटो लो",
    healthy: "ठीक है", diseased: "बीमार है",
    severity: (s: string) => ({ Severe: "बहुत खराब", Moderate: "ठीक-ठाक खराब", Mild: "थोड़ा खराब" }[s] ?? s),
    confidence: (c: string) => ({ High: "पक्का", Medium: "शायद", Low: "अंदाज़ा" }[c] ?? c),
    plantId: "पौधे की पहचान", symptoms: "ये लक्षण दिखे",
    treatmentPlan: "इलाज करो", immediate: "अभी करो",
    chemical: "दवाई डालो", organic: "देसी उपाय", prevention: "आगे से बचाव",
    scanAnother: "दूसरे पौधे की जांच करो", hindiSection: "English Information",
    whereToBuy: "दवाई कहाँ मिलेगी",
    whereToBuyDesc: "नजदीकी कृषि सेवा केंद्र या खाद-बीज की दुकान पर मिलेगी",
    urgency: {
      red:    { label: "2 दिन के अंदर दवा दो",   sub: "फसल को खतरा है — देर मत करो" },
      yellow: { label: "एक हफ्ते में दवा दो",    sub: "अभी शुरुआत है — जल्दी करो" },
      green:  { label: "फसल बिल्कुल ठीक है",    sub: "कोई दवाई नहीं चाहिए" },
    },
    speakBtn: "हिंदी में सुनो",
  },
} as const;

/* ── Urgency banner config ───────────────────────────────────────── */

const URGENCY_STYLE: Record<Urgency, { bg: string; border: string; icon: React.ReactNode; textColor: string }> = {
  red:    { bg: "bg-red-50",    border: "border-red-500",    textColor: "text-red-900",    icon: <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" /> },
  yellow: { bg: "bg-amber-50",  border: "border-amber-500",  textColor: "text-amber-900",  icon: <Clock         className="w-7 h-7 text-amber-600 shrink-0" /> },
  green:  { bg: "bg-green-50",  border: "border-green-500",  textColor: "text-green-900",  icon: <CheckCircle2  className="w-7 h-7 text-green-600 shrink-0" /> },
};

/* ── App state ───────────────────────────────────────────────────── */

type AppState = "chooser" | "compressing" | "camera" | "preview" | "loading" | "result" | "low_confidence" | "error";

/* ── Component ───────────────────────────────────────────────────── */

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [appState, setAppState] = useState<AppState>("chooser");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashCapture, setFlashCapture] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tx = ui[lang];
  const detectDisease = useDetectDisease();
  const result = detectDisease.data;
  const error  = detectDisease.error;

  /* ── Loading step cycling ─────────────────────────────────────── */

  useEffect(() => {
    if (appState !== "loading") { setLoadingStep(0); return; }
    setLoadingStep(0);
    let step = 0;
    const id = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 1600);
    return () => clearInterval(id);
  }, [appState]);

  /* ── Camera helpers ───────────────────────────────────────────── */

  const stopStream = useCallback((s?: MediaStream | null) => {
    (s ?? stream)?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const startCamera = useCallback(async (facing: "environment" | "user" = facingMode) => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      setStream(s);
      setAppState("camera");
    } catch {
      setCameraError(tx.cameraError);
      setAppState("chooser");
    }
  }, [facingMode, tx.cameraError]);

  useEffect(() => {
    if (stream && videoRef.current && appState === "camera") {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, appState]);

  useEffect(() => () => { stopStream(); }, []);

  const switchCamera = async () => {
    stopStream();
    const next: "environment" | "user" = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    setFlashCapture(true);
    setTimeout(() => setFlashCapture(false), 180);
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const url  = URL.createObjectURL(blob);
      stopStream(); setStream(null);
      setImageFile(file); setSelectedImage(url);
      setAppState("preview");
    }, "image/jpeg", 0.92);
  };

  /* ── File upload ──────────────────────────────────────────────── */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setSelectedImage(URL.createObjectURL(file));
    setAppState("preview");
  };

  /* ── Scan (with compression) ──────────────────────────────────── */

  const handleScan = async () => {
    if (!imageFile) return;

    // Compress first
    setAppState("compressing");
    const compressed = await compressImage(imageFile, 800, 500);
    setImageFile(compressed);
    // Refresh preview URL with compressed version
    setSelectedImage(URL.createObjectURL(compressed));

    setAppState("loading");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      detectDisease.mutate(
        { data: { imageBase64: dataUrl.split(",")[1], mimeType: "image/jpeg" } },
        {
          onSuccess: (data) => {
            // Confidence threshold: if plantNetScore < 0.7, show low-confidence screen
            if (data.plantNetScore !== null && data.plantNetScore !== undefined && data.plantNetScore < 0.7) {
              setAppState("low_confidence");
            } else {
              setAppState("result");
            }
          },
          onError: () => setAppState("error"),
        }
      );
    };
    reader.readAsDataURL(compressed);
  };

  /* ── Voice ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!result || appState !== "result") return;
    const nameHi = result.diseaseNameHi ?? result.diseaseName;
    const urg = getUrgency(result.isHealthy, result.severity);
    const urgText = ui.hi.urgency[urg].label;
    const treatHi = result.treatmentHi?.immediate ?? result.treatment?.immediate ?? "";
    const speech = result.isHealthy
      ? "आपकी फसल बिल्कुल ठीक है। कोई बीमारी नहीं है।"
      : `आपकी फसल में ${nameHi} बीमारी है। ${urgText}। ${treatHi}`;
    const t = setTimeout(() => speakHindi(speech), 600);
    return () => clearTimeout(t);
  }, [result, appState]);

  const handleSpeakAgain = () => {
    if (!result) return;
    const nameHi = result.diseaseNameHi ?? result.diseaseName;
    const urg = getUrgency(result.isHealthy, result.severity);
    const speech = result.isHealthy
      ? "आपकी फसल बिल्कुल ठीक है।"
      : `आपकी फसल में ${nameHi} बीमारी है। ${ui.hi.urgency[urg].label}। ${result.treatmentHi?.immediate ?? ""}`;
    speakHindi(speech);
  };

  /* ── Reset ────────────────────────────────────────────────────── */

  const resetScan = () => {
    stopStream(); setStream(null);
    setSelectedImage(null); setImageFile(null); setCameraError(null);
    detectDisease.reset();
    window.speechSynthesis?.cancel();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAppState("chooser");
  };

  const retake = () => {
    setSelectedImage(null); setImageFile(null);
    detectDisease.reset();
    setAppState("chooser");
  };

  const toggleLang = () => setLang((l) => (l === "en" ? "hi" : "en"));

  /* ── Derived display values ───────────────────────────────────── */

  const medicines    = result ? getMedicines(`${result.diseaseName} ${result.diseaseNameHi ?? ""}`) : null;
  const urgency      = result ? getUrgency(result.isHealthy, result.severity) : null;
  const diseaseName  = lang === "hi" ? result?.diseaseNameHi  : result?.diseaseName;
  const description  = lang === "hi" ? result?.descriptionHi  : result?.description;
  const symptoms     = lang === "hi" ? result?.symptomsHi     : result?.symptoms;
  const treatment    = lang === "hi" ? result?.treatmentHi    : result?.treatment;
  const altName      = lang === "hi" ? result?.diseaseName    : result?.diseaseNameHi;
  const altDesc      = lang === "hi" ? result?.description    : result?.descriptionHi;
  const altSymptoms  = lang === "hi" ? result?.symptoms       : result?.symptomsHi;
  const altTreatment = lang === "hi" ? result?.treatment      : result?.treatmentHi;

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-12">

      {/* Header */}
      <header className="bg-primary text-primary-foreground py-5 px-4 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />
        <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2.5 rounded-full">
              <Sprout className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{tx.appName}</h1>
              <p className="text-primary-foreground/85 text-sm font-semibold">{tx.appSubtitle}</p>
            </div>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 bg-primary-foreground/20 hover:bg-primary-foreground/30 active:bg-primary-foreground/40 transition-colors px-4 py-2.5 rounded-full text-base font-bold text-primary-foreground min-h-[48px]"
          >
            <Languages className="w-5 h-5" />
            {tx.langToggle}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-3 mt-5">

        {/* ── Chooser ── */}
        {appState === "chooser" && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-3">
            {cameraError && (
              <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 text-amber-900 text-sm font-semibold">
                <CameraOff className="w-5 h-5 shrink-0 text-amber-700" />
                {cameraError}
              </div>
            )}
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-5">
                <ScanLine className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-2">{tx.uploadTitle}</h2>
              <p className="text-foreground/70 text-base font-medium max-w-xs leading-relaxed">{tx.uploadDesc}</p>
            </div>
            <button
              onClick={() => startCamera()}
              className="w-full bg-primary text-primary-foreground font-extrabold text-xl rounded-2xl shadow-lg active:opacity-90 transition-opacity flex items-center justify-center gap-3"
              style={{ minHeight: 80 }}
            >
              <Camera className="w-7 h-7" />
              {tx.useCamera}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-primary/40 text-primary bg-primary/5 font-bold text-lg rounded-2xl active:bg-primary/15 transition-colors flex items-center justify-center gap-3"
              style={{ minHeight: 68 }}
            >
              <ImageIcon className="w-6 h-6" />
              {tx.useGallery}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
            <div className="flex gap-3 text-sm font-semibold text-foreground/60 justify-center items-center pt-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>{tx.trustLine1}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span>{tx.trustLine2}</span>
            </div>
          </div>
        )}

        {/* ── Live Camera ── */}
        {appState === "camera" && (
          <div className="animate-in fade-in duration-200 space-y-3">
            {/* Hints */}
            <div className="grid grid-cols-2 gap-2">
              {[tx.hint1, tx.hint2].map((hint, i) => (
                <div key={i} className="bg-primary/10 border-2 border-primary/25 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-primary leading-tight">{hint}</span>
                </div>
              ))}
            </div>

            {/* Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl">
              {flashCapture && <div className="absolute inset-0 bg-white z-20 pointer-events-none" />}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className="w-full block"
                style={{ aspectRatio: "4/3", objectFit: "cover" }}
              />

              {/* Target box overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Dark vignette outside box */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Green target rectangle */}
                <div className="relative z-10 border-4 border-green-400 rounded-2xl flex flex-col items-center justify-end pb-3"
                  style={{ width: "74%", height: "68%" }}>
                  {/* Corner accents */}
                  {(["top-0 left-0 border-l-4 border-t-4 rounded-tl-xl",
                     "top-0 right-0 border-r-4 border-t-4 rounded-tr-xl",
                     "bottom-0 left-0 border-l-4 border-b-4 rounded-bl-xl",
                     "bottom-0 right-0 border-r-4 border-b-4 rounded-br-xl"] as const).map((cls, i) => (
                    <div key={i} className={`absolute ${cls} w-7 h-7 border-green-300`} />
                  ))}
                  {/* Label inside box */}
                  <div className="bg-black/65 rounded-xl px-4 py-2 text-center">
                    <p className="text-white font-extrabold text-sm leading-tight">{tx.placeLeaf}</p>
                    {lang === "en" && <p className="text-white/75 text-xs font-semibold mt-0.5">पत्ती यहाँ रखें</p>}
                    {lang === "hi" && <p className="text-white/75 text-xs font-semibold mt-0.5">Place leaf here</p>}
                  </div>
                </div>
              </div>

              {/* Top title */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-4 pt-3 pb-8 z-10">
                <p className="text-white text-sm font-bold text-center">{tx.cameraTitle}</p>
              </div>

              {/* Flip camera */}
              <button onClick={switchCamera} className="absolute top-3 right-3 z-10 bg-black/55 text-white rounded-full p-2.5 active:bg-black/75">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Capture row */}
            <div className="flex items-center justify-center gap-6 py-2">
              <button
                onClick={() => { stopStream(); setStream(null); setAppState("chooser"); }}
                className="w-14 h-14 rounded-full bg-muted border-2 border-border flex items-center justify-center active:bg-muted/70"
              >
                <CameraOff className="w-6 h-6 text-foreground/70" />
              </button>
              {/* Big capture button */}
              <button
                onClick={capturePhoto}
                className="relative w-24 h-24 rounded-full bg-white border-4 border-primary shadow-xl active:scale-95 transition-transform flex items-center justify-center"
                aria-label={tx.captureBtn}
              >
                <Circle className="w-16 h-16 text-primary fill-primary" />
              </button>
              <div className="w-14 h-14" />
            </div>
            <p className="text-center text-base font-bold text-primary">{tx.captureBtn}</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* ── Compressing ── */}
        {appState === "compressing" && (
          <div className="animate-in fade-in duration-200 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
              <CloudUpload className="w-10 h-10 text-primary" />
            </div>
            <p className="text-2xl font-extrabold text-foreground">{tx.compressing}</p>
          </div>
        )}

        {/* ── Preview ── */}
        {appState === "preview" && selectedImage && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[tx.hint1, tx.hint2].map((hint, i) => (
                <div key={i} className="bg-primary/10 border-2 border-primary/25 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-bold text-primary leading-tight">{hint}</span>
                </div>
              ))}
            </div>
            <Card className="overflow-hidden shadow-sm border-2">
              <div className="w-full bg-black/5" style={{ aspectRatio: "4/3" }}>
                <img src={selectedImage} alt="Crop preview" className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-extrabold text-xl mb-1 text-foreground">{tx.previewTitle}</h3>
                <p className="text-foreground/65 font-semibold mb-5">{tx.previewDesc}</p>
                <div className="flex gap-3">
                  <button onClick={retake}
                    className="flex-1 border-2 border-border rounded-xl font-bold text-lg text-foreground bg-background active:bg-muted flex items-center justify-center gap-2"
                    style={{ minHeight: 64 }}>
                    <RotateCcw className="w-5 h-5" /> {tx.retake}
                  </button>
                  <button onClick={handleScan}
                    className="rounded-xl font-extrabold text-xl flex items-center justify-center gap-2 active:opacity-90 px-6 bg-primary text-primary-foreground"
                    style={{ minHeight: 64, flex: 2 }}>
                    <ScanLine className="w-6 h-6" /> {tx.scanNow}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Loading (step-by-step) ── */}
        {appState === "loading" && (
          <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-14 text-center">
            {/* Animated icon */}
            <div className="w-28 h-28 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center mb-8 relative">
              <div className="w-28 h-28 border-4 border-primary rounded-full border-t-transparent animate-spin absolute inset-0" />
              <span className="text-4xl z-10">{LOADING_STEPS[loadingStep].emoji}</span>
            </div>

            {/* Step text */}
            <div className="animate-in fade-in duration-300" key={loadingStep}>
              <p className="text-2xl font-extrabold text-foreground mb-2">
                {lang === "hi" ? LOADING_STEPS[loadingStep].hi : LOADING_STEPS[loadingStep].en}
              </p>
              <p className="text-base font-semibold text-foreground/55">
                {lang === "en" ? LOADING_STEPS[loadingStep].hi : LOADING_STEPS[loadingStep].en}
              </p>
            </div>

            {/* Step dots */}
            <div className="flex gap-2 mt-8">
              {LOADING_STEPS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-500 ${
                  i === loadingStep ? "w-6 h-3 bg-primary" : "w-3 h-3 bg-primary/25"
                }`} />
              ))}
            </div>

            <div className="w-full max-w-sm mt-8 space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* ── Low confidence ── */}
        {appState === "low_confidence" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
            <div className="bg-amber-50 border-4 border-amber-400 rounded-2xl px-5 py-6 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📷</span>
              </div>
              <h3 className="text-2xl font-extrabold text-amber-900 mb-2">{tx.lowConfTitle}</h3>
              <p className="text-amber-800 font-semibold text-base leading-relaxed">{tx.lowConfDesc}</p>
            </div>
            <button onClick={resetScan}
              className="w-full bg-primary text-primary-foreground rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 shadow-md active:opacity-90"
              style={{ minHeight: 76 }}>
              <Camera className="w-6 h-6" /> {tx.retakePhoto}
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {appState === "error" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-6 w-6" />
              <AlertTitle className="text-xl font-extrabold">{tx.errorTitle}</AlertTitle>
              <AlertDescription className="text-base font-semibold mt-1">{error?.error || tx.errorDesc}</AlertDescription>
            </Alert>
            <button onClick={handleScan}
              className="w-full bg-destructive text-white rounded-xl font-bold text-xl flex items-center justify-center gap-2 active:opacity-90"
              style={{ minHeight: 68 }}>
              <RefreshCcw className="w-6 h-6" /> {tx.tryAgain}
            </button>
            <button onClick={resetScan}
              className="w-full border-2 border-border rounded-xl font-bold text-lg text-foreground bg-background flex items-center justify-center active:bg-muted"
              style={{ minHeight: 60 }}>
              {tx.newPhoto}
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {appState === "result" && result && urgency && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">

            {/* Urgency banner */}
            <div className={`${URGENCY_STYLE[urgency].bg} border-4 ${URGENCY_STYLE[urgency].border} rounded-2xl px-5 py-5 flex items-center gap-4`}>
              {URGENCY_STYLE[urgency].icon}
              <div className="flex-1">
                <p className={`text-xl font-extrabold ${URGENCY_STYLE[urgency].textColor} leading-tight`}>
                  {tx.urgency[urgency].label}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${URGENCY_STYLE[urgency].textColor} opacity-75`}>
                  {tx.urgency[urgency].sub}
                </p>
              </div>
            </div>

            {/* Speak again */}
            <button onClick={handleSpeakAgain}
              className="w-full bg-primary/10 border-2 border-primary/35 text-primary rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-primary/20"
              style={{ minHeight: 60 }}>
              <Volume2 className="w-6 h-6" /> {tx.speakBtn}
            </button>

            {/* Hero card */}
            <Card className="overflow-hidden shadow-md border-2 border-primary/15">
              <div className="w-full bg-black/5 relative" style={{ aspectRatio: "16/9" }}>
                <img src={selectedImage!} alt="Scanned crop" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {result.isHealthy ? (
                      <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> {tx.healthy}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-sm px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-sm">
                        <AlertCircle className="w-4 h-4" /> {tx.diseased}
                      </Badge>
                    )}
                    {result.severity && !result.isHealthy && (
                      <Badge className="text-sm px-3 py-1.5 font-bold bg-amber-500 text-white shadow-sm border-0">
                        {tx.severity(result.severity)}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-white text-2xl font-extrabold tracking-tight leading-tight">{diseaseName}</h2>
                  {altName && <p className="text-white/80 text-base font-bold mt-0.5">{altName}</p>}
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Confidence */}
                <div className="flex flex-wrap gap-2 text-sm font-semibold text-foreground/70">
                  <span className="flex items-center gap-1 bg-muted px-2.5 py-1.5 rounded-lg">
                    <Activity className="w-4 h-4" /> {tx.confidence(result.confidence)}
                  </span>
                  {result.plantNetSpecies && (
                    <span className="flex items-center gap-1 bg-muted px-2.5 py-1.5 rounded-lg">
                      <Leaf className="w-4 h-4 text-primary" />
                      {tx.plantId}: <span className="italic ml-1">{result.plantNetSpecies}</span>
                      {result.plantNetScore != null && (
                        <span className="ml-1 text-xs opacity-75">({(result.plantNetScore * 100).toFixed(0)}%)</span>
                      )}
                    </span>
                  )}
                </div>

                <p className="text-base text-foreground/85 leading-relaxed font-medium">{description}</p>

                {symptoms && symptoms.length > 0 && (
                  <div>
                    <h4 className="font-extrabold text-foreground mb-3 flex items-center gap-2 text-base">
                      <Leaf className="w-5 h-5 text-primary" /> {tx.symptoms}
                    </h4>
                    <ul className="space-y-2">
                      {symptoms.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-foreground/80 text-base font-medium">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {treatment && (
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-foreground text-lg border-b-2 pb-2">{tx.treatmentPlan}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: tx.immediate, icon: <ShieldAlert className="w-5 h-5" />, text: treatment.immediate, cls: "destructive" },
                        { label: tx.chemical,  icon: <Droplet className="w-5 h-5" />,    text: treatment.chemical,  cls: "blue" },
                        { label: tx.organic,   icon: <Leaf className="w-5 h-5" />,       text: treatment.organic,   cls: "primary" },
                        { label: tx.prevention,icon: <Sun className="w-5 h-5" />,        text: treatment.prevention,cls: "amber" },
                      ].map(({ label, icon, text, cls }, i) => (
                        <Card key={i} className={`shadow-none border-2 ${
                          cls === "destructive" ? "bg-red-50 border-red-200" :
                          cls === "blue"  ? "bg-blue-50 border-blue-200" :
                          cls === "primary" ? "bg-green-50 border-green-200" :
                          "bg-amber-50 border-amber-200"
                        }`}>
                          <CardContent className="p-4">
                            <h5 className={`font-extrabold flex items-center gap-2 mb-2 ${
                              cls === "destructive" ? "text-red-800" :
                              cls === "blue"  ? "text-blue-800" :
                              cls === "primary" ? "text-green-800" :
                              "text-amber-800"
                            }`}>{icon} {label}</h5>
                            <p className="text-sm text-foreground/80 font-medium leading-relaxed">{text}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Where to Buy */}
            {medicines && !result.isHealthy && (
              <Card className="border-2 border-primary/25 shadow-sm">
                <CardContent className="p-5">
                  <h4 className="font-extrabold text-foreground text-lg flex items-center gap-2 border-b-2 pb-3 mb-4">
                    <ShoppingBag className="w-6 h-6 text-primary" /> {tx.whereToBuy}
                  </h4>
                  <div className="space-y-3 mb-4">
                    {medicines.map((med, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 bg-muted rounded-xl px-4 py-3.5 border-2 border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          <span className="font-extrabold text-base text-foreground">{med.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-base font-extrabold text-primary whitespace-nowrap">
                          <IndianRupee className="w-4 h-4" />
                          <span>{med.price.replace("₹", "")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3.5">
                    <ShoppingBag className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
                    <p className="text-base text-amber-900 font-bold">{tx.whereToBuyDesc}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secondary language */}
            {(altDesc || (altSymptoms && altSymptoms.length > 0) || altTreatment) && (
              <Card className="border-2 border-primary/20 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h4 className="font-extrabold text-primary text-base flex items-center gap-2 border-b-2 pb-2">
                    <Languages className="w-5 h-5" /> {tx.hindiSection}
                  </h4>
                  {altDesc && <p className="text-sm text-foreground/75 font-medium leading-relaxed">{altDesc}</p>}
                  {altSymptoms && altSymptoms.length > 0 && (
                    <ul className="space-y-1.5">
                      {altSymptoms.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                          <span className="text-foreground/70 font-medium text-sm">{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {altTreatment && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: lang === "hi" ? "Do This Now" : "अभी करो",     text: altTreatment.immediate, color: "destructive" },
                        { label: lang === "hi" ? "Chemical Spray" : "दवाई डालो", text: altTreatment.chemical,  color: "blue" },
                        { label: lang === "hi" ? "Natural Remedy" : "देसी उपाय", text: altTreatment.organic,   color: "primary" },
                        { label: lang === "hi" ? "Prevention" : "आगे से बचाव",   text: altTreatment.prevention,color: "amber" },
                      ].map(({ label, text, color }, i) => (
                        <div key={i} className={`rounded-lg p-3 border-2 ${
                          color === "destructive" ? "bg-red-50 border-red-200"   :
                          color === "blue"        ? "bg-blue-50 border-blue-200" :
                          color === "primary"     ? "bg-green-50 border-green-200" :
                          "bg-amber-50 border-amber-200"
                        }`}>
                          <p className={`text-xs font-extrabold mb-1 ${
                            color === "destructive" ? "text-red-800"   :
                            color === "blue"        ? "text-blue-800"  :
                            color === "primary"     ? "text-green-800" :
                            "text-amber-800"
                          }`}>{label}</p>
                          <p className="text-sm text-foreground/75 font-medium">{text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scan another */}
            <div className="pb-8">
              <button onClick={resetScan}
                className="w-full bg-primary text-primary-foreground rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 shadow-md active:opacity-90"
                style={{ minHeight: 76 }}>
                <Camera className="w-6 h-6" /> {tx.scanAnother}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-10 py-4 px-4 text-center text-xs text-foreground/45 font-semibold border-t-2 border-border">
        <p>Developed by <span className="font-extrabold text-foreground/60">Jaspreet</span></p>
        <p className="mt-0.5">Built in rural India 2026</p>
      </footer>
    </div>
  );
}
