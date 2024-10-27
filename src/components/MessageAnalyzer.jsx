import React, { useEffect, useState } from 'react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const MessageAnalyzer = ({ message }) => {
  const [responseText, setResponseText] = useState('');

  const fetchResponse = async () => {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Detect social engineering and scam attempts...',
          },
          { role: 'user', content: message },
        ],
        temperature: 1,
        max_tokens: 4095,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const alertMessage = response.choices[0]?.message?.content || 'No response';
      setResponseText(alertMessage);
    } catch (error) {
      console.error('Error fetching response:', error);
      setResponseText('Error fetching response');
    }
  };

  useEffect(() => {
    fetchResponse();

    const intervalId = setInterval(fetchResponse, 10000);
    return () => clearInterval(intervalId);
  }, [message]);

  return (
    <div>
      <div className="border rounded p-2 w-full" style={{ minHeight: '200px' }}>
        {responseText}
      </div>
    </div>
  );
};
