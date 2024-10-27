import {
  AutoTokenizer,
  AutoProcessor,
  WhisperForConditionalGeneration,
  TextStreamer,
  full,
} from '@huggingface/transformers';

const MAX_NEW_TOKENS = 64;

class AutomaticSpeechRecognitionPipeline {
  static model_id = null;
  static tokenizer = null;
  static processor = null;
  static model = null;

  static async getInstance(progress_callback = null) {
    this.model_id = 'onnx-community/whisper-base';

    // Load tokenizer, processor, and model
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback,
    });
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback,
    });
    this.model ??= WhisperForConditionalGeneration.from_pretrained(this.model_id, {
      dtype: {
        encoder_model: 'fp32', // 'fp16' works too
        decoder_model_merged: 'q4', // or 'fp32' ('fp16' is broken)
      },
      device: 'webgpu',
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.processor, this.model]);
  }
}

let processing = false;

async function generate({ audio, language }) {
  if (processing) return;
  processing = true;

  self.postMessage({ status: 'start' });

  const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance();

  let startTime;
  let numTokens = 0;

  const callback_function = output => {
    startTime ??= performance.now();
    let tps;
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
    self.postMessage({ status: 'update', output, tps, numTokens });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
  });

  const inputs = await processor(audio);

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: MAX_NEW_TOKENS,
    language,
    streamer,
  });

  const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });
  self.postMessage({ status: 'complete', output: outputText });
  processing = false;
}

async function load() {
  self.postMessage({ status: 'loading', data: 'Loading model...' });

  try {
    const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(
      x => {
        // Ensure progress callback is sending updates
        self.postMessage({ status: 'loading', data: x });
      }
    );

    self.postMessage({ status: 'loading', data: 'Compiling shaders and warming up model...' });

    await model.generate({
      input_features: full([1, 80, 3000], 0.0),
      max_new_tokens: 1,
    });

    self.postMessage({ status: 'ready' });
  } catch (error) {
    console.error('Error loading model:', error);
    self.postMessage({ status: 'error', data: error.message });
  }
}

self.addEventListener('message', async e => {
  const { type, data } = e.data;

  switch (type) {
    case 'load':
      load();
      break;
    case 'generate':
      generate(data);
      break;
  }
});
