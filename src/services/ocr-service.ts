'use server';
/**
 * @fileOverview A service for extracting text from images using OCR.
 *
 * - extractNumbersAndOperators - Extracts mathematical expressions from an image.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OcrResultSchema = z.object({
  expression: z.string().describe('The full mathematical expression found in the image, e.g., "2 + 2 * 5".'),
  numbers: z.array(z.string()).describe('The numbers found in the image, e.g., ["2", "2", "5"].'),
  operators: z.array(z.string()).describe('The mathematical operators (+, -, *, /) found in the image, e.g., ["+", "*"].'),
});

export type OcrResult = z.infer<typeof OcrResultSchema>;

const ocrPrompt = ai.definePrompt({
    name: 'ocrPrompt',
    system: `You are an OCR tool specialized in recognizing handwritten or printed mathematical expressions. 
    Extract the mathematical expression from the image. 
    Identify all numbers and operators (+, -, *, /) distinctly.
    For the expression, use standard operators like '*' for multiplication and '/' for division.`,
    input: { schema: z.object({ photoDataUri: z.string() }) },
    output: { schema: OcrResultSchema },
    prompt: `Analyze the following image and extract the mathematical content.

    Image: {{media url=photoDataUri}}`,
});


export async function extractNumbersAndOperators(photoDataUri: string): Promise<OcrResult | null> {
    try {
        const { output } = await ocrPrompt({ photoDataUri });
        if (!output) {
            console.error('OCR prompt returned no output.');
            return null;
        }

        // Sometimes the model might not extract operators even if there is an expression.
        // Let's try to derive them from the expression if they are missing.
        if (output.expression && output.operators.length === 0 && output.numbers.length > 1) {
            const foundOperators = output.expression.match(/[+\-*/]/g);
            if (foundOperators) {
                output.operators = foundOperators;
            }
        }
        
        return output;
    } catch (e) {
        console.error("Error during OCR extraction:", e);
        return null;
    }
}
