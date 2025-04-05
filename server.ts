import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple handler function directly, bypassing Express for this test
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Log the incoming request URL
  console.log(`Simple Handler: Received request for ${req.url}`);

  if (req.url === '/') {
    // Send a simple HTML response directly for the root path
    res.status(200).send('<html><body><h1>Hello from Vercel!</h1></body></html>');
    console.log('Simple Handler: Sent basic HTML response for /');
  } else if (req.url?.startsWith('/api/direct-chat')) {
    // Minimal response for the API path for now
    res.status(200).json({ response: "API path reached (minimal test)" });
    console.log('Simple Handler: Sent minimal JSON response for /api/direct-chat');
  } else {
    // Handle any other path with a 404
    res.status(404).send('Not Found');
    console.log(`Simple Handler: Responded 404 for ${req.url}`);
  }
}