import { Message } from "../types";

// Service is currently mocked as Gemini connection has been removed.
// This file is kept to maintain import stability in Chat.tsx until a new LLM service is integrated.

export const isGeminiConfigured = () => true;

export const generateAgentResponse = async (
  history: Message[],
  currentMessage: string,
  systemInstruction: string
): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return "AI capabilities are currently disabled. Please connect a new LLM provider.";
};
