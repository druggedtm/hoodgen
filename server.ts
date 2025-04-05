import express from "express";
import path from 'path'; // Import the 'path' module
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const port = process.env.PORT || 3000; // Vercel sets this

const model = new ChatGoogleGenerativeAI({
    // API key is read from GOOGLE_API_KEY env var automatically
    model: "gemini-1.5-flash",
});

async function createServer() {
    const app = express();

    // Serve static files (still good practice for CSS, JS)
    app.use('/static', express.static(path.join(__dirname, '..', 'static'))); // More specific path

    // Middleware to parse JSON request bodies
    app.use(express.json());

    // API route
    app.post("/api/direct-chat", async (req, res) => {
        // ... (keep existing chat logic)
        try {
            const { message } = req.body;
            if (!message || typeof message !== 'string' || message.trim() === '') {
                return res.status(400).json({ error: "Message is required and must be a non-empty string." });
            }
            const aiResponse = await model.invoke(message);
            const responseText = aiResponse?.content;
            if (typeof responseText !== 'string') {
                 console.error("Unexpected AI response format:", aiResponse);
                 return res.status(500).json({ error: "Received unexpected response format from AI." });
            }
            return res.json({ response: responseText });
        } catch (error) {
            console.error("Error in /api/direct-chat:", error);
            const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
            return res.status(500).json({ error: "Failed to get response from AI.", details: errorMessage });
        }
    });

    // +++ Explicitly handle the root route +++
    app.get("/", (req, res) => {
        // Construct the absolute path to index.html
        // In Vercel serverless, __dirname points to the compiled output directory
        const indexPath = path.join(__dirname, '..', 'static', 'index.html');
        console.log(`Attempting to serve index.html from: ${indexPath}`); // Log path
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error("Error sending index.html:", err);
                res.status(500).send("Error loading page.");
            }
        });
    });
    // +++ End of root route handler +++


    // Vercel handles the listening part when deployed as a serverless function
    // The app.listen is mostly for local development now.
    if (process.env.NODE_ENV !== 'production') {
      app.listen(port, () => {
          console.log(`Server started locally: http://localhost:${port}`);
      });
    }
}

createServer();

// Export the app for Vercel's Node.js runtime
export default createServer; // Or just `export default app;` if createServer only creates `app`