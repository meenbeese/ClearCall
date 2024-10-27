import { useEffect, useState, useRef } from 'react';
import { MessageAnalyzer } from './components/MessageAnalyzer';
import { AudioVisualizer } from './components/AudioVisualizer';
import Progress from './components/Progress';
import { LanguageSelector } from './components/LanguageSelector';

const IS_WEBGPU_AVAILABLE = !!navigator.gpu;
const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

function App() {
  const worker = useRef(null);
  const recorderRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressItems, setProgressItems] = useState([]);
  const [text, setText] = useState('');
  const [tps, setTps] = useState(null);
  const [language, setLanguage] = useState('en');
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [stream, setStream] = useState(null);
  const audioContextRef = useRef(null);
  const [analyzedText, setAnalyzedText] = useState('');
  const [result, setResult] = useState('');

  let intervalId;

  useEffect(() => {
    intervalId = setInterval(() => {
      if (status === 'ready') {
        setAnalyzedText(text);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [status, text]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (text) {
        console.log('Sending analysis request for message:', text);
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: text }),
        });

        const data = await response.json();
        console.log('Received analysis:', data);
        setResult(data.result || 'No result');
      }
    };

    fetchAnalysis();
  }, [text]);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });
    }

    const onMessageReceived = e => {
      switch (e.data.status) {
        case 'loading':
          setStatus('loading');
          setLoadingMessage(e.data.data);
          break;
        case 'initiate':
          setProgressItems(prev => [...prev, e.data]);
          break;
        case 'progress':
          setProgressItems(prev =>
            prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            })
          );
          break;
        case 'done':
          setProgressItems(prev => prev.filter(item => item.file !== e.data.file));
          break;
        case 'ready':
          setStatus('ready');
          recorderRef.current?.start();
          break;
        case 'start':
          setIsProcessing(true);
          recorderRef.current?.requestData();
          break;
        case 'update':
          const { tps } = e.data;
          setTps(tps);
          break;
        case 'complete':
          setIsProcessing(false);
          setText(e.data.output);
          break;
      }
    };

    worker.current.addEventListener('message', onMessageReceived);

    return () => {
      worker.current?.terminate();
      clearInterval(intervalId); // Clear the interval here
      worker.current.removeEventListener('message', onMessageReceived);
    };
  }, [status, text]);

  useEffect(() => {
    if (!recorderRef.current) return; // Already set

    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          setStream(stream);
          recorderRef.current = new MediaRecorder(stream);
          audioContextRef.current = new AudioContext({ sampleRate: WHISPER_SAMPLING_RATE });

          recorderRef.current.onstart = () => {
            setRecording(true);
            setChunks([]);
          };
          recorderRef.current.ondataavailable = e => {
            if (e.data.size > 0) {
              setChunks(prev => [...prev, e.data]);
            } else {
              setTimeout(() => {
                recorderRef.current.requestData();
              }, 25);
            }
          };

          recorderRef.current.onstop = () => {
            setRecording(false);
          };
        })
        .catch(err => console.error('The following error occurred: ', err));
    } else {
      console.error('getUserMedia not supported on your browser!');
    }

    return () => {
      recorderRef.current?.stop();
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recorderRef.current || !recording || isProcessing || status !== 'ready') return;

    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: recorderRef.current.mimeType });
      const fileReader = new FileReader();

      fileReader.onloadend = async () => {
        const arrayBuffer = fileReader.result;
        const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
        let audio = decoded.getChannelData(0);
        if (audio.length > MAX_SAMPLES) {
          audio = audio.slice(-MAX_SAMPLES);
        }
        worker.current.postMessage({ type: 'generate', data: { audio, language } });
      };
      fileReader.readAsArrayBuffer(blob);
    } else {
      recorderRef.current?.requestData();
    }
  }, [status, recording, isProcessing, chunks, language]);

  if (!IS_WEBGPU_AVAILABLE) {
    return (
      <div className="fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center">
        WebGPU is not supported
        <br />
        by this browser :&#40;
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen mx-auto justify-end text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">
      <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
        <div className="flex flex-col items-center mb-6 max-w-[400px] text-center">
          <img src="logo.png" width="50%" height="auto" className="block mb-4" alt="Logo" />
          <h1 className="text-4xl font-bold mb-2">ClearCall</h1>
          <h2 className="text-xl font-semibold">Real-time in-browser speech recognition</h2>
        </div>

        <div className="flex flex-col items-center px-6 w-full max-w-[500px]">
          {status === null && (
            <>
              <p className="max-w-[480px] mb-6">
                <br />
                You are about to load{' '}
                <a
                  href="https://huggingface.co/onnx-community/whisper-base"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  whisper-base
                </a>
                , a 73 million parameter speech recognition model that is optimized for inference on
                the web. Once downloaded, the model (~200&nbsp;MB) will be cached and reused when
                you revisit the page.
                <br />
                <br />
                Everything runs directly in your browser using{' '}
                <a
                  href="https://huggingface.co/docs/transformers.js"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  🤗&nbsp;Transformers.js
                </a>{' '}
                and ONNX Runtime Web, meaning no data is sent to a server. You can even disconnect
                from the internet after the model has loaded!
              </p>

              <button
                className="border px-6 py-2 rounded-lg bg-blue-400 text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none mb-6"
                onClick={() => {
                  worker.current.postMessage({ type: 'load' });
                  setStatus('loading');
                }}
                disabled={status !== null}
              >
                Load model
              </button>
            </>
          )}

          <div className="w-full p-4">
            <AudioVisualizer className="w-full rounded-lg mb-4" stream={stream} />
            {status === 'ready' && (
              <div className="relative mb-4">
                <p className="w-full h-[120px] overflow-y-auto overflow-wrap-anywhere border rounded-lg p-4">
                  {text}
                </p>
                {tps && (
                  <span className="absolute bottom-2 right-2 px-2">{tps.toFixed(2)} tok/s</span>
                )}
              </div>
            )}
          </div>
          {status === 'ready' && (
            <div className="relative w-full flex justify-between px-4 mb-6 gap-4">
              <LanguageSelector
                language={language}
                setLanguage={e => {
                  recorderRef.current?.stop();
                  setLanguage(e);
                  recorderRef.current?.start();
                }}
                className="border hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              />
              <button
                className="border rounded-lg px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  recorderRef.current?.stop();
                  recorderRef.current?.start();
                }}
              >
                Reset
              </button>
            </div>
          )}
          {status === 'ready' && analyzedText && <MessageAnalyzer message={analyzedText} />}
          {status === 'loading' && (
            <div className="w-full max-w-[500px] mx-auto p-6">
              <p className="text-center mb-4">{loadingMessage}</p>
              {progressItems.map(({ file, progress, total }, i) => (
                <Progress key={i} text={file} percentage={progress} total={total} />
              ))}
            </div>
          )}
        </div>
        {status === 'ready' && (
          <div className="w-full max-w-[500px] mx-auto p-6">
            <h2 className="text-xl font-semibold mb-2">Result:</h2>
            <p className="border rounded-lg p-4">{`Result: ${result}`}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
