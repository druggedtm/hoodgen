console.log("main.js script started execution."); // LOG 1: Script start

// --- Common Elements & Setup ---
const md = window.markdownit(); // Markdown renderer

function showLoading(outputElementId) {
    // ... (keep function as is)
    const outputElement = document.getElementById(outputElementId);
    if (outputElement) {
        outputElement.innerHTML = 'Generating...';
        outputElement.classList.add('loading');
    }
}

function hideLoading(outputElementId) {
     // ... (keep function as is)
     const outputElement = document.getElementById(outputElementId);
     if (outputElement) {
        outputElement.classList.remove('loading');
        if (outputElement.innerHTML === 'Generating...') {
            outputElement.innerHTML = '';
        }
    }
}

function displayOutput(outputElementId, content, isMarkdown = false) {
     // ... (keep function as is)
     const outputElement = document.getElementById(outputElementId);
     if (outputElement) {
        hideLoading(outputElementId);
        if (isMarkdown) {
            outputElement.innerHTML = md.render(content);
        } else {
            outputElement.textContent = content;
        }
     }
}

function displayError(outputElementId, error) {
    // ... (keep function as is)
    const outputElement = document.getElementById(outputElementId);
     if (outputElement) {
        hideLoading(outputElementId);
        let errorMessage = 'An unknown error occurred.';
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && error.message) {
            errorMessage = error.message;
        } else if (error && error.error) {
             errorMessage = `${error.error}${error.details ? ` (${error.details})` : ''}`;
        }
        console.error(`Error for ${outputElementId}:`, error);
        outputElement.innerHTML = `<span style="color: red;">Error: ${errorMessage}</span>`;
     }
}

// --- Tab Switching Logic ---
console.log("Setting up tab switching..."); // LOG 2: Tab setup start
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

if (tabButtons.length > 0 && tabPanes.length > 0) {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log(`Tab button clicked: ${button.getAttribute('data-tab')}`); // LOG: Tab click
            const targetTab = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabPanes.forEach(pane => {
                if (pane.id === targetTab) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });
    console.log("Tab switching setup complete."); // LOG 3: Tab setup end
} else {
     console.warn("Could not find tab buttons or panes for setup."); // LOG: Tab setup failed
}


// --- Direct Chat Logic ---
console.log("Setting up Direct Chat..."); // LOG 4: Chat setup start
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');
const chatOutput = document.getElementById('chatOutput');

// Function to add a message to the chat output area (keep as is)
function addMessageToChat(sender, message, isMarkdown = false) {
    // ... (keep function as is)
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    if (isMarkdown) {
        messageElement.innerHTML = md.render(message);
    } else {
        messageElement.appendChild(document.createTextNode(message));
    }
    if (chatOutput) { // Add check for chatOutput existence
        chatOutput.appendChild(messageElement);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    } else {
        console.error("chatOutput element not found when trying to add message.");
    }
}

// Function to handle sending the chat message (keep as is, check fetch URL)
async function sendChatMessage() {
    // ... (keep function as is)
    console.log("sendChatMessage called."); // LOG: Chat send function start
    if (!chatInput || !chatOutput || !sendChatButton) {
         console.error("Chat elements not found in sendChatMessage.");
         return;
    }
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    addMessageToChat('user', userMessage);
    chatInput.value = '';

    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
    thinkingIndicator.textContent = 'AI is thinking...';
    chatOutput.appendChild(thinkingIndicator);
    chatOutput.scrollTop = chatOutput.scrollHeight;
    sendChatButton.disabled = true;

    try {
        console.log("Fetching /api/direct-chat..."); // LOG: Before fetch
        const response = await fetch("/api/direct-chat", { // Ensure this matches backend route
            method: "POST",
            body: JSON.stringify({ message: userMessage }),
            headers: { 'Content-Type': 'application/json' },
        });
        console.log("Fetch response status:", response.status); // LOG: After fetch

        if (chatOutput.contains(thinkingIndicator)) {
             chatOutput.removeChild(thinkingIndicator);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
            console.error("Chat fetch error:", errorData); // Log fetch error
            throw errorData;
        }

        const data = await response.json();
        if (data && data.response) {
            addMessageToChat('ai', data.response, true);
        } else {
            throw new Error('Received an empty or invalid response from the server.');
        }

    } catch (error) {
        if (chatOutput && chatOutput.contains(thinkingIndicator)) {
             chatOutput.removeChild(thinkingIndicator);
        }
        console.error("Error in sendChatMessage catch block:", error);
         addMessageToChat('ai', `Error: ${error.error || error.message || 'Could not get response.'}`);
    } finally {
         if(sendChatButton) sendChatButton.disabled = false;
    }
}

// Add event listener for the Send button click
if (sendChatButton) {
    console.log("Attaching click listener to sendChatButton."); // LOG 5: Chat button listener
    sendChatButton.addEventListener('click', sendChatMessage);
} else {
    console.error("sendChatButton not found, cannot attach listener."); // LOG: Chat button not found
}

// Optional: Add event listener for pressing Enter in the textarea
if (chatInput) {
     console.log("Attaching keypress listener to chatInput."); // LOG 6: Chat input listener
    chatInput.addEventListener('keypress', function (e) {
        console.log(`Keypress event: key=${e.key}, shiftKey=${e.shiftKey}`); // LOG: Keypress details
        if (e.key === 'Enter' && !e.shiftKey) {
            console.log("Enter pressed without Shift, preventing default and sending message."); // LOG: Enter detected
            e.preventDefault(); // Prevent default Enter behavior (newline)
            sendChatMessage(); // Send the message
        }
    });
} else {
    console.error("chatInput not found, cannot attach listener."); // LOG: Chat input not found
}
console.log("Direct Chat setup complete."); // LOG 7: Chat setup end


// --- Short News Writer Logic ---
console.log("Setting up Short News..."); // LOG 8: News setup start
const generateNewsButton = document.getElementById('generateNewsButton');
if (generateNewsButton) {
    console.log("Attaching click listener to generateNewsButton."); // LOG 9: News button listener
    generateNewsButton.addEventListener('click', async () => {
        console.log("generateNewsButton clicked."); // LOG: News button click handler start
        const topicEl = document.getElementById('newsTopic');
        const toneEl = document.getElementById('newsTone');
        const langEl = document.getElementById('newsLang');
        const outputId = 'newsOutput';

        if(!topicEl || !toneEl || !langEl) {
            console.error("News form elements not found.");
            displayError(outputId, 'Internal error: Form elements missing.');
            return;
        }

        const topic = topicEl.value;
        const tone = toneEl.value;
        const language = langEl.value;

        if (!topic.trim()) {
            displayError(outputId, 'Please enter a topic, info, or link.');
            return;
        }

        showLoading(outputId);
        generateNewsButton.disabled = true;

        try {
            console.log("Fetching /api/short-news..."); // LOG: Before fetch
            const response = await fetch("/api/short-news", { // Ensure this matches backend route
                method: "POST",
                body: JSON.stringify({ topic, tone, language }),
                headers: { 'Content-Type': 'application/json' },
            });
             console.log("Fetch response status:", response.status); // LOG: After fetch

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 console.error("News fetch error:", errorData); // Log fetch error
                 throw errorData;
            }

            const data = await response.json();
            if (data && data.newsSnippet) {
                displayOutput(outputId, data.newsSnippet, true);
            } else {
                throw new Error('Received invalid news data from server.');
            }
        } catch (error) {
            console.error("Error in generateNews catch block:", error); // Log catch block error
            displayError(outputId, error);
        } finally {
            if(generateNewsButton) generateNewsButton.disabled = false;
        }
    });
} else {
     console.error("generateNewsButton not found, cannot attach listener."); // LOG: News button not found
}
console.log("Short News setup complete."); // LOG 10: News setup end

// --- Title Generator Logic ---
console.log("Setting up Title Generator..."); // LOG 11: Titles setup start
const generateTitlesButton = document.getElementById('generateTitlesButton');
if (generateTitlesButton) {
    console.log("Attaching click listener to generateTitlesButton."); // LOG 12: Titles button listener
    generateTitlesButton.addEventListener('click', async () => {
        console.log("generateTitlesButton clicked."); // LOG: Titles button click handler start
        const topicEl = document.getElementById('titleTopic');
        const styleEl = document.getElementById('titleStyle');
        const langEl = document.getElementById('titleLang');
        const outputId = 'titlesOutput';

         if(!topicEl || !styleEl || !langEl) {
            console.error("Titles form elements not found.");
            displayError(outputId, 'Internal error: Form elements missing.');
            return;
        }

        const topic = topicEl.value;
        const style = styleEl.value;
        const language = langEl.value;

         if (!topic.trim()) {
            displayError(outputId, 'Please enter article content or topic.');
            return;
        }

        showLoading(outputId);
        generateTitlesButton.disabled = true;

         try {
            console.log("Fetching /api/generate-titles..."); // LOG: Before fetch
            const response = await fetch("/api/generate-titles", { // Ensure this matches backend route
                method: "POST",
                body: JSON.stringify({ topic, style, language }),
                headers: { 'Content-Type': 'application/json' },
            });
             console.log("Fetch response status:", response.status); // LOG: After fetch

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 console.error("Titles fetch error:", errorData); // Log fetch error
                 throw errorData;
            }

            const data = await response.json();
            if (data && Array.isArray(data.titles)) {
                const titleList = data.titles.map(title => `<li>${title}</li>`).join('');
                displayOutput(outputId, `<ul>${titleList}</ul>`, false); // Display raw HTML list (isMarkdown = false)
            } else {
                throw new Error('Received invalid title data from server.');
            }
        } catch (error) {
             console.error("Error in generateTitles catch block:", error); // Log catch block error
            displayError(outputId, error);
        } finally {
            if(generateTitlesButton) generateTitlesButton.disabled = false;
        }
    });
} else {
     console.error("generateTitlesButton not found, cannot attach listener."); // LOG: Titles button not found
}
console.log("Title Generator setup complete."); // LOG 13: Titles setup end


// --- Caption Generator Logic ---
console.log("Setting up Caption Generator..."); // LOG 14: Captions setup start
const generateCaptionButton = document.getElementById('generateCaptionButton');
if (generateCaptionButton) {
     console.log("Attaching click listener to generateCaptionButton."); // LOG 15: Captions button listener
     generateCaptionButton.addEventListener('click', async () => {
        console.log("generateCaptionButton clicked."); // LOG: Captions button click handler start
        const topicEl = document.getElementById('captionTopic');
        const platformEl = document.getElementById('captionPlatform');
        const toneEl = document.getElementById('captionTone');
        const langEl = document.getElementById('captionLang');
        const outputId = 'captionOutput';

        if(!topicEl || !platformEl || !toneEl || !langEl) {
            console.error("Caption form elements not found.");
            displayError(outputId, 'Internal error: Form elements missing.');
            return;
        }

        const topic = topicEl.value;
        const platform = platformEl.value;
        const tone = toneEl.value;
        const language = langEl.value;

        if (!topic.trim()) {
            displayError(outputId, 'Please enter a topic, info, or link.');
            return;
        }

        showLoading(outputId);
        generateCaptionButton.disabled = true;

        try {
             console.log("Fetching /api/generate-caption..."); // LOG: Before fetch
            const response = await fetch("/api/generate-caption", { // Ensure this matches backend route
                method: "POST",
                body: JSON.stringify({ topic, platform, tone, language }),
                headers: { 'Content-Type': 'application/json' },
            });
             console.log("Fetch response status:", response.status); // LOG: After fetch

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 console.error("Caption fetch error:", errorData); // Log fetch error
                 throw errorData;
            }

            const data = await response.json();
            if (data && data.caption) {
                let outputContent = data.caption;
                if (data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) {
                    // Ensure hashtags are displayed nicely below caption in Markdown
                    outputContent += `\n\n**Hashtags:**\n${data.hashtags.join(' ')}`;
                }
                displayOutput(outputId, outputContent, true); // Display as markdown
            } else {
                throw new Error('Received invalid caption data from server.');
            }
        } catch (error) {
            console.error("Error in generateCaption catch block:", error); // Log catch block error
            displayError(outputId, error);
        } finally {
            if(generateCaptionButton) generateCaptionButton.disabled = false;
        }
    });
} else {
    console.error("generateCaptionButton not found, cannot attach listener."); // LOG: Captions button not found
}
console.log("Caption Generator setup complete."); // LOG 16: Captions setup end
console.log("main.js script finished execution."); // LOG 17: Script end