import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface SubTask {
  text: string;
  estimatedPomodoros: number;
}

export interface TaskBreakdown {
  suggestedPomodoros: number;
  subTasks: SubTask[];
  reasoning: string;
}

export const breakdownTask = async (taskText: string): Promise<TaskBreakdown> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `As an expert productivity coach for a 3rd-year university student, breakdown the following task: "${taskText}". 
    Suggest a realistic number of 25-minute Pomodoro sessions and a list of sub-tasks.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedPomodoros: { type: Type.NUMBER },
          subTasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                estimatedPomodoros: { type: Type.NUMBER }
              },
              required: ["text", "estimatedPomodoros"]
            }
          },
          reasoning: { type: Type.STRING }
        },
        required: ["suggestedPomodoros", "subTasks", "reasoning"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const getReflectiveBreather = async (username: string = "Hngoc"): Promise<string> => {
  if (!API_KEY) return "Focus on your goals. You've got this!";
  
  const hour = new Date().getHours();
  const timeContext = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a short (max 2 sentences), warm, and deeply personal motivational quote or micro-journaling prompt for ${username}. 
    Context: It's currently ${timeContext} and they are taking a break to recharge. 
    Focus on wellness, inner peace, and mindful presence. 
    IMPORTANT: Do NOT use any Markdown formatting like bolding (**) or italics. Use plain text only. 
    Avoid generic cliches, make it feel special.`,
  });

  return (response.text || "").trim();
};

export const getNavigationPlan = async (tasks: any[], username: string = "Hngoc"): Promise<string> => {
  if (!API_KEY) return "Initialize your tasks to see a productivity navigation plan.";
  
  const tasksSummary = tasks.map(t => `- [Priority P${t.priority}] ${t.text}${t.subTasks ? ` (Subtasks: ${t.subTasks.map((s: any) => s.text).join(', ')})` : ''}`).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `As an elite productivity navigator for ${username}, analyze this task list:
    ${tasksSummary}

    Create a "Navigation Strategy" in a very natural, conversational tone. 
    Explain how to tackle these tasks, giving specific time-blocking advice and sequence recommendations. 
    Wrap up with a short, unique mantra.

    IMPORTANT: Do NOT use any Markdown formatting like bolding (**) or italics. Use plain text only. 
    Keep it concise (max 120 words), human, and direct.`,
  });

  return (response.text || "").trim();
};
