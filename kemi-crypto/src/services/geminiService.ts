import axios from 'axios';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const generateGeminiAnalysis = async (prompt: string, apiKey: string): Promise<string> => {
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      }
    );
    // Gemini returns the text in response.data.candidates[0].content.parts[0].text
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated.';
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Failed to generate response. Please check your Gemini API key and try again.';
  }
}; 