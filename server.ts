import express from "express";
// import path from 'path'; // No longer needed for root route
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const app = express();
app.use(express.json());

// Optional: Static middleware for LOCAL development (not used by Vercel deployment)
// if (process.env.NODE_ENV !== 'production') {
//   app.use('/static', express.static('static'));
// }

// API route for chat - KEEP THIS
app.post("/api/direct-chat", async (req, res) => {
    console.log("Received request for /api/direct-chat");
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.log("Validation failed: Message is required.");
            return res.status(400).json({ error: "Message is required and must be a non-empty string." });
        }
        console.log("Initializing ChatGoogleGenerativeAI model...");
        const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash" });
        console.log("Model initialized. Invoking with message:", message);
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

// *** REMOVE the app.get("/") handler entirely ***
/*
app.get("/", (req, res) => {
    const indexPath = path.resolve(__dirname, '..', 'static', 'index.html');
    console.log(`Attempting to serve index.html for GET / from: ${indexPath}`);
    res.sendFile(indexPath, (err) => { // REMOVE THIS BLOCK
      // ...
    });
});
*/

// Export the Express app instance for Vercel's Node.js runtime
export default app;