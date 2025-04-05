document.addEventListener('DOMContentLoaded', () => {
    console.log("Hoodgen AI SPA Initializing - v2");

    // --- Globals & Setup ---
    const md = window.markdownit({ html: false, breaks: true, linkify: true });
    const toolNavButtons = document.querySelectorAll('.tool-nav-button');
    const toolPanes = document.querySelectorAll('.tool-pane');
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const header = document.querySelector('.main-header');

    // --- Helper Functions ---
    function showLoading(outputElement, buttonElement) {
        if (outputElement) {
            outputElement.innerHTML = '<span class="loading-text">🧠 Thinking...</span>';
            outputElement.classList.add('loading');
            outputElement.classList.remove('error-text');
        }
        if (buttonElement) buttonElement.disabled = true;
    }

    function hideLoading(outputElement, buttonElement) {
        if (outputElement) outputElement.classList.remove('loading');
        if (buttonElement) buttonElement.disabled = false;
        // Clear placeholder/loading text only if it exists
        const placeholder = outputElement?.querySelector('.output-placeholder, .loading-text');
        if (placeholder) placeholder.remove();
    }

    function displayOutput(outputElement, content, isMarkdown = false) {
        if (!outputElement) return;
        outputElement.classList.remove('error-text', 'loading');
        outputElement.innerHTML = isMarkdown ? md.render(content) : '';
        if (!isMarkdown) outputElement.textContent = content;
    }

     function displayError(outputElement, error) {
         if (!outputElement) return;
         outputElement.classList.add('error-text');
         outputElement.classList.remove('loading');
         let errorMessage = 'An unknown error occurred.';
         try {
             if (typeof error === 'string') errorMessage = error;
             else if (error?.message) errorMessage = error.message;
             else if (error?.error) errorMessage = `${error.error}${error.details ? `: ${error.details}` : ''}`;
             else errorMessage = JSON.stringify(error);
         } catch(e) { console.error("Error formatting error:", e); }
         console.error(`Output Error in ${outputElement.id}:`, error);
         outputElement.innerHTML = `<span style="color: var(--error-color); font-weight: 500;">⚠️ Error: ${errorMessage}</span>`;
     }

    async function handleApiCall(buttonElement, outputElement, endpoint, payload) {
        if (!buttonElement || !outputElement) return null;
        showLoading(outputElement, buttonElement);
        try {
            const response = await fetch(endpoint, { method: "POST", body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) {
                 let errorData = { error: `HTTP error ${response.status}` };
                 try { errorData = { ...errorData, ...(await response.json()) }; }
                 catch (e) { errorData.details = await response.text().catch(() => 'Failed to read error text.'); }
                 throw errorData;
            }
            const data = await response.json();
            hideLoading(outputElement, buttonElement); // Hide loading on success before displaying
            return data;
        } catch (error) {
            displayError(outputElement, error); // Display error handles hiding loading
            if (buttonElement) buttonElement.disabled = false; // Ensure button is re-enabled on catch
            return null;
        }
    }

    // --- Intersection Observer for Animations ---
    if ("IntersectionObserver" in window && animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // observer.unobserve(entry.target); // Optional: remove observer after first animation
                } else {
                    // Optional: Remove class if you want animation to re-trigger on scroll up
                    // entry.target.classList.remove('is-visible');
                }
            });
        }, { threshold: 0.1 });
        animatedElements.forEach(el => observer.observe(el));
        console.log("Intersection Observer initialized for scroll animations.");
    } else {
        // Fallback for older browsers: just make elements visible
        animatedElements.forEach(el => el.classList.add('is-visible'));
    }

    // --- Sticky Header Shadow ---
    if (header) {
        const handleScroll = () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
        console.log("Sticky header observer attached.");
    }

    // --- Smooth Scrolling for Nav Links ---
     document.querySelectorAll('.main-nav a[href^="#"], .logo[href^="#"], .cta-button[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                console.log(`Smooth scrolling to ${targetId}`);
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.warn(`Smooth scroll target not found: ${targetId}`);
            }
        });
    });
     console.log("Smooth scroll listeners attached.");


    // --- Tool Switching Logic ---
    if (toolNavButtons.length > 0 && toolPanes.length > 0) {
        toolNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetToolId = `tool-${button.getAttribute('data-tool')}`;
                console.log(`Switching to tool pane: ${targetToolId}`);

                toolNavButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                toolPanes.forEach(pane => {
                    pane.classList.toggle('active', pane.id === targetToolId);
                });
                 // Scroll to the tools section smoothly after tab switch
                 const toolsSection = document.getElementById('tools');
                 if(toolsSection) {
                     // Timeout allows pane animation to start before scrolling
                    // setTimeout(() => {
                    //     toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // }, 100);
                 }
            });
        });
         console.log("Tool switching listeners attached.");
    }

    // --- Auto-resize Textareas ---
    document.querySelectorAll('textarea').forEach(textarea => {
        const initialHeight = textarea.scrollHeight;
        const maxHeight = parseInt(window.getComputedStyle(textarea).maxHeight, 10) || Infinity;
        const updateTextareaHeight = () => {
            textarea.style.height = 'auto'; // Temporarily shrink
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        };
        textarea.addEventListener('input', updateTextareaHeight);
        textarea.addEventListener('focus', updateTextareaHeight); // Also resize on focus
        // Initial set (use timeout to ensure layout is stable)
        setTimeout(updateTextareaHeight, 0);
    });
    console.log("Textarea auto-resize listeners attached.");

    // === TOOL SPECIFIC LOGIC ===

    // --- Direct Chat ---
    const chatInput = document.getElementById('chatInput');
    const sendChatButton = document.getElementById('sendChatButton');
    const chatOutput = document.getElementById('chatOutput');

    function addMessageToChat(sender, message, isMarkdown = false) {
        if (!chatOutput) return;
        const placeholder = chatOutput.querySelector('.chat-placeholder');
        if (placeholder) placeholder.remove();
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.innerHTML = isMarkdown ? md.render(message) : '';
        if(!isMarkdown) messageElement.appendChild(document.createTextNode(message));
        chatOutput.appendChild(messageElement);
        // Scroll only if user isn't scrolled up significantly
        const isScrolledToBottom = chatOutput.scrollHeight - chatOutput.clientHeight <= chatOutput.scrollTop + 50; // 50px buffer
        if (isScrolledToBottom) {
            chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
        }
    }

    async function sendChatMessage() {
        const userMessage = chatInput?.value.trim();
        if (!userMessage || !sendChatButton || !chatOutput) return;
        addMessageToChat('user', userMessage);
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset height
        chatInput.focus();
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.classList.add('message', 'ai-message', 'thinking');
        thinkingIndicator.textContent = 'AI is thinking...';
        chatOutput.appendChild(thinkingIndicator);
        chatOutput.scrollTo({ top: chatOutput.scrollHeight, behavior: 'smooth' });
        sendChatButton.disabled = true;

        const data = await handleApiCall(sendChatButton, chatOutput, '/api/direct-chat', { message: userMessage });

        if (chatOutput.contains(thinkingIndicator)) try { chatOutput.removeChild(thinkingIndicator); } catch(e){}

        if (data?.response) addMessageToChat('ai', data.response, true);
        // Error handled by handleApiCall, but might need specific chat error display if needed
        else if (data !== null) addMessageToChat('ai', 'Error: Received invalid response format.');
    }

    if (sendChatButton && chatInput && chatOutput) {
        sendChatButton.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
        console.log("Direct Chat listeners attached.");
    }

    // --- Short News ---
    const generateNewsButton = document.getElementById('generateNewsButton');
    const newsOutput = document.getElementById('newsOutput');
    if (generateNewsButton && newsOutput) {
        generateNewsButton.addEventListener('click', async () => {
            const payload = {
                topic: document.getElementById('newsTopic')?.value.trim(),
                tone: document.getElementById('newsTone')?.value,
                language: document.getElementById('newsLang')?.value
            };
            if (!payload.topic) return displayError(newsOutput, 'Topic/Info is required.');
            const data = await handleApiCall(generateNewsButton, newsOutput, '/api/short-news', payload);
            if (data?.newsSnippet) displayOutput(newsOutput, data.newsSnippet, true);
            else if (data !== null) displayError(newsOutput, 'Received invalid news data.');
        });
        console.log("Short News listener attached.");
    }

    // --- Title Generator ---
    const generateTitlesButton = document.getElementById('generateTitlesButton');
    const titlesOutput = document.getElementById('titlesOutput');
    if (generateTitlesButton && titlesOutput) {
        generateTitlesButton.addEventListener('click', async () => {
            const payload = {
                topic: document.getElementById('titleTopic')?.value.trim(),
                style: document.getElementById('titleStyle')?.value,
                language: document.getElementById('titleLang')?.value
            };
             if (!payload.topic) return displayError(titlesOutput, 'Content/Topic is required.');
            const data = await handleApiCall(generateTitlesButton, titlesOutput, '/api/generate-titles', payload);
            if (data && Array.isArray(data.titles)) {
                hideLoading(titlesOutput, generateTitlesButton); // Explicit hide before potentially setting empty state
                if (data.titles.length > 0) {
                     const titleList = data.titles.map(title => `<li>${md.renderInline(title)}</li>`).join(''); // Render titles as markdown inline
                     titlesOutput.innerHTML = `<ul class="generated-list">${titleList}</ul>`;
                } else titlesOutput.innerHTML = '<span class="output-placeholder">No titles generated.</span>';
            } else if (data !== null) displayError(titlesOutput, 'Received invalid title data.');
        });
        console.log("Title Generator listener attached.");
    }

    // --- Caption Generator ---
    const generateCaptionButton = document.getElementById('generateCaptionButton');
    const captionOutput = document.getElementById('captionOutput');
    if (generateCaptionButton && captionOutput) {
        generateCaptionButton.addEventListener('click', async () => {
            const payload = {
                topic: document.getElementById('captionTopic')?.value.trim(),
                platform: document.getElementById('captionPlatform')?.value,
                tone: document.getElementById('captionTone')?.value,
                language: document.getElementById('captionLang')?.value
            };
             if (!payload.topic) return displayError(captionOutput, 'Topic/Info is required.');
            const data = await handleApiCall(generateCaptionButton, captionOutput, '/api/generate-caption', payload);
            if (data?.caption) {
                 let outputContent = data.caption;
                 if (data.hashtags?.length > 0) {
                     outputContent += `\n\n**Hashtags:** ${data.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}`;
                 }
                 displayOutput(captionOutput, outputContent, true);
             } else if (data !== null) displayError(captionOutput, 'Received invalid caption data.');
        });
        console.log("Caption Generator listener attached.");
    }

    console.log("Hoodgen AI SPA Initialization Complete.");

}); // End DOMContentLoaded