"use client";

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { solveScannedEquations, SolveScannedEquationsOutput } from '@/ai/flows/solve-equations';
import { Upload, Camera, Trash2, Loader2, RotateCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const simpleEvaluate = (expression: string): number => {
  try {
    const sanitizedExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
    if (/[^0-9+\-*/.()\s]/.test(sanitizedExpression)) {
      throw new Error("Invalid characters in expression");
    }
    // eslint-disable-next-line no-new-func
    return new Function('return ' + sanitizedExpression)();
  } catch (error) {
    console.error("Evaluation error:", error);
    return NaN;
  }
};

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<SolveScannedEquationsOutput | null>(null);
  const [editableExpression, setEditableExpression] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setProcessedImage(null);
    setIsLoading(false);
    setOcrResult(null);
    setEditableExpression('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSolve = useCallback(async (imageDataUri: string) => {
    setIsLoading(true);
    setOcrResult(null);
    setOriginalImage(imageDataUri);

    try {
      const result: SolveScannedEquationsOutput = await solveScannedEquations({ 
        photoDataUri: imageDataUri,
      });
      
      setProcessedImage(result.enhancedPhotoDataUri);
      setOcrResult(result);
      setEditableExpression(result.expression);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Calculation Failed", description: "Could not process the image." });
      handleReset();
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleReset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUri = e.target?.result as string;
        if (imageDataUri) {
          handleSolve(imageDataUri);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleRecalculate = useCallback(() => {
    if (!ocrResult) return;
    const newResult = simpleEvaluate(editableExpression);
    const newResultDisplay = isNaN(newResult) ? "Invalid Expression" : newResult;
    
    // Create a new object for the state update
    const updatedOcrResult: SolveScannedEquationsOutput = {
      ...ocrResult,
      expression: editableExpression,
      result: isNaN(newResult) ? ocrResult.result : newResult, // Keep original result on invalid
    };
    
    setOcrResult(updatedOcrResult);

    toast({ title: "Recalculated", description: `New result is ${newResultDisplay}.` });
  }, [editableExpression, ocrResult, toast]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Card className="shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="font-headline">Analyzing Your Image...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6 flex flex-col items-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-muted-foreground">Please wait while we process your image.</p>
            {originalImage && (
              <div className="mt-4 w-full max-w-sm rounded-lg overflow-hidden border bg-muted/50">
                <Image src={originalImage} alt="Uploaded for processing" width={400} height={300} style={{objectFit:"contain"}} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (ocrResult) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <Card className="shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="font-headline">Processed Image</CardTitle>
              </CardHeader>
              <CardContent>
                {processedImage && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted/50">
                     <Image src={processedImage} alt="Enhanced document with calculations" layout="fill" objectFit="contain" data-ai-hint="handwritten notes" />
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
          </div>
        </div>
      );
    }

    return (
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
    );
  };

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
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
