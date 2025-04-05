import express from "express";
import path from 'path';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Create the Express app instance directly
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (CSS, JS) from the 'static' directory, mapping them to the '/static' URL path
// Note: We will serve index.html explicitly from the root path below
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

// API route for chat
app.post("/api/direct-chat", async (req, res) => {
    console.log("Received request for /api/direct-chat"); // Add log
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.log("Validation failed: Message is required.");
            return res.status(400).json({ error: "Message is required and must be a non-empty string." });
        }

        console.log("Initializing ChatGoogleGenerativeAI model...");
        // *** Initialize the model HERE, inside the handler ***
        const model = new ChatGoogleGenerativeAI({
            // API key is read from GOOGLE_API_KEY env var automatically by the library
            model: "gemini-1.5-flash",
        });
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
        console.error("Error inside /api/direct-chat:", error); // Log the actual error
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        // Send a more structured error response
        return res.status(500).json({ error: "Failed to get response from AI.", details: errorMessage });
    }
});

// Explicitly handle the root route to serve index.html
app.get("/", (req, res) => {
    // In Vercel serverless, __dirname points to the compiled output directory (e.g., .vercel/output/functions/server.func)
    // We need to go up one level typically to find the root where static might be copied
    // Update: Vercel often copies files referenced by `path.join` relative to the source file. Let's try a path relative to the likely compiled location.
    // Assume 'static' is copied alongside the compiled server.ts output by Vercel's build process based on vercel.json
    const indexPath = path.resolve(__dirname, '..', 'static', 'index.html');
    // If the above doesn't work, Vercel might place static files at the root output.
    // const indexPath = path.resolve(__dirname, '../..', 'static', 'index.html'); // Go up two levels
    console.log(`Attempting to serve index.html for GET / from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`Error sending index.html from ${indexPath}:`, err);
            // Provide a more informative error if file not found
             if (err.message.includes('ENOENT')) {
                res.status(404).send(`File not found at ${indexPath}. Check build output structure and path calculation.`);
             } else {
                res.status(500).send("Error loading page.");
             }
        } else {
            console.log("Successfully sent index.html");
        }
    });
});

// Export the Express app instance for Vercel's Node.js runtime
export default app;