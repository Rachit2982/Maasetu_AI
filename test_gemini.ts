import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello, are you working?",
    });
    console.log("Gemini Response:", response.text);
  } catch (error: any) {
    console.error("Gemini Error:", error.message);
  }
}

testGemini();
