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
    if (!chatOutput) return; // Check if element exists
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
    if (!userMessage || !sendChatButton) return;

    addMessageToChat('user', userMessage);
    chatInput.value = '';

    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
    thinkingIndicator.textContent = 'AI is thinking...';
    chatOutput.appendChild(thinkingIndicator);
    chatOutput.scrollTop = chatOutput.scrollHeight;
    sendChatButton.disabled = true;

    try {
        const response = await fetch("/api/direct-chat", {
            method: "POST",
            body: JSON.stringify({ message: userMessage }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (chatOutput.contains(thinkingIndicator)) chatOutput.removeChild(thinkingIndicator);

        if (!response.ok) {
            const errorData = await response.json().catch(async () => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
            throw errorData;
        }

        const data = await response.json();
        if (data && data.response) {
            addMessageToChat('ai', data.response, true);
        } else {
            throw new Error('Received an empty or invalid response from the server.');
        }

    } catch (error) {
        if (chatOutput.contains(thinkingIndicator)) {
             chatOutput.removeChild(thinkingIndicator);
        }
        console.error("Error in sendChatMessage:", error);
         addMessageToChat('ai', `Error: ${error.error || error.message || 'Could not get response.'}`);
    } finally {
         if (sendChatButton) sendChatButton.disabled = false;
    }
}

// Check if elements exist before adding listeners
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
const newsTopicInput = document.getElementById('newsTopic');
const newsToneSelect = document.getElementById('newsTone');
const newsLangSelect = document.getElementById('newsLang');

if (generateNewsButton && newsTopicInput && newsToneSelect && newsLangSelect) {
    generateNewsButton.addEventListener('click', async () => {
        const topic = newsTopicInput.value;
        const tone = newsToneSelect.value;
        const language = newsLangSelect.value;
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
                 const errorData = await response.json().catch(async () => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 throw errorData;
            }

            const data = await response.json();
            if (data && data.newsSnippet) {
                displayOutput(outputId, data.newsSnippet, true);
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
const titleTopicInput = document.getElementById('titleTopic');
const titleStyleSelect = document.getElementById('titleStyle');
const titleLangSelect = document.getElementById('titleLang');

if (generateTitlesButton && titleTopicInput && titleStyleSelect && titleLangSelect) {
    generateTitlesButton.addEventListener('click', async () => {
        const topic = titleTopicInput.value;
        const style = titleStyleSelect.value;
        const language = titleLangSelect.value;
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
                 const errorData = await response.json().catch(async () => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 throw errorData;
            }

            const data = await response.json();
            if (data && Array.isArray(data.titles)) {
                const titleList = data.titles.map(title => `<li>${title}</li>`).join('');
                // Use innerHTML directly since we are constructing HTML
                const outputElement = document.getElementById(outputId);
                 if (outputElement) {
                     hideLoading(outputId);
                     outputElement.innerHTML = `<ul>${titleList}</ul>`;
                 }
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
const captionTopicInput = document.getElementById('captionTopic');
const captionPlatformSelect = document.getElementById('captionPlatform');
const captionToneSelect = document.getElementById('captionTone');
const captionLangSelect = document.getElementById('captionLang');

if (generateCaptionButton && captionTopicInput && captionPlatformSelect && captionToneSelect && captionLangSelect) {
     generateCaptionButton.addEventListener('click', async () => {
        const topic = captionTopicInput.value;
        const platform = captionPlatformSelect.value;
        const tone = captionToneSelect.value;
        const language = captionLangSelect.value;
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
                 const errorData = await response.json().catch(async () => ({ error: `HTTP error ${response.status}`, details: await response.text() }));
                 throw errorData;
            }

            const data = await response.json();
            if (data && data.caption) {
                let outputContent = data.caption;
                if (data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) {
                    // Ensure hashtags are properly formatted and markdown bolded
                    outputContent += `\n\n**Hashtags:** ${data.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`;
                }
                displayOutput(outputId, outputContent, true);
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

// Log to confirm script execution finished without syntax errors
console.log("main.js script finished execution.");