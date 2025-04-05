// Get references to the new HTML elements
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');
const chatOutput = document.getElementById('chatOutput');

// Initialize markdown-it - useful for rendering AI responses
const md = window.markdownit();

// Function to add a message to the chat output area
function addMessageToChat(sender, message, isMarkdown = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`); // Add classes for styling

    if (isMarkdown) {
        // Render message as Markdown
        messageElement.innerHTML = md.render(message);
    } else {
        // Render message as plain text (useful for user messages or simple status)
        // Create a text node to prevent HTML injection from user input
        messageElement.appendChild(document.createTextNode(message));
    }

    chatOutput.appendChild(messageElement);
    // Scroll to the bottom of the chat output
    chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Function to handle sending the chat message
async function sendChatMessage() {
    const userMessage = chatInput.value.trim(); // Get message and remove leading/trailing whitespace

    if (userMessage === "") {
        return; // Don't send empty messages
    }

    // 1. Display the user's message immediately
    addMessageToChat('user', userMessage);

    // 2. Clear the input field
    chatInput.value = '';

    // 3. Optionally, add a "thinking..." indicator
    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
    thinkingIndicator.textContent = 'AI is thinking...';
    chatOutput.appendChild(thinkingIndicator);
    chatOutput.scrollTop = chatOutput.scrollHeight;


    // 4. Send the message to the backend
    try {
        const response = await fetch("/api/direct-chat", { // Use the new backend endpoint
            method: "POST",
            body: JSON.stringify({
                message: userMessage // Send message in the request body
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Remove the "thinking..." indicator
        chatOutput.removeChild(thinkingIndicator);

        if (!response.ok) {
            // Handle HTTP errors (like 404, 500)
            const errorText = await response.text();
             addMessageToChat('ai', `Error: ${response.status} - ${errorText || response.statusText}`);
             return; // Stop processing
        }

        const data = await response.json(); // Expect JSON response like { response: "..." }

        if (data && data.response) {
            // 5. Display the AI's response (render as Markdown)
            addMessageToChat('ai', data.response, true); // Pass true for Markdown rendering
        } else {
             addMessageToChat('ai', 'Error: Received an empty or invalid response from the server.');
        }

    } catch (error) {
        // Remove the "thinking..." indicator even if there's an error
         if (chatOutput.contains(thinkingIndicator)) {
             chatOutput.removeChild(thinkingIndicator);
         }
        // Handle network errors or JSON parsing errors
        console.error("Error sending/receiving chat message:", error);
        addMessageToChat('ai', `Error: Could not connect to the server or process the response. (${error.message})`);
    }
}

// Add event listener for the Send button click
sendChatButton.addEventListener('click', sendChatMessage);

// Optional: Add event listener for pressing Enter in the textarea
chatInput.addEventListener('keypress', function (e) {
    // Check if Enter is pressed (and Shift is not, to allow newlines)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default Enter behavior (newline)
        sendChatMessage(); // Send the message
    }
});

// --- Remove the old form submission logic ---
// let form = document.querySelector('form');
// let output = document.querySelector('main .output');
// if (form) { // Check if form exists before trying to use it
//     form.onsubmit = async (ev) => {
//         // ... old logic ...
//     };
// }