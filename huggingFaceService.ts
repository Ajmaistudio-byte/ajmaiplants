
import { GoogleGenAI } from "@google/genai";

// Helper to get client safely
const getClient = () => {
  // Updated with the user's new permanent key
  const apiKey = "AIzaSyBz_gRuNxbnwVC8RZkQuONIdbNWOt1C0_U";
  return new GoogleGenAI({ apiKey });
};

export const generatePlantImage = async (plantName: string): Promise<string | null> => {
  try {
    const ai = getClient();
    const prompt = `Cinematic, 4k, realistic, botanical square image of a ${plantName} in a futuristic cyberpunk garden setting, neon lights, highly detailed.`;
    
    // Using gemini-2.5-flash-image for image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      },
    });

    // Iterate through parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          // Gemini returns raw base64, we need to prefix it
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};
