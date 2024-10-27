import { useState, useEffect, useRef } from "react";
import { analyzeText } from "../services/openaiService";

const TextAnalyzer = ({ text }) => {
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedText = useRef("");
  const timerRef = useRef(null);

  const isEmptyResponse = (analysis) => {
    if (!analysis) return true;
    const trimmed = analysis.trim();
    if (!trimmed) return true;
    if (trimmed.toLowerCase().includes("no response")) return true;
    if (trimmed === "[") return true;
    return false;
  };

  useEffect(() => {
    // Set up interval for analysis
    timerRef.current = setInterval(async () => {
      // Ensure text is a string and different from last analyzed text
      const currentText = String(text || "");
      if (
        !currentText ||
        currentText === lastAnalyzedText.current ||
        isAnalyzing
      )
        return;

      setIsAnalyzing(true);
      try {
        const result = await analyzeText(currentText);
        // Only add to results if there's an actual alert (not empty, "No response", or "[")
        if (result && !isEmptyResponse(result.analysis)) {
          setAnalysisResults((prev) =>
            [
              {
                timestamp: new Date().toLocaleTimeString(),
                ...result,
              },
              ...prev,
            ].slice(0, 10),
          ); // Keep last 10 analyses
        }
        lastAnalyzedText.current = currentText;
      } catch (error) {
        console.error("Analysis error:", error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [text, isAnalyzing]);

  return (
    <div className="fixed right-4 top-4 bottom-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Security Analysis
        </h2>
        {isAnalyzing && (
          <span className="text-sm text-blue-500">
            Analyzing conversation...
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {analysisResults.map((result, index) => (
          <div
            key={index}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {result.timestamp}
              </span>
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                Alert
              </span>
            </div>

            <div className="text-sm">
              <div className="font-medium text-gray-600 dark:text-gray-300">
                Analyzed Text:
              </div>
              <div className="text-gray-500 dark:text-gray-400 line-clamp-3">
                {result.analyzedText}
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium text-gray-600 dark:text-gray-300">
                Analysis:
              </div>
              <div className="text-red-600 dark:text-red-400">
                {result.analysis}
              </div>
            </div>
          </div>
        ))}

        {analysisResults.length === 0 && !isAnalyzing && (
          <div className="text-center text-gray-500 dark:text-gray-400">
            No analysis results yet. Monitoring conversation...
          </div>
        )}
      </div>
    </div>
  );
};

export default TextAnalyzer;
