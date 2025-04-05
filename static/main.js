document.addEventListener('DOMContentLoaded', () => {
    console.log("Hoodgen AI SPA Initializing...");

    // --- Globals & Setup ---
    const md = window.markdownit({ html: false, breaks: true, linkify: true }); // Initialize Markdown-it; disable raw HTML for safety
    const toolNavButtons = document.querySelectorAll('.tool-nav-button');
    const toolPanes = document.querySelectorAll('.tool-pane');

    // Intersection Observer for animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Stop observing after animation
                // observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% is visible
    });
    animatedElements.forEach(el => observer.observe(el));


    // --- Helper Functions ---
    function showLoading(outputElement, buttonElement) {
        if (outputElement) {
            outputElement.innerHTML = '<span class="loading-text">🧠 Generating... Please wait...</span>';
            outputElement.classList.add('loading');
            outputElement.classList.remove('error-text');
        }
        if (buttonElement) buttonElement.disabled = true;
    }

    function hideLoading(outputElement, buttonElement) {
        if (outputElement) {
            outputElement.classList.remove('loading');
            const loadingText = outputElement.querySelector('.loading-text');
            // Clear placeholder/loading only if it exists, otherwise keep results
            if (loadingText || outputElement.querySelector('.output-placeholder')) {
                 outputElement.innerHTML = '';
            }
        }
         if (buttonElement) buttonElement.disabled = false;
    }

    function displayOutput(outputElement, content, isMarkdown = false) {
        if (outputElement) {
            outputElement.classList.remove('error-text');
            outputElement.classList.remove('loading'); // Ensure loading class is removed
             outputElement.innerHTML = ''; // Clear previous content/placeholders

            if (isMarkdown) {
                // Consider adding DOMPurify for sanitization in production
                outputElement.innerHTML = md.render(content);
            } else {
                outputElement.textContent = content;
            }
        }
    }

     function displayError(outputElement, error) {
         if (outputElement) {
             outputElement.classList.add('error-text');
             outputElement.classList.remove('loading'); // Ensure loading class is removed
             let errorMessage = 'An unknown error occurred.';
             try {
                 if (typeof error === 'string') errorMessage = error;
                 else if (error?.message) errorMessage = error.message;
                 else if (error?.error) errorMessage = `${error.error}${error.details ? `: ${error.details}` : ''}`;
                 else errorMessage = JSON.stringify(error); // Fallback
             } catch(e) { console.error("Error formatting error:", e); }

             console.error(`Output Error in element ${outputElement.id}:`, error);
             outputElement.innerHTML = `<span style="color: var(--error-color); font-weight: 500;">⚠️ Error: ${errorMessage}</span>`;
         }
     }

    async function handleApiCall(buttonElement, outputElement, endpoint, payload) {
        if (!buttonElement || !outputElement) return null;

        showLoading(outputElement, buttonElement);

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                let errorData = { error: `HTTP error ${response.status}` }; // Default error
                 try {
                    const parsedError = await response.json();
                    errorData = { ...errorData, ...parsedError }; // Merge JSON error details
                 } catch (e) {
                    errorData.details = await response.text().catch(() => 'Failed to read error text.'); // Fallback to text
                 }
                throw errorData;
            }
            return await response.json();

        } catch (error) {
            displayError(outputElement, error);
            return null;
        } finally {
            // Re-enable button, loading state handled by displayOutput/displayError
             if (buttonElement) buttonElement.disabled = false;
        }
    }


    // --- Tool Switching Logic ---
    if (toolNavButtons.length > 0 && toolPanes.length > 0) {
        toolNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTool = button.getAttribute('data-tool');
                console.log(`Switching to tool: ${targetTool}`);

                toolNavButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                toolPanes.forEach(pane => {
                    pane.classList.toggle('active', pane.id === `tool-${targetTool}`);
                });
            });
        });
         console.log("Tool switching listeners attached.");
    }


    // --- Direct Chat Logic ---
    const chatInput = document.getElementById('chatInput');
    const sendChatButton = document.getElementById('sendChatButton');
    const chatOutput = document.getElementById('chatOutput');

    function addMessageToChat(sender, message, isMarkdown = false) {
        if (!chatOutput) return;
         // Clear placeholder on first message
         const placeholder = chatOutput.querySelector('.chat-placeholder');
         if (placeholder) placeholder.remove();

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.innerHTML = isMarkdown ? md.render(message) : '';
        if(!isMarkdown) messageElement.appendChild(document.createTextNode(message)); // Safer for user input

        chatOutput.appendChild(messageElement);
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
    }

    async function sendChatMessage() {
        const userMessage = chatInput?.value.trim();
        if (!userMessage || !sendChatButton || !chatOutput) return;

        addMessageToChat('user', userMessage);
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset height after sending
        chatInput.focus();

        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
        thinkingIndicator.textContent = 'AI is thinking...';
        chatOutput.appendChild(thinkingIndicator);
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
        sendChatButton.disabled = true;

        try {
            const data = await handleApiCall(sendChatButton, chatOutput, '/api/direct-chat', { message: userMessage });

             if (chatOutput.contains(thinkingIndicator)) {
                try { chatOutput.removeChild(thinkingIndicator); } catch(e) {}
             }

            if (data && data.response) {
                addMessageToChat('ai', data.response, true);
            } else if (data !== null) { // API call succeeded but response format issue
                 displayError(chatOutput, 'Received invalid response from server.'); // Display error in chat
            }
             // If data is null, handleApiCall already displayed the error in the output element (which is chatOutput here)
        } catch (error) {
             if (chatOutput.contains(thinkingIndicator)) {
                 try { chatOutput.removeChild(thinkingIndicator); } catch(e) {}
             }
            console.error("Unhandled error in sendChatMessage:", error);
             // Display error in chat area
            addMessageToChat('ai', `Error: ${error.message || 'Could not get response.'}`);
        } finally {
             if (sendChatButton) sendChatButton.disabled = false;
        }
    }

    if (sendChatButton && chatInput && chatOutput) {
        sendChatButton.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
        // Auto-resize chat textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`; // Use max-height from CSS
        });
         console.log("Chat listeners attached.");
    }

    // --- Short News Writer Logic ---
    const generateNewsButton = document.getElementById('generateNewsButton');
    const newsTopicInput = document.getElementById('newsTopic');
    const newsToneSelect = document.getElementById('newsTone');
    const newsLangSelect = document.getElementById('newsLang');
    const newsOutput = document.getElementById('newsOutput');

    if (generateNewsButton && newsTopicInput && newsToneSelect && newsLangSelect && newsOutput) {
        generateNewsButton.addEventListener('click', async () => {
            const payload = { topic: newsTopicInput.value.trim(), tone: newsToneSelect.value, language: newsLangSelect.value };
            if (!payload.topic) return displayError(newsOutput, 'Please enter a topic, info, or link.');

            const data = await handleApiCall(generateNewsButton, newsOutput, '/api/short-news', payload);
            if (data?.newsSnippet) displayOutput(newsOutput, data.newsSnippet, true);
            else if (data !== null) displayError(newsOutput, 'Received invalid news data.');
        });
         console.log("Short News listener attached.");
    }

    // --- Title Generator Logic ---
    const generateTitlesButton = document.getElementById('generateTitlesButton');
    const titleTopicInput = document.getElementById('titleTopic');
    const titleStyleSelect = document.getElementById('titleStyle');
    const titleLangSelect = document.getElementById('titleLang');
    const titlesOutput = document.getElementById('titlesOutput');

    if (generateTitlesButton && titleTopicInput && titleStyleSelect && titleLangSelect && titlesOutput) {
        generateTitlesButton.addEventListener('click', async () => {
            const payload = { topic: titleTopicInput.value.trim(), style: titleStyleSelect.value, language: titleLangSelect.value };
            if (!payload.topic) return displayError(titlesOutput, 'Please enter article content or topic.');

            const data = await handleApiCall(generateTitlesButton, titlesOutput, '/api/generate-titles', payload);
            if (data && Array.isArray(data.titles)) {
                hideLoading(titlesOutput, generateTitlesButton); // Explicit hide needed before potentially setting empty state
                if (data.titles.length > 0) {
                    const titleList = data.titles.map(title => `<li>${title}</li>`).join('');
                    titlesOutput.innerHTML = `<ul>${titleList}</ul>`; // Use innerHTML for list
                } else {
                    titlesOutput.innerHTML = '<span class="output-placeholder">No titles generated. Try refining your topic.</span>';
                }
            } else if (data !== null) {
                 displayError(titlesOutput, 'Received invalid title data.');
            }
        });
        console.log("Title Generator listener attached.");
    }

    // --- Caption Generator Logic ---
    const generateCaptionButton = document.getElementById('generateCaptionButton');
    const captionTopicInput = document.getElementById('captionTopic');
    const captionPlatformSelect = document.getElementById('captionPlatform');
    const captionToneSelect = document.getElementById('captionTone');
    const captionLangSelect = document.getElementById('captionLang');
    const captionOutput = document.getElementById('captionOutput');

    if (generateCaptionButton && captionTopicInput && captionPlatformSelect && captionToneSelect && captionLangSelect && captionOutput) {
        generateCaptionButton.addEventListener('click', async () => {
            const payload = { topic: captionTopicInput.value.trim(), platform: captionPlatformSelect.value, tone: captionToneSelect.value, language: captionLangSelect.value };
             if (!payload.topic) return displayError(captionOutput, 'Please enter a topic, info, or link.');

            const data = await handleApiCall(generateCaptionButton, captionOutput, '/api/generate-caption', payload);
            if (data?.caption) {
                let outputContent = data.caption;
                if (data.hashtags?.length > 0) {
                     outputContent += `\n\n**Hashtags:** ${data.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`;
                }
                displayOutput(captionOutput, outputContent, true);
            } else if (data !== null) {
                 displayError(captionOutput, 'Received invalid caption data.');
            }
        });
        console.log("Caption Generator listener attached.");
    }

    // --- Smooth Scrolling for Nav Links ---
     document.querySelectorAll('.main-nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Sticky Header Shadow ---
    const header = document.querySelector('.main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        });
    }

    console.log("Hoodgen AI SPA Initialization Complete.");
}); // End DOMContentLoaded