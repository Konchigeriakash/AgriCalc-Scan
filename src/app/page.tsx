"use client";

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { solveScannedEquations, SolveScannedEquationsOutput } from '@/ai/flows/solve-equations';
import { Upload, Camera, Calculator, Trash2, Loader2, RotateCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

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
  const [step, setStep] = useState<'upload' | 'edit' | 'result'>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ expression: string; result: number | string; } | null>(null);
  const [editableExpression, setEditableExpression] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleReset = useCallback(() => {
    setStep('upload');
    setOriginalImage(null);
    setProcessedImage(null);
    setIsLoading(false);
    setOcrResult(null);
    setEditableExpression('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setOriginalImage(dataUri);
        setProcessedImage(dataUri);
        setStep('edit');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSolve = useCallback(async () => {
    if (!originalImage) return;
    setIsLoading(true);
    try {
      // The flow now automatically enhances the image before solving.
      const result: SolveScannedEquationsOutput = await solveScannedEquations({ photoDataUri: originalImage });
      
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
  }, [originalImage, toast]);
  
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

          {(step === 'edit' || step === 'result') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <Card className="shadow-xl rounded-xl">
                  <CardHeader>
                    <CardTitle className="font-headline">Your Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {processedImage && (
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden border bg-muted/50">
                         <Image src={processedImage} alt="Uploaded document with calculations" layout="fill" objectFit="contain" data-ai-hint="handwritten notes" />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleReset} variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                  {step === 'edit' && (
                    <>
                      <Button onClick={handleSolve} disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                        {isLoading ? 'Calculating...' : 'Calculate'}
                      </Button>
                    </>
                  )}
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
                {step === 'result' && ocrResult && (
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
