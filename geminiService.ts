
import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_PLANT_PROMPT } from "../constants";
import { PlantDetails } from "../types";

// Helper to get client safely
const getClient = () => {
  // Updated with the user's new permanent key
  const apiKey = "AIzaSyBz_gRuNxbnwVC8RZkQuONIdbNWOt1C0_U";
  return new GoogleGenAI({ apiKey });
};

export const analyzePlantImage = async (base64Image: string): Promise<PlantDetails> => {
  const ai = getClient();
  
  // Removing data:image/jpeg;base64, prefix if present
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  try {
    // Using gemini-3-flash-preview as the standard model for multimodal tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: INITIAL_PLANT_PROMPT
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            scientificName: { type: Type.STRING },
            careInstructions: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['name', 'scientificName', 'careInstructions', 'confidence']
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from Gemini");

    // Clean markdown code blocks if present (e.g. ```json ... ```)
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(text);

    // Strict sanitization to prevent UI crashing or showing [object Object]
    const sanitized: PlantDetails = {
        name: typeof parsed.name === 'string' ? parsed.name : String(parsed.name || "Unknown Plant"),
        scientificName: typeof parsed.scientificName === 'string' ? parsed.scientificName : String(parsed.scientificName || "Flora Incognita"),
        // Ensure careInstructions is strictly a string
        careInstructions: typeof parsed.careInstructions === 'string' 
            ? parsed.careInstructions 
            : (typeof parsed.careInstructions === 'object' ? JSON.stringify(parsed.careInstructions) : String(parsed.careInstructions || "No instructions available.")),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0
    };

    return sanitized;

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    // Fallback if parsing fails or API fails
    return {
      name: "Unknown Plant",
      scientificName: "Flora Incognita",
      careInstructions: "Could not analyze image. Please try again.",
      confidence: 0
    };
  }
};

export const chatWithGemini = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> => {
  const ai = getClient();
  
  const systemContext = `
    You are Plant Ai Pro, the advanced AI interface for this application.
    
    APP CAPABILITIES:
    1. **Scan**: Users can tap the Camera icon to identify plants instantly.
    2. **Upload**: Users can upload existing photos for analysis.
    3. **Analysis**: You provide Common Name, Scientific Name, and specific Care Protocols (Light, Water, Soil).
    4. **Generative Art**: The app generates a futuristic 4K visualization of the scanned plant.
    5. **Access**: Users can start a Free Trial (Guest Mode) or Login for full access.
    
    YOUR ROLE:
    - Guide users on how to use the app.
    - Answer general botanical questions.
    - Be helpful, futuristic, and friendly (slightly robotic charm is good).
    - If a user asks "How do I scan?", tell them to tap the Camera button on the dashboard.
    - If they are not logged in, encourage them to "Initialize Registry" (Sign Up) or "Start Trial".
    
    Keep responses concise (under 50 words unless asked for detail).
  `;

  // Using gemini-3-flash-preview for chat consistency
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    history: history,
    config: {
        systemInstruction: systemContext
    }
  });

  const result = await chat.sendMessage({ message });
  return result.text || "I am having trouble processing that request.";
};
