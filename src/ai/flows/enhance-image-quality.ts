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

const enhanceImageQualityFlow = ai.defineFlow(
  {
    name: 'enhanceImageQualityFlow',
    inputSchema: EnhanceImageQualityInputSchema,
    outputSchema: EnhanceImageQualityOutputSchema,
  },
  async (input) => {
    const { photoDataUri } = input;
    
    const textPrompt = 'Enhance this image for OCR accuracy. Improve contrast, sharpen text, and remove shadows. Return just the final processed image.';

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: photoDataUri}},
        {text: textPrompt},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image processing failed to return an image.');
    }

    return {enhancedPhotoDataUri: media.url};
  }
);
