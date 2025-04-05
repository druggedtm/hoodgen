import express from "express";
// import path from 'path'; // Not needed if Vercel handles static serving
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const app = express();
app.use(express.json());

// --- Helper to initialize model (keeps API key reading consistent) ---
function initializeModel() {
     console.log("Initializing ChatGoogleGenerativeAI model...");
     // API key is read from GOOGLE_API_KEY env var automatically by the library
     const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash", // Or choose another appropriate model
            // Consider adding safety settings if needed, e.g.:
            // safetySettings: [
            //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
            //   { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
            // ],
            // Increase timeout if needed, although Vercel's function timeout is the main limit
            // timeout: 60000, // 60 seconds (example)
     });
     console.log("Model initialized.");
     return model;
}

// --- API route for Direct Chat ---
app.post("/api/direct-chat", async (req, res) => {
    console.log("Received request for /api/direct-chat");
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.log("Validation failed: Message is required.");
            return res.status(400).json({ error: "Message is required and must be a non-empty string." });
        }

        const model = initializeModel(); // Initialize lazily
        console.log("Invoking model for direct chat with message:", message);

        const aiResponse = await model.invoke(message);
        const responseText = aiResponse?.content;
        console.log("Received AI response content type:", typeof responseText);

        if (typeof responseText !== 'string') {
             console.error("Unexpected AI response format:", aiResponse);
             return res.status(500).json({ error: "Received unexpected response format from AI." });
        }
        console.log("Sending AI response back to client.");
        return res.json({ response: responseText });

    } catch (error) {
        console.error("Error inside /api/direct-chat:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return res.status(500).json({ error: "Failed to get response from AI.", details: errorMessage });
    }
});

// --- API route for Short News Writer ---
app.post("/api/short-news", async (req, res) => {
     console.log("Received request for /api/short-news");
    try {
        const { topic, tone, language } = req.body;
        if (!topic || !tone || !language) {
            return res.status(400).json({ error: "Missing required fields: topic, tone, language" });
        }

        const prompt = `Generate a concise news article, strictly under 70 words, about the following topic or URL: "${topic}".
The language must be ${language}.
Write the article in a ${tone} tone.
Format the output as a single block of text suitable for a news snippet. Include a relevant headline at the beginning, followed by the article body.`;

        const model = initializeModel();
        console.log("Invoking model for short news.");
        const aiResponse = await model.invoke(prompt);
        const responseText = aiResponse?.content;

        if (typeof responseText !== 'string') {
             console.error("Unexpected AI response format for news:", aiResponse);
             return res.status(500).json({ error: "Received unexpected response format from AI." });
        }
        console.log("Sending news snippet back to client.");
        return res.json({ newsSnippet: responseText });

    } catch (error) {
        console.error("Error inside /api/short-news:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return res.status(500).json({ error: "Failed to generate news snippet.", details: errorMessage });
    }
});

// --- API route for Title Generator ---
app.post("/api/generate-titles", async (req, res) => {
    console.log("Received request for /api/generate-titles");
    try {
        const { topic, style, language } = req.body;
         if (!topic || !style || !language) {
            return res.status(400).json({ error: "Missing required fields: topic, style, language" });
        }

        // Simple approach: ask for a numbered list. Parsing might be needed if format varies.
        const prompt = `Generate a list of up to 10 catchy titles in ${language} for an article based on the following content/topic: "${topic}".
The desired title style is: ${style}.
Format the output ONLY as a numbered list (e.g., 1. Title One\n2. Title Two...). Do not include any introductory text or explanation before or after the list.`;

        const model = initializeModel();
        console.log("Invoking model for titles.");
        const aiResponse = await model.invoke(prompt);
        const responseText = aiResponse?.content;

        if (typeof responseText !== 'string') {
             console.error("Unexpected AI response format for titles:", aiResponse);
             return res.status(500).json({ error: "Received unexpected response format from AI." });
        }

        // Attempt to parse the numbered list
        const titles = responseText
            .split('\n') // Split into lines
            .map(line => line.trim()) // Trim whitespace
            .filter(line => /^\d+\.\s+/.test(line)) // Keep lines starting with "N. "
            .map(line => line.replace(/^\d+\.\s+/, '')); // Remove the "N. " prefix

        console.log("Parsed titles:", titles);
        console.log("Sending titles back to client.");
        return res.json({ titles: titles }); // Send back array of titles

    } catch (error) {
        console.error("Error inside /api/generate-titles:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return res.status(500).json({ error: "Failed to generate titles.", details: errorMessage });
    }
});

// --- API route for Caption Generator ---
app.post("/api/generate-caption", async (req, res) => {
    console.log("Received request for /api/generate-caption");
     try {
        const { topic, platform, tone, language } = req.body;
         if (!topic || !platform || !tone || !language) {
            return res.status(400).json({ error: "Missing required fields: topic, platform, tone, language" });
        }

        const prompt = `Generate a social media post for the platform "${platform}" in ${language} about the following topic/URL: "${topic}".
The tone should be ${tone}.
Include 3-5 relevant hashtags at the end, prefixed with '#'. Emojis are encouraged if appropriate for the tone and platform.
Format the output as the caption text, followed by a line break, followed by the hashtags.`;

        const model = initializeModel();
        console.log("Invoking model for caption.");
        const aiResponse = await model.invoke(prompt);
        const responseText = aiResponse?.content;

        if (typeof responseText !== 'string') {
             console.error("Unexpected AI response format for caption:", aiResponse);
             return res.status(500).json({ error: "Received unexpected response format from AI." });
        }

        // Basic parsing attempt for caption and hashtags
        const lines = responseText.split('\n');
        let caption = responseText; // Default to full text
        let hashtags = [];
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine.includes('#')) {
            // Assume last line contains hashtags if '#' is present
            hashtags = lastLine.split(/\s+/).filter(tag => tag.startsWith('#'));
            // Remove the hashtag line from the caption if it was separate
            if (lines.length > 1) {
                 caption = lines.slice(0, -1).join('\n').trim();
            } else {
                // Handle case where caption and hashtags might be on the same line
                const lastHashIndex = caption.lastIndexOf('#');
                if (lastHashIndex > 0) { // Ensure hash isn't the very first character
                    // Attempt to split hashtags from caption text cautiously
                     const potentialCaption = caption.substring(0, lastHashIndex).trim();
                     const potentialTags = caption.substring(lastHashIndex).split(/\s+/).filter(tag => tag.startsWith('#'));
                     if(potentialTags.length > 0){
                         caption = potentialCaption;
                         hashtags = potentialTags;
                     }
                }
            }
        }


        console.log("Sending caption and hashtags back to client.");
        return res.json({ caption: caption, hashtags: hashtags });

    } catch (error) {
        console.error("Error inside /api/generate-caption:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return res.status(500).json({ error: "Failed to generate caption.", details: errorMessage });
    }
});

// Export the Express app instance for Vercel's Node.js runtime
export default app;