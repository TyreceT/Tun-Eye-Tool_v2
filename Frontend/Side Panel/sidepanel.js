// sidepanel.js

// =================================================================================
// GLOBAL VARIABLES & CONFIGURATION
// =================================================================================

/**
 * Global variables to hold Chart instances.
 * This prevents re-rendering issues by allowing us to destroy old charts before creating new ones.
 */
let confidenceChart = null;
let keywordChart = null;


// =================================================================================
// INITIALIZATION
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ELEMENT REFERENCES ---
    const mainContainer = document.getElementById('main-container');
    const loadingContainer = document.getElementById('loading-container');
    const logo = document.getElementById('logo');
    const logoTitle = document.getElementById('logo-title');
    const logoText = document.getElementById('logo-text');
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav-button, .back-icon-btn');
    const selectContentBtn = document.getElementById('select-content-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const contentDisplay = document.getElementById('content-display');
    const resultContent = document.getElementById('result-content');
    const body = document.body;
    const navLinks = document.querySelectorAll('.navigation .list a');
    const WORD_THRESHOLD = 1e-6; // anything between -1e-6 and +1e-6 is neutral



    // --- 2. CORE FUNCTIONS ---

    /**
     * Hides all pages and shows the one with the specified ID.
     * @param {string} pageId - The ID of the page to navigate to.
     */
    function navigateTo(pageId) {
        pages.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            updateNavIndicator(targetPage);
        }
    }

    /**
     * Updates the bottom navigation indicator to reflect the active page.
     * @param {HTMLElement} activePage - The currently visible page element.
     */
    function updateNavIndicator(activePage) {
        const pageId = activePage.id;
        let activeIndex = 0;
        if (pageId === 'page-select') activeIndex = 1;
        if (pageId === 'page-preview') activeIndex = 2;
        if (pageId === 'page-result') activeIndex = 3;

        document.querySelectorAll('.navigation').forEach(nav => {
            const listItems = nav.querySelectorAll('.list');
            listItems.forEach(item => item.classList.remove('active'));
            if (activeIndex > 0 && listItems.length >= activeIndex) {
                listItems[activeIndex - 1].classList.add('active');
            }
        });
    }

    /**
     * Displays the selected text or image in the preview container.
     * @param {object} content - The content object from storage {type: 'text'|'image', data: '...'}.
     */
    function displayContentForPreview(content) {
        contentDisplay.innerHTML = '';
        if (content.type === 'text') {
            const textBlock = document.createElement('blockquote');
            textBlock.textContent = content.data;
            contentDisplay.appendChild(textBlock);
        } else if (content.type === 'image') {
            const imageWrapper = document.createElement('div');
            imageWrapper.classList.add('preview-image-wrapper');
            const img = document.createElement('img');
            img.src = content.data;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '4px';
            imageWrapper.appendChild(img);
            contentDisplay.appendChild(imageWrapper);
        }
    }

    /**
     * Renders the analysis result charts using Chart.js.
     * @param {object} data - The formatted data for rendering charts.
     */
    function renderResultCharts(data) {
        if (confidenceChart) confidenceChart.destroy();
        if (keywordChart) keywordChart.destroy();

        // Compare using raw decimal values for accuracy
        const rawReal = data.confidence.real / 100; // convert back to 0-1
        const rawFake = data.confidence.fake / 100;
        const statusClass = rawReal >= rawFake ? 'real-news' : 'fake-news';
        // Output
        const statusText = statusClass === 'real-news' ? 'REAL NEWS' : 'FAKE NEWS';
        const statusIcon = statusClass === 'real-news' ? 'fa-check-circle' : 'fa-times-circle';

        resultContent.innerHTML = `
            <div class="status-indicator ${statusClass}">
                <i class="fa-solid ${statusIcon}"></i> ${statusText}
            </div>
            <p class="result-summary">This news looks ${statusClass === 'real-news' ? 'trustworthy' : 'suspicious'}! See the chart below for confidence and word-level analysis.</p>
            <div class="chart-container" style="height:200px;">
                <canvas id="confidenceChartCanvas"></canvas>
            </div>
            <div class="keyword-chart-container" style="height:250px; margin-top:20px;">
                <canvas id="keywordChartCanvas"></canvas>
            </div>
        `;

        // Confidence Doughnut Chart
        const confidenceCtx = document.getElementById('confidenceChartCanvas').getContext('2d');
        confidenceChart = new Chart(confidenceCtx, {
            type: 'doughnut',
            data: {
                labels: ['Fake', 'Neutral', 'Real'], 
                datasets: [{
                    data: [data.confidence.fake, data.confidence.neutral, data.confidence.real],
                    backgroundColor: ['#c0392b', '#f39c12', '#27ae60'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Overall Confidence',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.parsed + "%"
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Add tooltip to the title element only
        const confidenceCanvas = document.getElementById('confidenceChartCanvas');
        confidenceCanvas.addEventListener('mousemove', (event) => {
            const rect = confidenceCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Check if mouse is over the title area (approximate top 40 pixels)
            if (y < 40) {
                confidenceCanvas.title = "Overall confidence shows how much Tun-Eye believes\nthe news is real or fake based on content analysis.";
            } else {
                confidenceCanvas.title = "";
            }
        });


        // Dynamic Scaling for Keyword Chart
        const scores = data.keywords.map(k => k.score);
        const maxAbsScore = Math.max(...scores.map(s => Math.abs(s)));
        let chartMax;

        if (maxAbsScore > 0.1) {
            chartMax = 1.0;
        } else {
            const magnitude = Math.pow(10, Math.floor(Math.log10(maxAbsScore)));
            chartMax = Math.ceil(maxAbsScore / magnitude) * magnitude;
        }

        if (chartMax === 0) {
            chartMax = 0.01; // Ensure a small visible range if all scores are zero
        }

        const keywordsWithRaw = data.keywords.map(item => ({
            word: item.word,
            score: item.score,    // normalized
            raw: parseFloat(item.weight) // keep raw
        }));

        // Keyword Bar Chart
        const keywordCtx = document.getElementById('keywordChartCanvas').getContext('2d');
        keywordChart = new Chart(keywordCtx, {
            type: 'bar',
            data: {
                labels: keywordsWithRaw.map(k => k.word),
                datasets: [{
                    data: keywordsWithRaw.map(k => k.score),
                    backgroundColor: keywordsWithRaw.map(k => {
                        const score = Number(k.score) || 0;
                        if (score > WORD_THRESHOLD) return '#27ae60';
                        if (score < -WORD_THRESHOLD) return '#c0392b';
                        return '#f39c12';
                    })
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Word-Level Analysis'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const k = keywordsWithRaw[context.dataIndex];
                                const normalized = (k.score * 100).toFixed(2);
                                const raw = k.raw.toFixed(4);
                                return `${normalized}% (raw: ${raw})`;
                            }
                        }
                    }
                },
                scales: {
                    x: { min: -1, max: 1 },
                    y: { grid: { display: false } }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Add tooltip to the title element only
        const canvas = document.getElementById('keywordChartCanvas');
        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Check if mouse is over the title area (approximate top 40 pixels)
            if (y < 40) {
                canvas.title = "Word-level analysis shows how individual words contribute\nto the real/fake confidence score.";
            } else {
                canvas.title = "";
            }
        });
    }


    // --- 3. EVENT LISTENERS ---

    // Generic navigation buttons (Next, Back)
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetPageId = e.currentTarget.getAttribute('data-target');
            if (targetPageId) navigateTo(targetPageId);
        });
    });

    // Bottom navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPageId = e.currentTarget.getAttribute('data-target');
            if (targetPageId) navigateTo(targetPageId);
        });
    });

    // "Select Content" button listener
    if (selectContentBtn) {
        selectContentBtn.addEventListener('click', () => {
            body.classList.add('selection-mode-active');
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                chrome.scripting.executeScript({
                        target: {
                            tabId: tabs[0].id
                        },
                        files: ['scripts/content_selector.js']
                    })
                    .then(() => chrome.tabs.sendMessage(tabs[0].id, {
                        type: "ACTIVATE_SELECTION_MODE"
                    }))
                    .catch(err => console.error("Script injection failed:", err));
            });
        });
    }

    // "Analyze" button listener
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const btnText = analyzeBtn.querySelector('.btn-text');
            const spinner = analyzeBtn.querySelector('.spinner');
            const contentDisplay = document.getElementById('content-display');
            const firstChild = contentDisplay.firstChild;
            let contentToAnalyze = {};

            // Detect selected content type (text or image)
            if (firstChild) {
                if (firstChild.tagName === 'BLOCKQUOTE') {
                    contentToAnalyze = {
                        type: 'text',
                        value: firstChild.textContent
                    };
                } else if (firstChild.tagName === 'DIV' && firstChild.classList.contains('preview-image-wrapper')) {
                    const img = firstChild.querySelector('img');
                    if (img) contentToAnalyze = {
                        type: 'image',
                        value: img.src
                    };
                }
            }

            if (!contentToAnalyze.value) {
                console.error("No content to analyze.");
                return;
            }

            // Update UI to "analyzing" state
            analyzeBtn.disabled = true;
            btnText.textContent = 'Analyzing';
            spinner.classList.remove('hidden');
            navigateTo('page-result');

            // Show loading spinner on the result page
            setTimeout(() => {
                const navButton = document.querySelector('.nav-button');
                if (navButton) navButton.style.display = 'none';

                const resultContent = document.getElementById('result-content');
                if (resultContent) {
                    resultContent.innerHTML = `
                        <div style="text-align:center; margin-top:50px;">
                            <div class="result-spinner"></div>
                            <p style="text-align:center;">Analyzing... Please wait.</p>
                        </div>
                    `;
                }
            }, 100); // Delay to ensure DOM is ready

            try {
                // Send data to the backend API
                const response = await fetch('https://tuneye.sabihinmolang.eu.org/api/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(contentToAnalyze),
                });

                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const analysisData = await response.json();

                // Transform API data into a format suitable for our charts
                const formattedData = {
                    confidence: {
                        fake: Math.round(parseFloat(analysisData.confidence["Fake News"]) * 100),
                        neutral: 0,
                        real: Math.round(parseFloat(analysisData.confidence["Real News"]) * 100)
                    },
                    keywords: analysisData.words.map(item => {
                        const raw = parseFloat(item.weight);
                        
                        // Normalize raw score to -1 to +1 range using tanh
                        const normalized = Math.tanh(raw);
                        
                        return {
                            word: item.word,
                            score: normalized,
                            weight: raw 
                        };
                    })
                };

                // Render results
                requestAnimationFrame(() => {
                    renderResultCharts(formattedData);
                    const navButton = document.querySelector('.nav-button');
                    if (navButton) navButton.style.display = '';
                });

            } catch (error) {
                console.error('Error analyzing content:', error);
                const resultContent = document.getElementById('result-content');
                if (resultContent) {
                    resultContent.innerHTML = `
                        <p style="color: red;">Analysis failed. Is the Python server running on port 1234?</p>
                        <p style="font-size: 12px;">Error: ${error.message}</p>
                    `;
                }
                const navButton = document.querySelector('.nav-button');
                if (navButton) navButton.style.display = 'inline-flex';

            } finally {
                // Reset the analyze button to its initial state
                analyzeBtn.disabled = false;
                btnText.textContent = 'Start Analyze';
                spinner.classList.add('hidden');
            }
        });
    }

    // Chrome storage listener for when new content is selected
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.contentToAnalyze) {
            const newContent = changes.contentToAnalyze.newValue;
            if (newContent) {
                body.classList.remove('selection-mode-active');
                displayContentForPreview(newContent);
                navigateTo('page-preview');
                chrome.storage.local.remove('contentToAnalyze');
            }
        }
    });


    // --- 4. INITIAL EXECUTION ---

    // Initial loading animation sequence
    setTimeout(() => {
        logo.classList.remove('hidden');
        logoTitle.classList.remove('hidden');
        logoText.classList.remove('hidden');

        setTimeout(() => {
            loadingContainer.style.opacity = '0';
            setTimeout(() => {
                loadingContainer.classList.add('hidden');
                mainContainer.classList.remove('hidden');
                navigateTo('page-intro');
            }, 500); // Wait for fade-out to complete
        }, 1500); // Time logo is visible
    }, 500); // Initial delay

    // Set a default height for chart canvases to prevent layout shifts
    document.getElementById('confidenceChartCanvas').height = 200;
    document.getElementById('keywordChartCanvas').height = 250;
});