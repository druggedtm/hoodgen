// --- Common Elements & Setup ---
const md = window.markdownit(); // Markdown renderer

function showLoading(outputElementId) {
    const outputElement = document.getElementById(outputElementId);
    if (outputElement) {
        outputElement.innerHTML = 'Generating...';
        outputElement.classList.add('loading');
    }
}

function hideLoading(outputElementId) {
     const outputElement = document.getElementById(outputElementId);
     if (outputElement) {
        outputElement.classList.remove('loading');
        // Clear the loading text if it's still there
        if (outputElement.innerHTML === 'Generating...') {
            outputElement.innerHTML = '';
        }
    }
}

function displayOutput(outputElementId, content, isMarkdown = false) {
     const outputElement = document.getElementById(outputElementId);
     if (outputElement) {
        hideLoading(outputElementId); // Ensure loading is hidden
        if (isMarkdown) {
            outputElement.innerHTML = md.render(content);
        } else {
            // Use textContent for plain text to prevent HTML injection
            outputElement.textContent = content;
        }
     }
}

function displayError(outputElementId, error) {
    const outputElement = document.getElementById(outputElementId);
     if (outputElement) {
        hideLoading(outputElementId);
        let errorMessage = 'An unknown error occurred.';
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && error.message) {
            errorMessage = error.message;
        } else if (error && error.error) {
            // Handle errors returned from our backend like { error: "...", details: "..." }
             errorMessage = `${error.error}${error.details ? ` (${error.details})` : ''}`;
        }
        console.error(`Error for ${outputElementId}:`, error); // Log full error
        outputElement.innerHTML = `<span style="color: red;">Error: ${errorMessage}</span>`;
     }
}

// --- Tab Switching Logic ---
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        // Update button active state
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update pane active state
        tabPanes.forEach(pane => {
            if (pane.id === targetTab) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    });
});


// --- Direct Chat Logic ---
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');
const chatOutput = document.getElementById('chatOutput');

function addMessageToChat(sender, message, isMarkdown = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    if (isMarkdown) {
        messageElement.innerHTML = md.render(message);
    } else {
        messageElement.appendChild(document.createTextNode(message));
    }

    chatOutput.appendChild(messageElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;
}

async function sendChatMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    addMessageToChat('user', userMessage);
    chatInput.value = '';

    // Use a specific thinking indicator for chat
    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
    thinkingIndicator.textContent = 'AI is thinking...';
    chatOutput.appendChild(thinkingIndicator);
    chatOutput.scrollTop = chatOutput.scrollHeight;
    sendChatButton.disabled = true; // Disable button while waiting

    try {
        const response = await fetch("/api/direct-chat", {
            method: "POST",
            body: JSON.stringify({ message: userMessage }),
            headers: { 'Content-Type': 'application/json' },
        });

        chatOutput.removeChild(thinkingIndicator); // Remove indicator regardless of success/error

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
            throw errorData; // Throw structured error or fallback
        }

        const data = await response.json();
        if (data && data.response) {
            addMessageToChat('ai', data.response, true);
        } else {
            throw new Error('Received an empty or invalid response from the server.');
        }

    } catch (error) {
        if (chatOutput.contains(thinkingIndicator)) { // Ensure removal if error happened quickly
             chatOutput.removeChild(thinkingIndicator);
        }
        console.error("Error in sendChatMessage:", error);
         addMessageToChat('ai', `Error: ${error.error || error.message || 'Could not get response.'}`);
    } finally {
         sendChatButton.disabled = false; // Re-enable button
    }
}

if (sendChatButton) {
    sendChatButton.addEventListener('click', sendChatMessage);
}
if (chatInput) {
    chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

// --- Short News Writer Logic ---
const generateNewsButton = document.getElementById('generateNewsButton');
if (generateNewsButton) {
    generateNewsButton.addEventListener('click', async () => {
        const topic = document.getElementById('newsTopic').value;
        const tone = document.getElementById('newsTone').value;
        const language = document.getElementById('newsLang').value;
        const outputId = 'newsOutput';

        if (!topic.trim()) {
            displayError(outputId, 'Please enter a topic, info, or link.');
            return;
        }

        showLoading(outputId);
        generateNewsButton.disabled = true;

        try {
            const response = await fetch("/api/short-news", {
                method: "POST",
                body: JSON.stringify({ topic, tone, language }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 throw errorData;
            }

            const data = await response.json();
            if (data && data.newsSnippet) {
                displayOutput(outputId, data.newsSnippet, true); // Display as markdown
            } else {
                throw new Error('Received invalid news data from server.');
            }
        } catch (error) {
            displayError(outputId, error);
        } finally {
            generateNewsButton.disabled = false;
        }
    });
}

// --- Title Generator Logic ---
const generateTitlesButton = document.getElementById('generateTitlesButton');
if (generateTitlesButton) {
    generateTitlesButton.addEventListener('click', async () => {
        const topic = document.getElementById('titleTopic').value;
        const style = document.getElementById('titleStyle').value;
        const language = document.getElementById('titleLang').value;
        const outputId = 'titlesOutput';

         if (!topic.trim()) {
            displayError(outputId, 'Please enter article content or topic.');
            return;
        }

        showLoading(outputId);
        generateTitlesButton.disabled = true;

         try {
            const response = await fetch("/api/generate-titles", {
                method: "POST",
                body: JSON.stringify({ topic, style, language }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 throw errorData;
            }

            const data = await response.json();
            // Expect { titles: ["...", "..."] }
            if (data && Array.isArray(data.titles)) {
                 // Format as an unordered list
                const titleList = data.titles.map(title => `<li>${title}</li>`).join('');
                displayOutput(outputId, `<ul>${titleList}</ul>`, true); // Display as raw HTML list
            } else {
                throw new Error('Received invalid title data from server.');
            }
        } catch (error) {
            displayError(outputId, error);
        } finally {
            generateTitlesButton.disabled = false;
        }
    });
}

// --- Caption Generator Logic ---
const generateCaptionButton = document.getElementById('generateCaptionButton');
if (generateCaptionButton) {
     generateCaptionButton.addEventListener('click', async () => {
        const topic = document.getElementById('captionTopic').value;
        const platform = document.getElementById('captionPlatform').value;
        const tone = document.getElementById('captionTone').value;
        const language = document.getElementById('captionLang').value;
        const outputId = 'captionOutput';

        if (!topic.trim()) {
            displayError(outputId, 'Please enter a topic, info, or link.');
            return;
        }

        showLoading(outputId);
        generateCaptionButton.disabled = true;

        try {
            const response = await fetch("/api/generate-caption", {
                method: "POST",
                body: JSON.stringify({ topic, platform, tone, language }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 throw errorData;
            }

            const data = await response.json();
             // Expect { caption: "...", hashtags: [...] } or just { caption: "..." }
            if (data && data.caption) {
                let outputContent = data.caption;
                if (data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) {
                    outputContent += `\n\n**Hashtags:** ${data.hashtags.join(' ')}`;
                }
                displayOutput(outputId, outputContent, true); // Display as markdown
            } else {
                throw new Error('Received invalid caption data from server.');
            }
        } catch (error) {
            displayError(outputId, error);
        } finally {
            generateCaptionButton.disabled = false;
        }
    });
}