import OpenAI from 'openai';

let openai = null;
let textBuffer = '';

function initializeOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
}

export async function analyzeText(text) {
  // Ensure text is a string and not empty
  const textToAnalyze = String(text || '').trim();
  if (!textToAnalyze) return null;

  try {
    initializeOpenAI();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Detect social engineering and scam attempts during phone calls by analyzing conversations in real-time for indications of suspicious behavior or manipulative language. Alert the user promptly if a potential threat is identified, providing relevant information about the detected scam or tactic.\n\n- Only respond when a risk or threat is detected.\n- Remain silent if the conversation appears safe with no malicious indicators.\n\nProvide alerts in a helpful, warm, and friendly tone, ensuring users feel supported and informed. Focus on clear and concise explanations about the potential danger and suggested actions without divulging unnecessary technical details. Maintain an engaging yet firm tone to ensure users take necessary security measures.\n\n# Steps\n\n1. Monitor and analyze conversation content continuously.\n2. Identify patterns or phrases indicative of social engineering or scams.\n3. Upon detection, generate a clear and concise alert message for the user.\n4. Include specific information about the threat and suggested precautions.\n5. Ensure the alert tone is supportive yet firm to encourage user action.\n\n# Output Format\n\n- A concise alert message clearly outlining the identified threat and recommended user action.\n- Only output this message when a threat is detected. No response is needed if the text is safe.\n\n# Examples\n\n### Example 1:\n**Input:** "[Potentially malicious conversation with phrases or behavior typical of social engineering detected.]"\n**Output:** "Alert: We\'ve detected a potential scam in progress. The caller may be trying to trick you into providing personal information. To stay safe, avoid sharing any private details and consider ending the call."\n\n### Example 2:\n**Input:** "[Normal conversation without any malicious indicators.]"\n**Output:** [No response] \n\n# Notes\n\n- Always prioritize user safety in your alerts.\n- Stay up-to-date on common and emerging social engineering tactics to improve accuracy in threat detection.\n- Alerts should be as non-intrusive as possible while effectively conveying the risk.',
        },
        {
          role: 'user',
          content: textToAnalyze,
        },
      ],
      temperature: 1,
      max_tokens: 4095,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    return {
      analysis: response.choices[0].message.content,
      analyzedText: textToAnalyze,
    };
  } catch (error) {
    console.error('Error analyzing text:', error);
    throw error;
  }
}

export function updateTextBuffer(newText) {
  textBuffer = String(newText || '');
}

export function getTextBuffer() {
  return textBuffer;
}
