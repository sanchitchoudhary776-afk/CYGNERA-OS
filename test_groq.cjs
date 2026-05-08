const Groq = require('groq-sdk');
const client = new Groq({ apiKey: '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' });

async function main() {
  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: 'user', content: 'Test' }],
      model: 'llama-3.1-8b-instant',
    });
    console.log("Success! Fallback key is active and unrestricted.");
  } catch (err) {
    console.error("Fallback key failed:", err.message);
  }
}
main();
