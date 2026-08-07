import { detectIntents } from './services/ai/IntentDetector.js';

const runTest = async () => {
  const message = "Where am I spending the most?";
  
  console.log("Testing IntentDetector for:", message);
  const intents = detectIntents(message);
  console.log("Detected intents:", intents);

  const message2 = "Suggest a monthly budget";
  console.log("\nTesting IntentDetector for:", message2);
  console.log("Detected intents:", detectIntents(message2));
};

runTest();
