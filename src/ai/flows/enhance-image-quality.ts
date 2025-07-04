'use server';

/**
 * @fileOverview Image enhancement flow to improve OCR accuracy.
 *
 * - enhanceImageQuality - A function that enhances the quality of an image for better OCR.
 * - EnhanceImageQualityInput - The input type for the enhanceImageQuality function.
 * - EnhanceImageQualityOutput - The return type for the enhanceImageQuality function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceImageQualityInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type EnhanceImageQualityInput = z.infer<typeof EnhanceImageQualityInputSchema>;

const EnhanceImageQualityOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'The enhanced photo, as a data URI, after undergoing quality improvements for OCR accuracy.'
    ),
});
export type EnhanceImageQualityOutput = z.infer<typeof EnhanceImageQualityOutputSchema>;

export async function enhanceImageQuality(input: EnhanceImageQualityInput): Promise<EnhanceImageQualityOutput> {
  return enhanceImageQualityFlow(input);
}

const enhanceImageQualityPrompt = ai.definePrompt({
  name: 'enhanceImageQualityPrompt',
  input: {schema: EnhanceImageQualityInputSchema},
  output: {schema: EnhanceImageQualityOutputSchema},
  prompt: `You are an AI image enhancement tool designed to improve the quality of images for Optical Character Recognition (OCR).
  Your goal is to take the input image and enhance it so that OCR can more accurately extract text and numbers from it. This may include sharpening the image, increasing contrast, and adjusting brightness.
  Return the enhanced image as a data URI in the enhancedPhotoDataUri field.

  Original Photo: {{media url=photoDataUri}}
  Enhanced Photo: {{media url=enhancedPhotoDataUri}}`,
});

const enhanceImageQualityFlow = ai.defineFlow(
  {
    name: 'enhanceImageQualityFlow',
    inputSchema: EnhanceImageQualityInputSchema,
    outputSchema: EnhanceImageQualityOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: 'enhance this image for OCR accuracy'},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {enhancedPhotoDataUri: media.url!};
  }
);
