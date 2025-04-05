// Removed fs import as we are not reading image files anymore
// import * as fs from 'fs/promises';

// Keep genkit import if you plan to use Genkit features later, otherwise optional for this simple chat
// import { genkit, z } from 'genkit';

import express from "express";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// Removed unused Langchain imports related to specific prompt templates/parsers for the recipe flow
// import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
// import { StringOutputParser } from '@langchain/core/output_parsers';
// import { RunnableSequence } from '@langchain/core/runnables';
// import { HumanMessage } from "@langchain/core/messages";

const port = process.env.PORT || 3000;

// Keep Genkit initialization if planning to use it, otherwise can be simplified
// export const ai = genkit({
//     plugins: [],
// });

// Keep the model initialization - this is how we talk to Gemini
const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    // Consider adding safetySettings if needed
    // safetySettings: [...]
});

// --- Removed Recipe Generation Specific Code ---
// const systemMessage = ...
// const userMessageAboutPrompt = ...
// const imageMessage = ...
// const prompt = ...
// export const recipieWithContextFlow = ...
// --- End of Removed Code ---


async function createServer() {
    const app = express();

    // Serve static files (index.html, main.js, style.css)
    app.use(express.static('static'));

    // Middleware to parse JSON request bodies
    app.use(express.json());

    // --- Removed Old '/api/generate' Endpoint ---
    // app.post("/api/generate", ...) ...
    // --- End of Removed Endpoint ---

    // +++ Add New Endpoint for Direct Chat +++
    app.post("/api/direct-chat", async (req, res) => {
        try {
            // 1. Get the user's message from the request body
            const { message } = req.body;

            if (!message || typeof message !== 'string' || message.trim() === '') {
                return res.status(400).json({ error: "Message is required and must be a non-empty string." });
            }

            console.log(`Received message: "${message}"`); // Log received message (optional)

            // 2. Call the Gemini model via LangChain
            // For simple chat, just invoke the model with the user's message
            // The model instance handles the interaction with the Gemini API
            const aiResponse = await model.invoke(message);

            console.log("AI Response:", aiResponse); // Log AI response (optional)

            // Ensure the response has the expected structure (AIMessage usually has 'content')
            const responseText = aiResponse?.content;

            if (typeof responseText !== 'string') {
                 console.error("Unexpected AI response format:", aiResponse);
                 return res.status(500).json({ error: "Received unexpected response format from AI." });
            }

            // 3. Send the AI's response back to the frontend
            // Match the format expected by main.js: { response: "..." }
            return res.json({ response: responseText });

        } catch (error) {
            console.error("Error in /api/direct-chat:", error);
            // Send a generic error message back to the client
            // Avoid sending detailed internal errors unless necessary for debugging
            // Check if error has a message property
            const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
            return res.status(500).json({ error: "Failed to get response from AI.", details: errorMessage });
        }
    });
    // +++ End of New Endpoint +++

    app.listen(port, () => { // Added callback for confirmation
        console.log(`Server started: http://localhost:${port}`);
        console.log("Serving static files from 'static' directory.");
        console.log("API endpoint available at POST /api/direct-chat");
    });
}

createServer();