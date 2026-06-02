import React, { useState, useRef, useEffect } from "react";
import { useDetectDisease } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  FlaskConical,
  ShoppingBag,
  IndianRupee,
  Volume2,
  AlertTriangle,
  Clock,
} from "lucide-react";

/* ── Medicine lookup ─────────────────────────────────────────────── */

interface Medicine {
  name: string;
  price: string;
}

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

function getMedicines(diseaseName: string): Medicine[] | null {
  const lower = diseaseName.toLowerCase();
  for (const entry of MEDICINE_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.medicines;
  }
  return null;
}

/* ── Urgency ─────────────────────────────────────────────────────── */

type Urgency = "red" | "yellow" | "green";

function getUrgency(isHealthy: boolean, severity?: string | null): Urgency {
  if (isHealthy) return "green";
  if (severity === "Severe" || severity === "Moderate" || severity === "गंभीर" || severity === "मध्यम") return "red";
  return "yellow";
}

/* ── Voice output ────────────────────────────────────────────────── */

function speakHindi(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "hi-IN";
  utterance.rate = 0.82;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

/* ── UI strings ──────────────────────────────────────────────────── */

type Lang = "en" | "hi";

const ui = {
  en: {
    appName: "Kisan Mitra",
    appSubtitle: "Rice crop field companion",
    langToggle: "हिंदी",
    uploadTitle: "Take a photo of rice leaf",
    uploadDesc: "Point your camera at a rice leaf. We will find the disease.",
    uploadBtn: "Open Camera / Gallery",
    trustLine1: "PlantNet + AI powered",
    trustLine2: "Instant results",
    readyTitle: "Ready to scan",
    readyDesc: "Leaf should be clear and close up.",
    retake: "Retake",
    scanNow: "Scan Now",
    detectingMsg: "Detecting disease...",
    detectingDesc: "Checking with PlantNet & AI. Please wait.",
    errorTitle: "Could not analyze",
    errorDesc: "Photo not clear enough. Please take a closer photo of the leaf.",
    tryAgain: "Try Again",
    newPhoto: "Take New Photo",
    healthy: "Healthy",
    diseased: "Diseased",
    severity: (s: string) => `${s} Severity`,
    confidence: (c: string) => `${c} Confidence`,
    plantId: "PlantNet ID",
    symptoms: "Symptoms Visible",
    treatmentPlan: "Treatment Plan",
    immediate: "Do This Now",
    chemical: "Chemical Spray",
    organic: "Natural Remedy",
    prevention: "Prevention",
    scanAnother: "Scan Another Plant",
    hindiSection: "हिंदी में जानकारी",
    whereToBuy: "Where to Buy Medicine",
    whereToBuyDesc: "Available at local Krishi Seva Kendra or agri shop",
    urgency: {
      red: { label: "Treat urgently — within 2 days", sub: "Crop is at serious risk" },
      yellow: { label: "Treat within a week", sub: "Early stage — act soon" },
      green: { label: "Crop is healthy", sub: "No treatment needed" },
    },
    speakBtn: "Hear in Hindi",
  },
  hi: {
    appName: "किसान मित्र",
    appSubtitle: "धान की फसल का साथी",
    langToggle: "English",
    // Simple village-level Hindi
    uploadTitle: "पत्ते की फोटो खींचो",
    uploadDesc: "धान के पत्ते के पास जाकर साफ फोटो लो। हम बता देंगे बीमारी है या नहीं।",
    uploadBtn: "फोटो खींचो",
    trustLine1: "AI से जांच होती है",
    trustLine2: "फटाफट नतीजा",
    readyTitle: "जांच के लिए तैयार",
    readyDesc: "पत्ता साफ और पास से दिखना चाहिए।",
    retake: "दोबारा लो",
    scanNow: "अभी जांचो",
    detectingMsg: "बीमारी पहचानी जा रही है...",
    detectingDesc: "थोड़ा रुको, जांच हो रही है।",
    errorTitle: "पता नहीं चला",
    errorDesc: "फोटो साफ नहीं है। पत्ते के और पास से फोटो लो।",
    tryAgain: "फिर कोशिश करो",
    newPhoto: "नई फोटो लो",
    healthy: "ठीक है",
    diseased: "बीमार है",
    severity: (s: string) => {
      const m: Record<string, string> = { Severe: "बहुत खराब", Moderate: "ठीक-ठाक खराब", Mild: "थोड़ा खराब" };
      return m[s] ?? s;
    },
    confidence: (c: string) => {
      const m: Record<string, string> = { High: "पक्का", Medium: "शायद", Low: "अंदाज़ा" };
      return m[c] ?? c;
    },
    plantId: "पौधे की पहचान",
    symptoms: "ये लक्षण दिखे",
    treatmentPlan: "इलाज करो",
    immediate: "अभी करो",
    chemical: "दवाई डालो",
    organic: "देसी उपाय",
    prevention: "आगे से बचाव",
    scanAnother: "दूसरे पौधे की जांच करो",
    hindiSection: "English Information",
    whereToBuy: "दवाई कहाँ मिलेगी",
    whereToBuyDesc: "नजदीकी कृषि सेवा केंद्र या खाद-बीज की दुकान पर मिलेगी",
    urgency: {
      red: { label: "2 दिन के अंदर दवा दो", sub: "फसल को खतरा है — देर मत करो" },
      yellow: { label: "एक हफ्ते में दवा दो", sub: "अभी शुरुआत है — जल्दी करो" },
      green: { label: "फसल बिल्कुल ठीक है", sub: "कोई दवाई नहीं चाहिए" },
    },
    speakBtn: "हिंदी में सुनो",
  },
} as const;

/* ── Urgency banner config ───────────────────────────────────────── */

const URGENCY_STYLE: Record<Urgency, { bg: string; border: string; icon: React.ReactNode; textColor: string }> = {
  red: {
    bg: "bg-red-50",
    border: "border-red-400",
    textColor: "text-red-800",
    icon: <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />,
  },
  yellow: {
    bg: "bg-amber-50",
    border: "border-amber-400",
    textColor: "text-amber-800",
    icon: <Clock className="w-7 h-7 text-amber-600 shrink-0" />,
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-400",
    textColor: "text-green-800",
    icon: <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0" />,
  },
};

/* ── Component ───────────────────────────────────────────────────── */

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tx = ui[lang];
  const detectDisease = useDetectDisease();

  const isLoading = detectDisease.isPending;
  const result = detectDisease.data;
  const isError = detectDisease.isError;
  const error = detectDisease.error;

  // Auto-speak when result arrives
  useEffect(() => {
    if (!result) return;
    const nameHi = result.diseaseNameHi ?? result.diseaseName;
    const urgency = getUrgency(result.isHealthy, result.severity);
    const urgencyText = ui.hi.urgency[urgency].label;
    const treatmentHi = result.treatmentHi?.immediate ?? result.treatment?.immediate ?? "";
    const speech = result.isHealthy
      ? `आपकी फसल बिल्कुल ठीक है। कोई बीमारी नहीं है।`
      : `आपकी फसल में ${nameHi} बीमारी है। ${urgencyText}। ${treatmentHi}`;
    // Small delay so page renders first
    const t = setTimeout(() => speakHindi(speech), 600);
    return () => clearTimeout(t);
  }, [result]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setSelectedImage(URL.createObjectURL(file));
  };

  const handleScan = () => {
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const base64Data = dataUrl.split(",")[1];
      detectDisease.mutate({ data: { imageBase64: base64Data, mimeType: imageFile.type } });
    };
    reader.readAsDataURL(imageFile);
  };

  const resetScan = () => {
    setSelectedImage(null);
    setImageFile(null);
    detectDisease.reset();
    window.speechSynthesis?.cancel();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleLang = () => setLang((l) => (l === "en" ? "hi" : "en"));

  // Bilingual display values
  const medicines = result ? getMedicines(`${result.diseaseName} ${result.diseaseNameHi ?? ""}`) : null;
  const urgency = result ? getUrgency(result.isHealthy, result.severity) : null;
  const diseaseName  = lang === "hi" ? result?.diseaseNameHi  : result?.diseaseName;
  const description  = lang === "hi" ? result?.descriptionHi  : result?.description;
  const symptoms     = lang === "hi" ? result?.symptomsHi     : result?.symptoms;
  const treatment    = lang === "hi" ? result?.treatmentHi    : result?.treatment;
  const altName      = lang === "hi" ? result?.diseaseName    : result?.diseaseNameHi;
  const altDesc      = lang === "hi" ? result?.description    : result?.descriptionHi;
  const altSymptoms  = lang === "hi" ? result?.symptoms       : result?.symptomsHi;
  const altTreatment = lang === "hi" ? result?.treatment      : result?.treatmentHi;

  const handleSpeakAgain = () => {
    if (!result) return;
    const nameHi = result.diseaseNameHi ?? result.diseaseName;
    const urg = getUrgency(result.isHealthy, result.severity);
    const urgencyText = ui.hi.urgency[urg].label;
    const treatmentHi = result.treatmentHi?.immediate ?? "";
    const speech = result.isHealthy
      ? `आपकी फसल बिल्कुल ठीक है। कोई बीमारी नहीं है।`
      : `आपकी फसल में ${nameHi} बीमारी है। ${urgencyText}। ${treatmentHi}`;
    speakHindi(speech);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-12">

      {/* Header */}
      <header className="bg-primary text-primary-foreground py-5 px-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />
        <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2.5 rounded-full">
              <Sprout className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{tx.appName}</h1>
              <p className="text-primary-foreground/80 text-sm font-medium">{tx.appSubtitle}</p>
            </div>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 bg-primary-foreground/15 hover:bg-primary-foreground/25 active:bg-primary-foreground/35 transition-colors px-4 py-2.5 rounded-full text-base font-bold text-primary-foreground min-h-[48px]"
          >
            <Languages className="w-5 h-5" />
            {tx.langToggle}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-3 mt-5">

        {/* ── Upload State ── */}
        {!selectedImage && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-4">
            {/* Big tap target — entire card is the button */}
            <button
              className="w-full rounded-2xl border-dashed border-2 border-primary/30 bg-primary/5 active:bg-primary/15 transition-colors text-left"
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: 260 }}
            >
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-5">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground mb-3 leading-tight">{tx.uploadTitle}</h2>
                <p className="text-muted-foreground text-base max-w-[270px] leading-relaxed">{tx.uploadDesc}</p>
              </div>
            </button>

            {/* Full-width, very large upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-primary text-primary-foreground font-extrabold text-2xl rounded-2xl shadow-lg active:opacity-90 transition-opacity flex items-center justify-center gap-3"
              style={{ minHeight: 80 }}
            >
              <Upload className="w-7 h-7" />
              {tx.uploadBtn}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />

            <div className="flex gap-3 text-sm text-muted-foreground justify-center items-center pt-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>{tx.trustLine1}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
              <span>{tx.trustLine2}</span>
            </div>
          </div>
        )}

        {/* ── Preview State ── */}
        {selectedImage && !isLoading && !result && !isError && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
            <Card className="overflow-hidden shadow-sm">
              <div className="w-full bg-black/5" style={{ aspectRatio: "4/3" }}>
                <img src={selectedImage} alt="Crop preview" className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-bold text-xl mb-1">{tx.readyTitle}</h3>
                <p className="text-muted-foreground mb-5">{tx.readyDesc}</p>
                <div className="flex gap-3">
                  <button
                    onClick={resetScan}
                    className="flex-1 border-2 border-border rounded-xl font-bold text-lg text-foreground bg-background active:bg-muted transition-colors flex items-center justify-center"
                    style={{ minHeight: 64 }}
                  >
                    {tx.retake}
                  </button>
                  <button
                    onClick={handleScan}
                    className="flex-2 bg-primary text-primary-foreground rounded-xl font-extrabold text-xl flex items-center justify-center gap-2 active:opacity-90 transition-opacity px-6"
                    style={{ minHeight: 64, flex: 2 }}
                  >
                    {tx.scanNow}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Loading State ── */}
        {isLoading && (
          <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-8">
              <div className="w-28 h-28 border-4 border-primary/20 rounded-full" />
              <div className="w-28 h-28 border-4 border-primary rounded-full border-t-transparent animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <FlaskConical className="w-10 h-10 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-foreground mb-2">{tx.detectingMsg}</h3>
            <p className="text-muted-foreground text-base">{tx.detectingDesc}</p>
            <div className="w-full max-w-sm mt-8 space-y-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* ── Error State ── */}
        {isError && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="h-6 w-6" />
              <AlertTitle className="text-xl font-bold">{tx.errorTitle}</AlertTitle>
              <AlertDescription className="text-base mt-1">
                {error?.error || tx.errorDesc}
              </AlertDescription>
            </Alert>
            <button
              onClick={handleScan}
              className="w-full bg-destructive text-white rounded-xl font-bold text-xl flex items-center justify-center gap-2 active:opacity-90"
              style={{ minHeight: 68 }}
            >
              <RefreshCcw className="w-6 h-6" />
              {tx.tryAgain}
            </button>
            <button
              onClick={resetScan}
              className="w-full border-2 border-border rounded-xl font-bold text-lg text-foreground bg-background flex items-center justify-center active:bg-muted"
              style={{ minHeight: 60 }}
            >
              {tx.newPhoto}
            </button>
          </div>
        )}

        {/* ── Results State ── */}
        {result && urgency && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">

            {/* BIG Urgency Banner */}
            <div className={`${URGENCY_STYLE[urgency].bg} border-4 ${URGENCY_STYLE[urgency].border} rounded-2xl px-5 py-5 flex items-center gap-4`}>
              {URGENCY_STYLE[urgency].icon}
              <div className="flex-1">
                <p className={`text-xl font-extrabold ${URGENCY_STYLE[urgency].textColor} leading-tight`}>
                  {tx.urgency[urgency].label}
                </p>
                <p className={`text-sm font-medium mt-0.5 ${URGENCY_STYLE[urgency].textColor} opacity-80`}>
                  {tx.urgency[urgency].sub}
                </p>
              </div>
            </div>

            {/* Speak Again button */}
            <button
              onClick={handleSpeakAgain}
              className="w-full bg-primary/10 border-2 border-primary/30 text-primary rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-primary/20"
              style={{ minHeight: 60 }}
            >
              <Volume2 className="w-6 h-6" />
              {tx.speakBtn}
            </button>

            {/* Hero card with image + disease name */}
            <Card className="overflow-hidden shadow-md border-primary/10">
              <div className="w-full bg-black/5 relative" style={{ aspectRatio: "16/9" }}>
                <img src={selectedImage!} alt="Scanned crop" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
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
                      <Badge className="text-sm px-3 py-1.5 font-bold bg-amber-500/90 text-white shadow-sm border-0">
                        {tx.severity(result.severity)}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-white text-2xl font-extrabold tracking-tight leading-tight">
                    {diseaseName}
                  </h2>
                  {altName && (
                    <p className="text-white/75 text-base font-semibold mt-0.5">{altName}</p>
                  )}
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Confidence + PlantNet */}
                <div className="flex flex-wrap gap-2 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1 bg-muted px-2.5 py-1.5 rounded-lg">
                    <Activity className="w-4 h-4" /> {tx.confidence(result.confidence)}
                  </span>
                  {result.plantNetSpecies && (
                    <span className="flex items-center gap-1 bg-muted px-2.5 py-1.5 rounded-lg">
                      <Leaf className="w-4 h-4 text-primary" />
                      {tx.plantId}: <span className="italic ml-1">{result.plantNetSpecies}</span>
                      {result.plantNetScore != null && (
                        <span className="ml-1 text-xs opacity-70">
                          ({(result.plantNetScore * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-base text-foreground/90 leading-relaxed">{description}</p>

                {/* Symptoms */}
                {symptoms && symptoms.length > 0 && (
                  <div>
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-base">
                      <Leaf className="w-5 h-5 text-primary" /> {tx.symptoms}
                    </h4>
                    <ul className="space-y-2">
                      {symptoms.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                          <span className="text-foreground/80 text-base">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Treatment Plan */}
                {treatment && (
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-foreground text-lg border-b pb-2">{tx.treatmentPlan}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="bg-destructive/5 border-destructive/25 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-bold text-destructive flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-5 h-5" /> {tx.immediate}
                          </h5>
                          <p className="text-sm text-foreground/80 leading-relaxed">{treatment.immediate}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/5 border-blue-500/25 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-bold text-blue-700 flex items-center gap-2 mb-2">
                            <Droplet className="w-5 h-5" /> {tx.chemical}
                          </h5>
                          <p className="text-sm text-foreground/80 leading-relaxed">{treatment.chemical}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/5 border-primary/25 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-bold text-primary flex items-center gap-2 mb-2">
                            <Leaf className="w-5 h-5" /> {tx.organic}
                          </h5>
                          <p className="text-sm text-foreground/80 leading-relaxed">{treatment.organic}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-500/5 border-amber-500/25 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-bold text-amber-700 flex items-center gap-2 mb-2">
                            <Sun className="w-5 h-5" /> {tx.prevention}
                          </h5>
                          <p className="text-sm text-foreground/80 leading-relaxed">{treatment.prevention}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Where to Buy */}
            {medicines && !result.isHealthy && (
              <Card className="border-primary/25 shadow-sm">
                <CardContent className="p-5">
                  <h4 className="font-extrabold text-foreground text-lg flex items-center gap-2 border-b pb-3 mb-4">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                    {tx.whereToBuy}
                  </h4>
                  <div className="space-y-3 mb-4">
                    {medicines.map((med, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 bg-muted/50 rounded-xl px-4 py-3.5 border border-border/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          <span className="font-bold text-base text-foreground">{med.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-base font-extrabold text-primary whitespace-nowrap">
                          <IndianRupee className="w-4 h-4" />
                          <span>{med.price.replace("₹", "")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-base text-amber-800">
                    <ShoppingBag className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                    <p className="font-medium">{tx.whereToBuyDesc}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Secondary language panel */}
            {(altDesc || (altSymptoms && altSymptoms.length > 0) || altTreatment) && (
              <Card className="border-primary/20 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h4 className="font-bold text-primary text-base flex items-center gap-2 border-b pb-2">
                    <Languages className="w-5 h-5" /> {tx.hindiSection}
                  </h4>
                  {altDesc && (
                    <p className="text-sm text-foreground/80 leading-relaxed">{altDesc}</p>
                  )}
                  {altSymptoms && altSymptoms.length > 0 && (
                    <ul className="space-y-1.5">
                      {altSymptoms.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span className="text-foreground/75 text-sm">{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {altTreatment && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: lang === "hi" ? "Do This Now" : "अभी करो", text: altTreatment.immediate, cls: "destructive" },
                        { label: lang === "hi" ? "Chemical Spray" : "दवाई डालो", text: altTreatment.chemical, cls: "blue" },
                        { label: lang === "hi" ? "Natural Remedy" : "देसी उपाय", text: altTreatment.organic, cls: "primary" },
                        { label: lang === "hi" ? "Prevention" : "आगे से बचाव", text: altTreatment.prevention, cls: "amber" },
                      ].map(({ label, text, cls }, i) => (
                        <div key={i} className={`bg-${cls === "primary" ? "primary" : cls === "blue" ? "blue-500" : cls === "amber" ? "amber-500" : "destructive"}/5 rounded-lg p-3 border border-${cls === "primary" ? "primary" : cls === "blue" ? "blue-500" : cls === "amber" ? "amber-500" : "destructive"}/15`}>
                          <p className={`text-xs font-bold mb-1 text-${cls === "primary" ? "primary" : cls === "blue" ? "blue-700" : cls === "amber" ? "amber-700" : "destructive"}`}>{label}</p>
                          <p className="text-sm text-foreground/75">{text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scan another — big button */}
            <div className="pb-8">
              <button
                onClick={resetScan}
                className="w-full bg-primary text-primary-foreground rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 shadow-md active:opacity-90"
                style={{ minHeight: 76 }}
              >
                <Upload className="w-6 h-6" />
                {tx.scanAnother}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-10 py-4 px-4 text-center text-xs text-muted-foreground/60 border-t border-border/40">
        <p>Developed by <span className="font-semibold text-muted-foreground">Jaspreet</span></p>
        <p className="mt-0.5">Built in rural India 2026</p>
      </footer>
    </div>
  );
}
