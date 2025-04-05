import express, { Request, Response, NextFunction } from "express"; // Import Request, Response types
// import path from 'path'; // Still not needed
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// Import types needed if/when uncommenting safety settings
// import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const app = express();
app.use(express.json());

// --- Define interfaces for request bodies (for better type checking) ---
interface ChatRequestBody {
    message?: string;
}

interface NewsRequestBody {
    topic?: string;
    tone?: string;
    language?: string;
}

interface TitlesRequestBody {
    topic?: string;
    style?: string;
    language?: string;
}

 interface CaptionRequestBody {
    topic?: string;
    platform?: string;
    tone?: string;
    language?: string;
}


// --- Helper to initialize model (keeps API key reading consistent) ---
function initializeModel() {
    console.log("Initializing ChatGoogleGenerativeAI model...");
    // API key is read from GOOGLE_API_KEY env var automatically by the library
    const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
             // Ensure imports are added if uncommenting safetySettings:
             // safetySettings: [
             //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
             //   { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
             // ],
    });
    console.log("Model initialized.");
    return model;
}

// --- API route for Direct Chat ---
// Add types Request<Params, ResBody, ReqBody>
app.post("/api/direct-chat", async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
    console.log("Received request for /api/direct-chat");
    try {
        // Use optional chaining and nullish coalescing for safer access
        const message = req.body?.message ?? '';
        if (typeof message !== 'string' || message.trim() === '') {
            console.log("Validation failed: Message is required.");
            // Explicitly return to prevent further execution
            return res.status(400).json({ error: "Message is required and must be a non-empty string." });
        }

        const model = initializeModel();
        console.log("Invoking model for direct chat with message:", message);

        const aiResponse = await model.invoke(message);
        // Access content safely, LangChain AIMessage content is often string | string[]
        const responseText = typeof aiResponse?.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse?.content);

        console.log("Received AI response content type:", typeof responseText);

        if (typeof responseText !== 'string') { // Should ideally always be string after the above line
            console.error("Unexpected AI response format after processing:", aiResponse);
            return res.status(500).json({ error: "Received unexpected response format from AI." });
        }
        console.log("Sending AI response back to client.");
        return res.json({ response: responseText }); // Ensure return

    } catch (error: unknown) { // Type error as unknown
        console.error("Error inside /api/direct-chat:", error);
        // Use type guard to safely access message
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        // Ensure return
        return res.status(500).json({ error: "Failed to get response from AI.", details: errorMessage });
    }
});

// --- API route for Short News Writer ---
app.post("/api/short-news", async (req: Request<{}, {}, NewsRequestBody>, res: Response) => {
    console.log("Received request for /api/short-news");
    try {
        const topic = req.body?.topic;
        const tone = req.body?.tone;
        const language = req.body?.language;
        if (!topic || !tone || !language) {
             // Ensure return
            return res.status(400).json({ error: "Missing required fields: topic, tone, language" });
        }

        const prompt = `Generate a concise news article, strictly under 70 words, about the following topic or URL: "${topic}".
The language must be ${language}.
Write the article in a ${tone} tone.
Format the output as a single block of text suitable for a news snippet. Include a relevant headline at the beginning, followed by the article body.`;

        const model = initializeModel();
        console.log("Invoking model for short news.");
        const aiResponse = await model.invoke(prompt);
        const responseText = typeof aiResponse?.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse?.content);


        if (typeof responseText !== 'string') {
            console.error("Unexpected AI response format for news:", aiResponse);
             // Ensure return
            return res.status(500).json({ error: "Received unexpected response format from AI." });
        }
        console.log("Sending news snippet back to client.");
         // Ensure return
        return res.json({ newsSnippet: responseText });

    } catch (error: unknown) {
        console.error("Error inside /api/short-news:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
         // Ensure return
        return res.status(500).json({ error: "Failed to generate news snippet.", details: errorMessage });
    }
});

// --- API route for Title Generator ---
app.post("/api/generate-titles", async (req: Request<{}, {}, TitlesRequestBody>, res: Response) => {
    console.log("Received request for /api/generate-titles");
    try {
        const topic = req.body?.topic;
        const style = req.body?.style;
        const language = req.body?.language;
        if (!topic || !style || !language) {
             // Ensure return
            return res.status(400).json({ error: "Missing required fields: topic, style, language" });
        }

        const prompt = `Generate a list of up to 10 catchy titles in ${language} for an article based on the following content/topic: "${topic}".
The desired title style is: ${style}.
Format the output ONLY as a numbered list (e.g., 1. Title One\n2. Title Two...). Do not include any introductory text or explanation before or after the list.`;

        const model = initializeModel();
        console.log("Invoking model for titles.");
        const aiResponse = await model.invoke(prompt);
        const responseText = typeof aiResponse?.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse?.content);


        if (typeof responseText !== 'string') {
            console.error("Unexpected AI response format for titles:", aiResponse);
             // Ensure return
            return res.status(500).json({ error: "Received unexpected response format from AI." });
        }

        const titles = responseText
            .split('\n')
            .map(line => line.trim())
            .filter(line => /^\d+\.\s+/.test(line))
            .map(line => line.replace(/^\d+\.\s+/, ''));

        console.log("Parsed titles:", titles);
        console.log("Sending titles back to client.");
         // Ensure return
        return res.json({ titles: titles });

    } catch (error: unknown) {
        console.error("Error inside /api/generate-titles:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
         // Ensure return
        return res.status(500).json({ error: "Failed to generate titles.", details: errorMessage });
    }
});

// --- API route for Caption Generator ---
app.post("/api/generate-caption", async (req: Request<{}, {}, CaptionRequestBody>, res: Response) => {
    console.log("Received request for /api/generate-caption");
    try {
        const topic = req.body?.topic;
        const platform = req.body?.platform;
        const tone = req.body?.tone;
        const language = req.body?.language;
        if (!topic || !platform || !tone || !language) {
             // Ensure return
            return res.status(400).json({ error: "Missing required fields: topic, platform, tone, language" });
        }

        const prompt = `Generate a social media post for the platform "${platform}" in ${language} about the following topic/URL: "${topic}".
The tone should be ${tone}.
Include 3-5 relevant hashtags at the end, prefixed with '#'. Emojis are encouraged if appropriate for the tone and platform.
Format the output as the caption text, followed by a line break, followed by the hashtags.`;

        const model = initializeModel();
        console.log("Invoking model for caption.");
        const aiResponse = await model.invoke(prompt);
        const responseText = typeof aiResponse?.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse?.content);


        if (typeof responseText !== 'string') {
            console.error("Unexpected AI response format for caption:", aiResponse);
             // Ensure return
            return res.status(500).json({ error: "Received unexpected response format from AI." });
        }

        const lines = responseText.split('\n');
        let caption = responseText;
        let hashtags : string[] = []; // Explicitly type hashtags
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim();
             if (lastLine.includes('#')) {
                hashtags = lastLine.split(/\s+/).filter(tag => tag.startsWith('#'));
                if (lines.length > 1) {
                    caption = lines.slice(0, -1).join('\n').trim();
                } else {
                     const lastHashIndex = caption.lastIndexOf('#');
                     if (lastHashIndex > 0) {
                         const potentialCaption = caption.substring(0, lastHashIndex).trim();
                         const potentialTags = caption.substring(lastHashIndex).split(/\s+/).filter(tag => tag.startsWith('#'));
                         if(potentialTags.length > 0){
                             caption = potentialCaption;
                             hashtags = potentialTags;
                         }
                     }
                }
             }
        }


        console.log("Sending caption and hashtags back to client.");
         // Ensure return
        return res.json({ caption: caption, hashtags: hashtags });

    } catch (error: unknown) {
        console.error("Error inside /api/generate-caption:", error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
         // Ensure return
        return res.status(500).json({ error: "Failed to generate caption.", details: errorMessage });
    }
});

// Export the Express app instance for Vercel's Node.js runtime
export default app;