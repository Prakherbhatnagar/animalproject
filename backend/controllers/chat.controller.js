import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gen AI client safely. Default to an empty key so it doesn't crash on boot without one.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const handleChat = async (req, res) => {
  const { prompt, contextLog } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  // Check if real API key exists so we don't crash mock tests
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ 
      reply: "Hi! This is the PawRescue AI placeholder. To activate my true intelligence, please place your GEMINI_API_KEY in the backend `.env` file!" 
    });
  }

  try {
    const combinedPrompt = contextLog ? `${contextLog}\n\nUser: ${prompt}` : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: combinedPrompt,
      config: {
        systemInstruction: "You are PawRescue Support, an AI assistant for a stray animal rescue platform in India. Your goal is to help users report strays, understand first-aid, use the app, and connect with NGOs. Keep answers very concise, warm, helpful, and under 3 paragraphs. You can mention that users can earn 'coins' for reporting animals, use the 'AI Match' feature to find lost pets, and 'Donate' securely. If asked unrelated questions, politely refuse.",
        temperature: 0.5
      }
    });

    res.status(200).json({ reply: response.text });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
};
