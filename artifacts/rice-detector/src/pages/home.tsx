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
  CheckCircle2
} from "lucide-react";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const detectDisease = useDetectDisease();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    const objectUrl = URL.URL.createObjectURL(file);
    setSelectedImage(objectUrl);
  };
  
  const handleScan = () => {
    if (!imageFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      
      const base64Data = result.split(',')[1];
      const mimeType = imageFile.type;
      
      detectDisease.mutate({
        data: {
          imageBase64: base64Data,
          mimeType: mimeType
        }
      });
    };
    reader.readAsDataURL(imageFile);
  };
  
  const resetScan = () => {
    setSelectedImage(null);
    setImageFile(null);
    detectDisease.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLoading = detectDisease.isPending;
  const result = detectDisease.data;
  const isError = detectDisease.isError;
  const error = detectDisease.error;

  return (
    <div className="min-h-[100dvh] w-full bg-background pb-12">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none"></div>
        <div className="max-w-xl mx-auto flex items-center gap-3 relative z-10">
          <div className="bg-primary-foreground/20 p-2 rounded-full">
            <Sprout className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kisan Mitra</h1>
            <p className="text-primary-foreground/80 text-sm font-medium">Rice crop field companion</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-6">
        
        {/* Upload State */}
        {!selectedImage && (
          <div className="animate-in fade-in zoom-in duration-300">
            <Card className="border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors shadow-none cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Upload crop photo</h2>
                <p className="text-muted-foreground mb-6 max-w-[250px]">
                  Take a clear photo of the rice leaf to detect any diseases.
                </p>
                <Button size="lg" className="w-full sm:w-auto font-semibold text-lg py-6 rounded-xl" data-testid="button-upload-trigger">
                  Take or select photo
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileChange}
                  data-testid="input-file"
                />
              </CardContent>
            </Card>
            
            <div className="mt-8 flex gap-4 text-sm text-muted-foreground justify-center items-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Expert agronomy AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
              <span>Instant results</span>
            </div>
          </div>
        )}

        {/* Preview State before scan */}
        {selectedImage && !isLoading && !result && !isError && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="overflow-hidden shadow-sm">
              <div className="aspect-4/3 w-full bg-black/5 relative">
                <img src={selectedImage} alt="Crop preview" className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">Ready to analyze</h3>
                <p className="text-muted-foreground text-sm mb-6">Make sure the leaf is clearly visible.</p>
                
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" className="flex-1" onClick={resetScan}>
                    Retake
                  </Button>
                  <Button size="lg" className="flex-1 text-lg font-semibold" onClick={handleScan} data-testid="button-analyze">
                    Scan now
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
              <div className="w-24 h-24 border-4 border-primary/20 rounded-full"></div>
              <div className="w-24 h-24 border-4 border-primary rounded-full border-t-transparent animate-spin absolute inset-0"></div>
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Activity className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Analyzing crop health...</h3>
            <p className="text-muted-foreground">Consulting the expert database.</p>
            
            <div className="w-full max-w-sm mt-8 space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-lg">Analysis Failed</AlertTitle>
              <AlertDescription className="text-base mt-2">
                {error?.error || "We couldn't analyze this image. Please try again with a clearer photo."}
              </AlertDescription>
            </Alert>
            <Button size="lg" className="w-full" onClick={handleScan}>
              <RefreshCcw className="w-5 h-5 mr-2" />
              Try again
            </Button>
            <Button variant="ghost" size="lg" className="w-full mt-3" onClick={resetScan}>
              Take a new photo
            </Button>
          </div>
        )}

        {/* Results State */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <Card className="overflow-hidden shadow-md border-primary/10">
              <div className="aspect-video w-full bg-black/5 relative">
                <img src={selectedImage!} alt="Scanned crop" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <div className="flex gap-2 mb-2">
                      {result.isHealthy ? (
                        <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-4 h-4" /> Healthy
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-destructive text-destructive-foreground text-sm px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
                          <AlertCircle className="w-4 h-4" /> Diseased
                        </Badge>
                      )}
                      {result.severity && !result.isHealthy && (
                        <Badge variant="secondary" className="text-sm px-3 py-1 font-medium bg-amber-500/90 text-white shadow-sm border-0">
                          {result.severity} Severity
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-white text-3xl font-extrabold tracking-tight" data-testid="text-disease-name">
                      {result.diseaseName}
                    </h2>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                    <Activity className="w-4 h-4" /> {result.confidence} Confidence
                  </span>
                </div>
                
                <p className="text-base text-foreground/90 leading-relaxed mb-6">
                  {result.description}
                </p>

                {result.symptoms && result.symptoms.length > 0 && (
                  <div className="mb-8">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2 text-lg">
                      <Leaf className="w-5 h-5 text-primary" />
                      Visible Symptoms
                    </h4>
                    <ul className="space-y-2">
                      {result.symptoms.map((symptom, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
                          <span className="text-foreground/80">{symptom}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-bold text-foreground text-lg border-b pb-2">Treatment Plan</h4>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="bg-destructive/5 border-destructive/20 shadow-none">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                          <ShieldAlert className="w-4 h-4" /> Immediate Action
                        </h5>
                        <p className="text-sm text-foreground/80">{result.treatment.immediate}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-500/5 border-blue-500/20 shadow-none">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                          <Droplet className="w-4 h-4" /> Chemical
                        </h5>
                        <p className="text-sm text-foreground/80">{result.treatment.chemical}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20 shadow-none">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-primary flex items-center gap-2 mb-2">
                          <Leaf className="w-4 h-4" /> Organic
                        </h5>
                        <p className="text-sm text-foreground/80">{result.treatment.organic}</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-amber-500/5 border-amber-500/20 shadow-none">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
                          <Sun className="w-4 h-4" /> Prevention
                        </h5>
                        <p className="text-sm text-foreground/80">{result.treatment.prevention}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

              </CardContent>
            </Card>

            <div className="pb-8">
              <Button size="lg" className="w-full text-lg font-bold py-6 shadow-md" onClick={resetScan} data-testid="button-scan-another">
                <Upload className="w-5 h-5 mr-2" />
                Scan another plant
              </Button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
