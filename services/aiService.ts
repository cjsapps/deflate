
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Generates descriptive tags for an image using Gemini.
 * Uses a base64 encoded thumbnail to save bandwidth.
 */
export const generateImageTags = async (base64Data: string, mimeType: string): Promise<string[]> => {
  try {
    const prompt = "Analyze this image and provide 5-10 descriptive, SEO-friendly tags/keywords as a single comma-separated list. Focus on subject, setting, and dominant colors. Return only the keywords.";
    
    // Clean base64 string
    const base64 = base64Data.split(',')[1] || base64Data;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64,
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

    const text = response.text || '';
    return text.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag !== 'undefined');
  } catch (error) {
    console.error("AI Tagging Error:", error);
    return [];
  }
};
