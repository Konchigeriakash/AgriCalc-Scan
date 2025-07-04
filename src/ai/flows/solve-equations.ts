// src/ai/flows/solve-equations.ts
'use server';
/**
 * @fileOverview A flow that solves mathematical expressions from a scanned image.
 *
 * - solveScannedEquations - A function that handles solving equations from a scanned image.
 * - SolveScannedEquationsInput - The input type for the solveScannedEquations function.
 * - SolveScannedEquationsOutput - The return type for the solveScannedEquations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { extractNumbersAndOperators } from '@/services/ocr-service';
import { evaluateExpression } from '@/services/math-service';

const SolveScannedEquationsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of numerical data, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SolveScannedEquationsInput = z.infer<typeof SolveScannedEquationsInputSchema>;

const SolveScannedEquationsOutputSchema = z.object({
  expression: z.string().describe('The extracted mathematical expression.'),
  result: z.number().describe('The result of the calculation.'),
});
export type SolveScannedEquationsOutput = z.infer<typeof SolveScannedEquationsOutputSchema>;

export async function solveScannedEquations(input: SolveScannedEquationsInput): Promise<SolveScannedEquationsOutput> {
  return solveScannedEquationsFlow(input);
}

const solveScannedEquationsFlow = ai.defineFlow(
  {
    name: 'solveScannedEquationsFlow',
    inputSchema: SolveScannedEquationsInputSchema,
    outputSchema: SolveScannedEquationsOutputSchema,
  },
  async input => {
    // 1. Extract numbers and operators from the image using OCR service
    const extractionResult = await extractNumbersAndOperators(input.photoDataUri);

    if (!extractionResult) {
      throw new Error('Could not extract data from the image.');
    }

    const {
      numbers,
      operators,
      expression: extractedExpression,
    } = extractionResult;

    // 2. If no operators are found, default to addition
    const expression = (operators.length > 0 && extractedExpression) ? extractedExpression : numbers.join(' + ');

    // If no expression could be formed, return a default state.
    if (!expression.trim()) {
        return {
            expression: 'No equation found',
            result: 0,
        };
    }

    // 3. Evaluate the expression using the math service
    const evaluationResult = await evaluateExpression(expression);

    // Check if the evaluation was successful
    if (isNaN(evaluationResult.result)) {
      // If evaluation fails, return the extracted (but invalid) expression
      // for the user to correct. Provide a default result of 0.
      // This avoids throwing an error for correctable OCR mistakes.
      return {
        expression: expression,
        result: 0,
      };
    }

    return {
      expression: expression,
      result: evaluationResult.result,
    };
  }
);
