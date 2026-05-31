import React, { useState, useRef } from "react";
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
} from "lucide-react";

type Lang = "en" | "hi";

const ui = {
  en: {
    appName: "Kisan Mitra",
    appSubtitle: "Rice crop field companion",
    langToggle: "हिंदी",
    uploadTitle: "Upload crop photo",
    uploadDesc: "Take a clear photo of the rice leaf to detect any diseases.",
    uploadBtn: "Take or select photo",
    trustLine1: "PlantNet + AI powered",
    trustLine2: "Instant results",
    readyTitle: "Ready to analyze",
    readyDesc: "Make sure the leaf is clearly visible.",
    retake: "Retake",
    scanNow: "Scan now",
    detectingMsg: "Detecting disease...",
    detectingDesc: "Sending to PlantNet & AI analysis engine.",
    errorTitle: "Analysis Failed",
    errorDesc: "We couldn't analyze this image. Please try again with a clearer photo.",
    tryAgain: "Try again",
    newPhoto: "Take a new photo",
    healthy: "Healthy",
    diseased: "Diseased",
    severity: (s: string) => `${s} Severity`,
    confidence: (c: string) => `${c} Confidence`,
    plantId: "Plant identified by PlantNet",
    symptoms: "Visible Symptoms",
    treatmentPlan: "Treatment Plan",
    immediate: "Immediate Action",
    chemical: "Chemical",
    organic: "Organic",
    prevention: "Prevention",
    scanAnother: "Scan another plant",
    hindiSection: "हिंदी में जानकारी",
  },
  hi: {
    appName: "किसान मित्र",
    appSubtitle: "धान की फसल का सहायक",
    langToggle: "English",
    uploadTitle: "फसल की फोटो अपलोड करें",
    uploadDesc: "रोग पहचान के लिए धान के पत्ते की स्पष्ट फोटो लें।",
    uploadBtn: "फोटो लें या चुनें",
    trustLine1: "PlantNet + AI द्वारा संचालित",
    trustLine2: "तुरंत परिणाम",
    readyTitle: "विश्लेषण के लिए तैयार",
    readyDesc: "सुनिश्चित करें कि पत्ता स्पष्ट दिख रहा हो।",
    retake: "दोबारा लें",
    scanNow: "अभी जांचें",
    detectingMsg: "रोग की पहचान हो रही है...",
    detectingDesc: "PlantNet और AI विश्लेषण इंजन को भेजा जा रहा है।",
    errorTitle: "विश्लेषण विफल",
    errorDesc: "इस फोटो का विश्लेषण नहीं हो सका। कृपया साफ फोटो से दोबारा कोशिश करें।",
    tryAgain: "दोबारा कोशिश करें",
    newPhoto: "नई फोटो लें",
    healthy: "स्वस्थ",
    diseased: "रोगग्रस्त",
    severity: (s: string) => `${s} गंभीरता`,
    confidence: (c: string) => `${c} विश्वास`,
    plantId: "PlantNet द्वारा पहचान",
    symptoms: "दिखाई देने वाले लक्षण",
    treatmentPlan: "उपचार योजना",
    immediate: "तुरंत करें",
    chemical: "रासायनिक उपचार",
    organic: "जैविक उपचार",
    prevention: "रोकथाम",
    scanAnother: "दूसरे पौधे की जांच करें",
    hindiSection: "English Information",
  },
} as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tx = ui[lang];
  const detectDisease = useDetectDisease();

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleLang = () => setLang((l) => (l === "en" ? "hi" : "en"));

  const isLoading = detectDisease.isPending;
  const result = detectDisease.data;
  const isError = detectDisease.isError;
  const error = detectDisease.error;

  // Pick bilingual values based on active lang
  const diseaseName  = lang === "hi" ? result?.diseaseNameHi  : result?.diseaseName;
  const description  = lang === "hi" ? result?.descriptionHi  : result?.description;
  const symptoms     = lang === "hi" ? result?.symptomsHi     : result?.symptoms;
  const treatment    = lang === "hi" ? result?.treatmentHi    : result?.treatment;
  // The "other" language for the secondary panel
  const altName      = lang === "hi" ? result?.diseaseName    : result?.diseaseNameHi;
  const altDesc      = lang === "hi" ? result?.description    : result?.descriptionHi;
  const altSymptoms  = lang === "hi" ? result?.symptoms       : result?.symptomsHi;
  const altTreatment = lang === "hi" ? result?.treatment      : result?.treatmentHi;

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-12">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-5 px-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />
        <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <Sprout className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{tx.appName}</h1>
              <p className="text-primary-foreground/80 text-xs font-medium">{tx.appSubtitle}</p>
            </div>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors px-3 py-1.5 rounded-full text-sm font-semibold text-primary-foreground"
          >
            <Languages className="w-4 h-4" />
            {tx.langToggle}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-6">

        {/* Upload State */}
        {!selectedImage && (
          <div className="animate-in fade-in zoom-in duration-300">
            <Card
              className="border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors shadow-none cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{tx.uploadTitle}</h2>
                <p className="text-muted-foreground mb-6 max-w-[260px]">{tx.uploadDesc}</p>
                <Button size="lg" className="w-full sm:w-auto font-semibold text-lg py-6 rounded-xl">
                  {tx.uploadBtn}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </CardContent>
            </Card>
            <div className="mt-8 flex gap-4 text-sm text-muted-foreground justify-center items-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>{tx.trustLine1}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
              <span>{tx.trustLine2}</span>
            </div>
          </div>
        )}

        {/* Preview State */}
        {selectedImage && !isLoading && !result && !isError && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="overflow-hidden shadow-sm">
              <div className="aspect-4/3 w-full bg-black/5">
                <img src={selectedImage} alt="Crop preview" className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-1">{tx.readyTitle}</h3>
                <p className="text-muted-foreground text-sm mb-6">{tx.readyDesc}</p>
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" className="flex-1" onClick={resetScan}>
                    {tx.retake}
                  </Button>
                  <Button size="lg" className="flex-1 text-lg font-semibold" onClick={handleScan}>
                    {tx.scanNow}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-primary/20 rounded-full" />
              <div className="w-24 h-24 border-4 border-primary rounded-full border-t-transparent animate-spin absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <FlaskConical className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">{tx.detectingMsg}</h3>
            <p className="text-muted-foreground text-sm">{tx.detectingDesc}</p>
            <div className="w-full max-w-sm mt-8 space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg">{tx.errorTitle}</AlertTitle>
              <AlertDescription className="text-base mt-2">
                {error?.error || tx.errorDesc}
              </AlertDescription>
            </Alert>
            <Button size="lg" className="w-full" onClick={handleScan}>
              <RefreshCcw className="w-5 h-5 mr-2" />
              {tx.tryAgain}
            </Button>
            <Button variant="ghost" size="lg" className="w-full mt-3" onClick={resetScan}>
              {tx.newPhoto}
            </Button>
          </div>
        )}

        {/* Results State */}
        {result && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-500">

            {/* Hero card with image + disease name */}
            <Card className="overflow-hidden shadow-md border-primary/10">
              <div className="aspect-video w-full bg-black/5 relative">
                <img src={selectedImage!} alt="Scanned crop" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {result.isHealthy ? (
                      <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> {tx.healthy}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-sm px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
                        <AlertCircle className="w-4 h-4" /> {tx.diseased}
                      </Badge>
                    )}
                    {result.severity && !result.isHealthy && (
                      <Badge className="text-sm px-3 py-1 font-medium bg-amber-500/90 text-white shadow-sm border-0">
                        {tx.severity(result.severity)}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-white text-2xl font-extrabold tracking-tight leading-tight">
                    {diseaseName}
                  </h2>
                  {/* Secondary language name */}
                  {altName && (
                    <p className="text-white/75 text-base font-medium mt-0.5">{altName}</p>
                  )}
                </div>
              </div>

              <CardContent className="p-5 sm:p-6 space-y-5">

                {/* Confidence + PlantNet badge */}
                <div className="flex flex-wrap gap-2 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    <Activity className="w-4 h-4" /> {tx.confidence(result.confidence)}
                  </span>
                  {result.plantNetSpecies && (
                    <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                      <Leaf className="w-4 h-4 text-primary" />
                      {tx.plantId}: <span className="italic ml-1">{result.plantNetSpecies}</span>
                      {result.plantNetScore != null && (
                        <span className="ml-1 text-xs text-muted-foreground/70">
                          ({(result.plantNetScore * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Primary language description */}
                <p className="text-base text-foreground/90 leading-relaxed">{description}</p>

                {/* Symptoms */}
                {symptoms && symptoms.length > 0 && (
                  <div>
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-base">
                      <Leaf className="w-4 h-4 text-primary" /> {tx.symptoms}
                    </h4>
                    <ul className="space-y-1.5">
                      {symptoms.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-foreground/80 text-sm">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Treatment Plan — primary language */}
                {treatment && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground text-base border-b pb-2">{tx.treatmentPlan}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="bg-destructive/5 border-destructive/20 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-semibold text-destructive flex items-center gap-2 mb-2 text-sm">
                            <ShieldAlert className="w-4 h-4" /> {tx.immediate}
                          </h5>
                          <p className="text-sm text-foreground/80">{treatment.immediate}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/5 border-blue-500/20 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-semibold text-blue-700 flex items-center gap-2 mb-2 text-sm">
                            <Droplet className="w-4 h-4" /> {tx.chemical}
                          </h5>
                          <p className="text-sm text-foreground/80">{treatment.chemical}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-primary/5 border-primary/20 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-semibold text-primary flex items-center gap-2 mb-2 text-sm">
                            <Leaf className="w-4 h-4" /> {tx.organic}
                          </h5>
                          <p className="text-sm text-foreground/80">{treatment.organic}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-500/5 border-amber-500/20 shadow-none">
                        <CardContent className="p-4">
                          <h5 className="font-semibold text-amber-700 flex items-center gap-2 mb-2 text-sm">
                            <Sun className="w-4 h-4" /> {tx.prevention}
                          </h5>
                          <p className="text-sm text-foreground/80">{treatment.prevention}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Secondary language panel */}
            {(altDesc || (altSymptoms && altSymptoms.length > 0) || altTreatment) && (
              <Card className="border-primary/20 shadow-sm">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <h4 className="font-bold text-primary text-base flex items-center gap-2 border-b pb-2">
                    <Languages className="w-4 h-4" /> {tx.hindiSection}
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
                      <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/15">
                        <p className="text-xs font-semibold text-destructive mb-1">{lang === "hi" ? "Immediate" : "तुरंत करें"}</p>
                        <p className="text-sm text-foreground/75">{altTreatment.immediate}</p>
                      </div>
                      <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/15">
                        <p className="text-xs font-semibold text-blue-700 mb-1">{lang === "hi" ? "Chemical" : "रासायनिक"}</p>
                        <p className="text-sm text-foreground/75">{altTreatment.chemical}</p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/15">
                        <p className="text-xs font-semibold text-primary mb-1">{lang === "hi" ? "Organic" : "जैविक"}</p>
                        <p className="text-sm text-foreground/75">{altTreatment.organic}</p>
                      </div>
                      <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/15">
                        <p className="text-xs font-semibold text-amber-700 mb-1">{lang === "hi" ? "Prevention" : "रोकथाम"}</p>
                        <p className="text-sm text-foreground/75">{altTreatment.prevention}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="pb-8">
              <Button size="lg" className="w-full text-lg font-bold py-6 shadow-md" onClick={resetScan}>
                <Upload className="w-5 h-5 mr-2" />
                {tx.scanAnother}
              </Button>
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
