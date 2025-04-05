document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing Hoodgen AI script.");

    // --- Common Elements & Setup ---
    const md = window.markdownit();

    // Helper functions (ensure they are defined before use)
    function showLoading(outputElementId) {
        const outputElement = document.getElementById(outputElementId);
        if (outputElement) {
            outputElement.innerHTML = '<span class="loading-text">Generating...</span>';
            outputElement.classList.add('loading');
            outputElement.classList.remove('error-text'); // Clear previous errors
        } else {
            console.error(`showLoading: Element with ID '${outputElementId}' not found.`);
        }
    }

    function hideLoading(outputElementId) {
        const outputElement = document.getElementById(outputElementId);
        if (outputElement) {
            outputElement.classList.remove('loading');
            const loadingText = outputElement.querySelector('.loading-text');
            if (loadingText) {
                outputElement.innerHTML = ''; // Clear only if loading text is present
            }
        } else {
             console.error(`hideLoading: Element with ID '${outputElementId}' not found.`);
        }
    }

    function displayOutput(outputElementId, content, isMarkdown = false) {
        const outputElement = document.getElementById(outputElementId);
        if (outputElement) {
            hideLoading(outputElementId);
            outputElement.classList.remove('error-text');
            if (isMarkdown) {
                // Render Markdown. Consider using a sanitizer in production.
                outputElement.innerHTML = md.render(content);
            } else {
                outputElement.textContent = content;
            }
        } else {
             console.error(`displayOutput: Element with ID '${outputElementId}' not found.`);
        }
    }

    function displayError(outputElementId, error) {
        const outputElement = document.getElementById(outputElementId);
        if (outputElement) {
            hideLoading(outputElementId);
            outputElement.classList.add('error-text'); // Add class for styling errors
            let errorMessage = 'An unknown error occurred.';
             try { // Prevent errors within the error handler
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error && error.message) {
                    errorMessage = error.message;
                } else if (error && error.error) {
                    errorMessage = `${error.error}${error.details ? ` (${error.details})` : ''}`;
                }
             } catch(e) { console.error("Error while formatting error message:", e); }

            console.error(`Error for ${outputElementId}:`, error);
            // Display formatted error message
            outputElement.innerHTML = `<span style="color: #dc3545;">⚠️ Error: ${errorMessage}</span>`;
        } else {
             console.error(`displayError: Element with ID '${outputElementId}' not found. Original error:`, error);
        }
    }

    async function handleApiCall(button, outputId, endpoint, payload) {
        if (!button || !document.getElementById(outputId)) return; // Basic validation

        showLoading(outputId);
        button.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                let errorData;
                 try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: `HTTP error ${response.status}`, details: await response.text().catch(() => 'Failed to read error text.') };
                 }
                throw errorData; // Throw structured error
            }
            return await response.json(); // Return successful data

        } catch (error) {
            displayError(outputId, error);
            return null; // Indicate failure
        } finally {
            // Ensure loading is hidden even if displayOutput/Error wasn't called
            hideLoading(outputId);
            button.disabled = false;
        }
    }


    // --- Tab Switching Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabButtons.length > 0 && tabPanes.length > 0) {
        console.log("Setting up tab switching logic.");
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                console.log(`Switching to tab: ${targetTab}`);

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
    } else {
        console.warn("Tab buttons or panes not found, skipping tab setup.");
    }


    // --- Direct Chat Logic ---
    const chatInput = document.getElementById('chatInput');
    const sendChatButton = document.getElementById('sendChatButton');
    const chatOutput = document.getElementById('chatOutput');

    function addMessageToChat(sender, message, isMarkdown = false) {
        if (!chatOutput) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        if (isMarkdown) {
            messageElement.innerHTML = md.render(message);
        } else {
            messageElement.appendChild(document.createTextNode(message));
        }

        chatOutput.appendChild(messageElement);
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
    }

    async function sendChatMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage || !sendChatButton || !chatOutput) return;

        addMessageToChat('user', userMessage);
        chatInput.value = '';
        chatInput.focus();

        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
        thinkingIndicator.textContent = 'AI is thinking...';
        chatOutput.appendChild(thinkingIndicator);
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
        sendChatButton.disabled = true;

        try {
            const data = await handleApiCall(sendChatButton, 'chatOutput', '/api/direct-chat', { message: userMessage });

             // Always remove indicator after API call attempt finishes in handleApiCall
             if (chatOutput.contains(thinkingIndicator)) {
                try { chatOutput.removeChild(thinkingIndicator); } catch(e) {}
             }

            if (data && data.response) {
                addMessageToChat('ai', data.response, true);
            } else if (data !== null) { // Handle case where API call succeeded but data format was wrong
                 throw new Error('Received an empty or invalid response field from the server.');
            }
            // If data is null, handleApiCall already displayed the error

        } catch (error) {
             // This catch is mainly for errors *outside* the handleApiCall fetch itself
             if (chatOutput.contains(thinkingIndicator)) {
                try { chatOutput.removeChild(thinkingIndicator); } catch(e) {}
             }
            console.error("Unhandled error in sendChatMessage:", error);
            addMessageToChat('ai', `Error: ${error.message || 'Could not get response.'}`);
        } finally {
             if (sendChatButton) sendChatButton.disabled = false; // Ensure re-enabled
        }
    }

    if (sendChatButton && chatInput && chatOutput) {
        sendChatButton.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        console.log("Direct Chat listeners attached.");
    } else {
        console.warn("Chat elements not found, skipping chat listener setup.");
    }

    // --- Short News Writer Logic ---
    const generateNewsButton = document.getElementById('generateNewsButton');
    const newsTopicInput = document.getElementById('newsTopic');
    const newsToneSelect = document.getElementById('newsTone');
    const newsLangSelect = document.getElementById('newsLang');

    if (generateNewsButton && newsTopicInput && newsToneSelect && newsLangSelect) {
        generateNewsButton.addEventListener('click', async () => {
            const payload = {
                topic: newsTopicInput.value.trim(),
                tone: newsToneSelect.value,
                language: newsLangSelect.value
            };
            const outputId = 'newsOutput';

            if (!payload.topic) {
                displayError(outputId, 'Please enter a topic, info, or link.');
                return;
            }

            const data = await handleApiCall(generateNewsButton, outputId, '/api/short-news', payload);

            if (data && data.newsSnippet) {
                displayOutput(outputId, data.newsSnippet, true);
            } else if (data !== null) {
                 displayError(outputId, 'Received invalid news data from server.');
            }
        });
        console.log("Short News listener attached.");
    } else {
        console.warn("Short News elements not found, skipping listener setup.");
    }

    // --- Title Generator Logic ---
    const generateTitlesButton = document.getElementById('generateTitlesButton');
    const titleTopicInput = document.getElementById('titleTopic');
    const titleStyleSelect = document.getElementById('titleStyle');
    const titleLangSelect = document.getElementById('titleLang');

    if (generateTitlesButton && titleTopicInput && titleStyleSelect && titleLangSelect) {
        generateTitlesButton.addEventListener('click', async () => {
            const payload = {
                topic: titleTopicInput.value.trim(),
                style: titleStyleSelect.value,
                language: titleLangSelect.value
            };
             const outputId = 'titlesOutput';

            if (!payload.topic) {
                displayError(outputId, 'Please enter article content or topic.');
                return;
            }

            const data = await handleApiCall(generateTitlesButton, outputId, '/api/generate-titles', payload);

            if (data && Array.isArray(data.titles)) {
                 const outputElement = document.getElementById(outputId);
                 if(outputElement) {
                     hideLoading(outputId); // Ensure loading is hidden
                     if (data.titles.length > 0) {
                         const titleList = data.titles.map(title => `<li>${title}</li>`).join('');
                         outputElement.innerHTML = `<ul>${titleList}</ul>`;
                     } else {
                         outputElement.innerHTML = '<span class="placeholder-text">No titles generated.</span>';
                     }
                 }
            } else if (data !== null) {
                displayError(outputId, 'Received invalid title data from server.');
            }
        });
        console.log("Title Generator listener attached.");
    } else {
         console.warn("Title Generator elements not found, skipping listener setup.");
    }

    // --- Caption Generator Logic ---
    const generateCaptionButton = document.getElementById('generateCaptionButton');
    const captionTopicInput = document.getElementById('captionTopic');
    const captionPlatformSelect = document.getElementById('captionPlatform');
    const captionToneSelect = document.getElementById('captionTone');
    const captionLangSelect = document.getElementById('captionLang');

    if (generateCaptionButton && captionTopicInput && captionPlatformSelect && captionToneSelect && captionLangSelect) {
        generateCaptionButton.addEventListener('click', async () => {
            const payload = {
                topic: captionTopicInput.value.trim(),
                platform: captionPlatformSelect.value,
                tone: captionToneSelect.value,
                language: captionLangSelect.value
            };
            const outputId = 'captionOutput';

             if (!payload.topic) {
                displayError(outputId, 'Please enter a topic, info, or link.');
                return;
            }

            const data = await handleApiCall(generateCaptionButton, outputId, '/api/generate-caption', payload);

            if (data && data.caption) {
                let outputContent = data.caption;
                if (data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) {
                    outputContent += `\n\n**Hashtags:** ${data.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`;
                }
                displayOutput(outputId, outputContent, true);
            } else if (data !== null) {
                displayError(outputId, 'Received invalid caption data from server.');
            }
        });
         console.log("Caption Generator listener attached.");
    } else {
        console.warn("Caption Generator elements not found, skipping listener setup.");
    }

     // --- Auto-resize textareas ---
     document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto'; // Reset height
            textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
        });
         // Initial resize on load
         textarea.style.height = 'auto';
         textarea.style.height = `${textarea.scrollHeight}px`;
     });

    console.log("Hoodgen AI main script setup complete.");

}); // End DOMContentLoaded listener