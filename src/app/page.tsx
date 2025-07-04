"use client";

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/styles.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { solveScannedEquations, SolveScannedEquationsOutput } from '@/ai/flows/solve-equations';
import { Upload, Camera, Calculator, Trash2, Loader2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import getCroppedImg from '@/lib/cropImage';
import { Slider } from '@/components/ui/slider';

const simpleEvaluate = (expression: string): number => {
  try {
    const sanitizedExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
    if (/[^0-9+\-*/.()\s]/.test(sanitizedExpression)) {
      throw new Error("Invalid characters in expression");
    }
    return new Function('return ' + sanitizedExpression)();
  } catch (error) {
    console.error("Evaluation error:", error);
    return NaN;
  }
};

export default function Home() {
  const [step, setStep] = useState<'upload' | 'crop' | 'result'>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ expression: string; result: number | string; } | null>(null);
  const [editableExpression, setEditableExpression] = useState('');

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleReset = useCallback(() => {
    setStep('upload');
    setOriginalImage(null);
    setProcessedImage(null);
    setIsLoading(false);
    setOcrResult(null);
    setEditableExpression('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
        setStep('crop');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleSolve = useCallback(async () => {
    if (!originalImage || !croppedAreaPixels) return;
    setIsLoading(true);
    try {
      const croppedImage = await getCroppedImg(originalImage, croppedAreaPixels);
      if (!croppedImage) {
        toast({ variant: "destructive", title: "Cropping Failed", description: "Could not crop the image." });
        setIsLoading(false);
        return;
      }

      const result: SolveScannedEquationsOutput = await solveScannedEquations({ 
        photoDataUri: croppedImage,
      });
      
      setProcessedImage(result.enhancedPhotoDataUri);
      setOcrResult(result);
      setEditableExpression(result.expression);
      setStep('result');
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Calculation Failed", description: "Could not process the image." });
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, croppedAreaPixels, toast]);

  const handleRecalculate = useCallback(() => {
    if (!ocrResult) return;
    const newResult = simpleEvaluate(editableExpression);
    const newResultDisplay = isNaN(newResult) ? "Invalid Expression" : newResult;
    setOcrResult({
      ...ocrResult,
      expression: editableExpression,
      result: newResultDisplay,
    });
    toast({ title: "Recalculated", description: `New result is ${newResultDisplay}.` });
  }, [editableExpression, ocrResult, toast]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 px-4 md:px-8 border-b border-border/50">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold font-headline text-primary">AgriCalc Scan</h1>
          <p className="text-muted-foreground">Scan your notes, solve your sums.</p>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {step === 'upload' && (
            <Card className="shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-headline">Get Started</CardTitle>
                <CardDescription>Upload a photo of your calculations or use your camera.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 p-8">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <Button size="lg" onClick={triggerFileUpload} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base py-6 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload a Photo
                </Button>
                <Button size="lg" variant="outline" disabled className="w-full sm:w-auto text-base py-6 px-8 rounded-lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Use Camera
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'crop' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <Card className="shadow-xl rounded-xl">
                  <CardHeader>
                    <CardTitle className="font-headline">Crop & Zoom Your Image</CardTitle>
                    <CardDescription>Adjust the image to focus on the calculation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full h-96 bg-muted/50 rounded-lg">
                      {originalImage && (
                        <Cropper
                          image={originalImage}
                          crop={crop}
                          zoom={zoom}
                          aspect={4 / 3}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onCropComplete}
                        />
                      )}
                    </div>
                     <div className="flex items-center gap-4 mt-4 px-1">
                        <ZoomOut className="h-5 w-5 text-muted-foreground" />
                        <Slider
                            value={[zoom]}
                            onValueChange={(value) => setZoom(value[0])}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                        />
                        <ZoomIn className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleReset} variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                  <Button onClick={handleSolve} disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Calculating...' : 'Crop & Calculate'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-12 md:pt-0">
                <Card className="shadow-xl rounded-xl bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="font-headline text-muted-foreground">Calculation Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Your result will appear here.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <Card className="shadow-xl rounded-xl">
                  <CardHeader>
                    <CardTitle className="font-headline">Your Cropped Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {processedImage && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted/50">
                         <Image src={processedImage} alt="Cropped document with calculations" layout="fill" objectFit="contain" data-ai-hint="handwritten notes" />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleReset} variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {isLoading && (
                  <Card className="shadow-xl rounded-xl">
                    <CardHeader><CardTitle className="font-headline">Analyzing Your Image...</CardTitle></CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="h-10 bg-muted rounded animate-pulse w-full"></div>
                      <div className="h-24 bg-muted rounded animate-pulse w-full"></div>
                      <div className="h-16 bg-muted rounded animate-pulse w-full"></div>
                    </CardContent>
                  </Card>
                )}
                {ocrResult && (
                  <>
                    <Card className="shadow-xl rounded-xl">
                      <CardHeader>
                        <CardTitle className="font-headline">Extracted Equation</CardTitle>
                        <CardDescription>Review and correct the extracted text, then recalculate.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Label htmlFor="expression" className="font-bold">Equation</Label>
                        <Textarea 
                          id="expression"
                          value={editableExpression}
                          onChange={(e) => setEditableExpression(e.target.value)}
                          className="text-lg font-mono break-words"
                          rows={4}
                        />
                         <Button onClick={handleRecalculate}>
                           <RotateCw className="mr-2 h-4 w-4" />
                           Recalculate
                         </Button>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xl rounded-xl">
                      <CardHeader>
                        <CardTitle className="font-headline">Result</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-5xl font-bold font-headline text-primary break-all">{typeof ocrResult.result === 'number' ? ocrResult.result.toLocaleString() : ocrResult.result}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
