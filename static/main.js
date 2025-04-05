// Run this script only if we are on the chat page (basic check)
// More robust checks might involve specific IDs only present on chat.html
if (document.getElementById('chatOutput') && document.getElementById('chatInput')) {

    console.log("Chat page detected. Initializing chat script.");

    const chatInput = document.getElementById('chatInput');
    const sendChatButton = document.getElementById('sendChatButton');
    const chatOutput = document.getElementById('chatOutput');
    const md = window.markdownit();

    function addMessageToChat(sender, message, isMarkdown = false) {
        if (!chatOutput) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (isMarkdown) {
            // Sanitize potentially harmful HTML before rendering Markdown
            // NOTE: For production, use a proper sanitizer library like DOMPurify
            // const cleanHtml = someSanitizer.sanitize(md.render(message));
            // messageElement.innerHTML = cleanHtml;
            // For now, just render directly (be cautious with untrusted input)
             messageElement.innerHTML = md.render(message);
        } else {
            messageElement.appendChild(document.createTextNode(message));
        }

        chatOutput.appendChild(messageElement);
        // Scroll to the bottom smoothly
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
    }

    async function sendChatMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage || !sendChatButton || !chatOutput) return;

        addMessageToChat('user', userMessage);
        chatInput.value = '';
        chatInput.focus(); // Keep focus on input

        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
        thinkingIndicator.textContent = 'AI is thinking...';
        chatOutput.appendChild(thinkingIndicator);
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
        sendChatButton.disabled = true;

        try {
            const response = await fetch("/api/direct-chat", { // Ensure this matches server.ts endpoint
                method: "POST",
                body: JSON.stringify({ message: userMessage }),
                headers: { 'Content-Type': 'application/json' },
            });

             // Always remove indicator after fetch attempt
            if (chatOutput.contains(thinkingIndicator)) {
                 chatOutput.removeChild(thinkingIndicator);
            }

            if (!response.ok) {
                 // Try to parse error JSON, fallback to text
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                     errorData = { error: `HTTP error ${response.status}`, details: await response.text().catch(() => 'Failed to read error text.') };
                }
                 throw errorData; // Throw structured error
            }

            const data = await response.json();
            if (data && data.response) {
                addMessageToChat('ai', data.response, true);
            } else {
                // Handle cases where backend sends success but no 'response' field
                throw new Error('Received an empty or invalid response field from the server.');
            }

        } catch (error) {
            // Error handling should have already removed indicator
             if (chatOutput.contains(thinkingIndicator)) {
                try { chatOutput.removeChild(thinkingIndicator); } catch (e) {}
             }
            console.error("Error in sendChatMessage:", error);
             // Display structured error if possible, otherwise generic message
             const displayErrorMessage = (error && (error.error || error.message)) ? `${error.error || 'Error'}${error.details ? `: ${error.details}` : `: ${error.message || 'Unknown error'}`}` : 'Could not get response.';
             addMessageToChat('ai', displayErrorMessage); // Don't render error as markdown
        } finally {
             // Always re-enable button
             if (sendChatButton) sendChatButton.disabled = false;
        }
    }

    if (sendChatButton) {
        sendChatButton.addEventListener('click', sendChatMessage);
        console.log("Chat 'Send' button listener attached.");
    } else {
         console.error("Chat 'Send' button not found!");
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
         console.log("Chat input 'Enter' listener attached.");
    } else {
        console.error("Chat input element not found!");
    }

} else {
    console.log("Not on chat page, chat script not initialized.");
}