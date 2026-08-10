import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../server/.env') });

const apiKey = process.env.GEMINI_API_KEY;
const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

console.log('SETUP CHECK: GEMINI_API_KEY present:', apiKey ? 'YES (' + apiKey.length + ' chars)' : 'MISSING');
console.log('SETUP CHECK: GEMINI_MODEL configured:', configuredModel);

if (!apiKey || apiKey.trim() === '') {
  console.error('FATAL: GEMINI_API_KEY is missing. Cannot proceed.');
  process.exit(1);
}

try {
  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.list();
  const models = [];
  for await (const m of result) {
    models.push(m.name || '');
  }
  console.log('\nAvailable models count:', models.length);
  
  // Check if configured model is in the list (model names may include "models/" prefix)
  const match = models.find(n => 
    n === configuredModel || 
    n === 'models/' + configuredModel || 
    n.includes(configuredModel)
  );
  
  if (match) {
    console.log('MODEL CHECK: PASS — found "' + configuredModel + '" as: ' + match);
  } else {
    console.error('MODEL CHECK: FAIL — "' + configuredModel + '" not found in available models!');
    console.log('Available model names:');
    models.forEach(m => console.log('  -', m));
    process.exit(1);
  }
  
  // Quick sanity ping — generateContent with minimal input
  console.log('\nSANITY PING: Sending test prompt...');
  const pingResult = await ai.models.generateContent({
    model: configuredModel,
    contents: [{ role: 'user', parts: [{ text: 'Say only "pong" and nothing else.' }] }]
  });
  console.log('SANITY PING: Response text =', pingResult.text?.trim());
  console.log('SANITY PING: PASS');

} catch (e) {
  console.error('ERROR during model check:', e.message);
  if (e.status) console.error('HTTP status:', e.status);
  process.exit(1);
}
