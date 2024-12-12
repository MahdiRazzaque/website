// Configuration validation
function validateConfig() {
    const requiredKeys = [
        'EMAILJS_PUBLIC_KEY',
        'EMAILJS_SERVICE_ID',
        'EMAILJS_TEMPLATE_ID',
        'TO_EMAIL',
        'GITHUB_USERNAME'
    ];

    if (!window.config) {
        throw new Error('Configuration not found. Please ensure config.js is properly loaded.');
    }

    const missingKeys = requiredKeys.filter(key => !window.config[key]);
    if (missingKeys.length > 0) {
        throw new Error(`Missing required configuration keys: ${missingKeys.join(', ')}`);
    }
}

// Cache DOM elements
const elements = {
    hamburger: document.querySelector('.hamburger'),
    navLinks: document.querySelector('.nav-links'),
    navLinksItems: document.querySelectorAll('.nav-links a'),
    contactForm: document.getElementById('contact-form'),
    repoTimeline: document.getElementById('repo-timeline'),
    submitButton: document.querySelector('.submit-btn')
};

// Constants
const DEBOUNCE_DELAY = 300;
const CACHE_KEYS = {
    REPOS: 'github_repos_cache',
    LANGUAGES: 'github_languages_cache',
    LAST_FETCH: 'github_last_fetch'
};

// Console Help System
const consoleCommands = {
    help: "Lists all available console commands and their descriptions",
    clearGitHubCache: "Clears the GitHub repositories and languages cache, forcing a fresh fetch on next load",
    showCacheInfo: "Shows the current cache status, including last update time and next scheduled update"
};

// Date formatting utilities
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString([], { 
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    return `${dateString} at ${timeString}`;
}

// Cache management utilities
function isCacheValid(lastFetchTime) {
    if (!lastFetchTime) return false;
    const lastMidnightUTC = new Date();
    lastMidnightUTC.setUTCHours(0, 0, 0, 0);
    return lastFetchTime >= lastMidnightUTC.getTime();
}

function getNextMidnightUTC() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime();
}

function getCache(key) {
    try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function setCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error setting cache:', error);
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
            clearOldCache();
        }
    }
}

function clearOldCache() {
    try {
        // Clear old caches if storage is full
        Object.values(CACHE_KEYS).forEach(key => {
            if (key !== CACHE_KEYS.LAST_FETCH) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing old cache:', error);
    }
}

// Security utilities
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Error handling
function showError(container, message, retryCallback = null) {
    if (!container) return;
    
    const errorHtml = `
        <div class="error-container" role="alert">
            <i class="fas fa-exclamation-circle"></i>
            <p class="error-message">${escapeHtml(message)}</p>
            ${retryCallback ? '<button class="retry-button">Try Again</button>' : ''}
        </div>
    `;
    
    container.innerHTML = errorHtml;
    
    if (retryCallback) {
        const retryButton = container.querySelector('.retry-button');
        retryButton?.addEventListener('click', retryCallback);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Validate configuration
        validateConfig();

        // Initialize EmailJS
        emailjs.init(window.config.EMAILJS_PUBLIC_KEY);
        console.log('EmailJS initialized successfully');

        // Set up event listeners
        setupEventListeners();

        // Load GitHub repositories
        fetchGitHubRepos();

    } catch (error) {
        console.error('Initialization error:', error);
        showNotification(error.message, 'error');
    }
});

// GitHub Repository Functions
async function fetchGitHubRepos() {
    const timelineContainer = elements.repoTimeline;
    if (!timelineContainer) return;

    try {
        timelineContainer.innerHTML = '<div class="loading" role="status" aria-live="polite">Loading repositories...</div>';
        
        // Check cache first
        const cachedRepos = getCache(CACHE_KEYS.REPOS);
        const lastFetchTime = getCache(CACHE_KEYS.LAST_FETCH);

        let repos;
        if (cachedRepos && isCacheValid(lastFetchTime)) {
            const nextUpdate = formatDateTime(getNextMidnightUTC());
            const lastUpdate = formatDateTime(lastFetchTime);
            console.log(`Using cached repository data. Last updated: ${lastUpdate}. Next update: ${nextUpdate}`);
            repos = cachedRepos;
        } else {
            console.log('Fetching fresh repository data');
            repos = await fetchGitHubData();
        }
        
        await renderRepositories(repos, timelineContainer);

    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        const errorMessage = error.message === 'GitHub API rate limit exceeded. Please try again later.' ?
            'GitHub API rate limit exceeded. Please try again in a few minutes.' :
            error.message || 'Error loading repositories. Please try again later.';
            
        showError(timelineContainer, errorMessage, () => fetchGitHubRepos());
    }
}

async function fetchGitHubData() {
    const response = await fetch(`https://api.github.com/users/${window.config.GITHUB_USERNAME}/repos?per_page=100`, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Portfolio-Website'
        }
    });

    if (response.status === 403) {
        const cachedRepos = getCache(CACHE_KEYS.REPOS);
        const lastFetchTime = getCache(CACHE_KEYS.LAST_FETCH);
        
        if (cachedRepos) {
            const lastUpdate = formatDateTime(lastFetchTime);
            console.log(`Rate limit exceeded, using expired cache as fallback. Last updated: ${lastUpdate}`);
            return cachedRepos;
        }
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }

    if (response.status === 404) {
        throw new Error('GitHub username not found.');
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch repositories (${response.status})`);
    }

    const repos = await response.json();
    
    // Update cache
    setCache(CACHE_KEYS.REPOS, repos);
    const currentTime = Date.now();
    setCache(CACHE_KEYS.LAST_FETCH, currentTime);
    const nextUpdate = formatDateTime(getNextMidnightUTC());
    const lastUpdate = formatDateTime(currentTime);
    console.log(`Repository data cached. Last updated: ${lastUpdate}. Next update: ${nextUpdate}`);
    
    return repos;
}

async function renderRepositories(repos, container) {
    if (!Array.isArray(repos) || repos.length === 0) {
        container.innerHTML = '<p class="no-repos">No repositories found.</p>';
        return;
    }

    // Sort and filter repositories
    const sortedRepos = repos
        .filter(repo => !repo.fork && !repo.private)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (sortedRepos.length === 0) {
        container.innerHTML = '<p class="no-repos">No public repositories found.</p>';
        return;
    }

    container.innerHTML = sortedRepos
        .map(repo => createRepoCard(repo))
        .join('');

    // Add intersection observer for animations
    addRepoAnimations();

    // Fetch languages for each repo
    sortedRepos.forEach(repo => {
        if (repo.languages_url) {
            fetchRepoLanguages(repo.languages_url);
        }
    });
}

async function fetchRepoLanguages(languagesUrl) {
    try {
        // Check languages cache first
        const cachedLanguages = getCache(CACHE_KEYS.LANGUAGES) || {};
        
        let languages;
        if (cachedLanguages[languagesUrl]) {
            languages = cachedLanguages[languagesUrl];
        } else {
            const response = await fetch(languagesUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Portfolio-Website'
                }
            });

            if (response.status === 403) {
                console.warn('Rate limit exceeded for languages fetch');
                return;
            }

            if (!response.ok) return;

            languages = await response.json();
            
            // Update languages cache
            cachedLanguages[languagesUrl] = languages;
            setCache(CACHE_KEYS.LANGUAGES, cachedLanguages);
        }

        updateLanguagesDisplay(languages, languagesUrl);
    } catch (error) {
        console.error('Error fetching languages:', error);
    }
}

function updateLanguagesDisplay(languages, languagesUrl) {
    const languagesList = Object.keys(languages);
    if (languagesList.length === 0) return;

    const repoCard = document.querySelector(`[data-languages-url="${languagesUrl}"]`);
    const languagesContainer = repoCard?.querySelector('.repo-languages');
    if (!languagesContainer) return;

    languagesContainer.innerHTML = languagesList
        .map(lang => `<span class="language-tag">${escapeHtml(lang)}</span>`)
        .join('');
    languagesContainer.classList.remove('skeleton');
}

function createRepoCard(repo) {
    const languages = repo.languages_url ? 
        `<div class="repo-languages skeleton" data-languages-url="${repo.languages_url}" aria-label="Repository languages"></div>` : '';
    
    return `
        <div class="repo-card" data-repo-id="${repo.id}">
            <h3>${escapeHtml(repo.name)}</h3>
            <div class="timeline-date">${new Date(repo.created_at).toLocaleDateString()}</div>
            <p class="repo-description">${escapeHtml(repo.description || 'No description available')}</p>
            ${languages}
            <div class="repo-links">
                <a href="${escapeHtml(repo.html_url)}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="repo-link"
                   aria-label="View repository ${escapeHtml(repo.name)} on GitHub">
                    <i class="fab fa-github" aria-hidden="true"></i> View Repository
                </a>
                ${repo.homepage ? `
                    <a href="${escapeHtml(repo.homepage)}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="demo-link"
                       aria-label="View live demo of ${escapeHtml(repo.name)}">
                        <i class="fas fa-external-link-alt" aria-hidden="true"></i> Live Demo
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// Animation Functions
function addRepoAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1 }
    );

    document.querySelectorAll('.repo-card').forEach(card => {
        observer.observe(card);
    });
}

// Form Handling
function setupEventListeners() {
    // Mobile menu
    elements.hamburger?.addEventListener('click', toggleMobileMenu);
    
    // Close mobile menu when clicking links
    elements.navLinksItems?.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', handleSmoothScroll);
    });

    // Contact form
    elements.contactForm?.addEventListener('submit', handleContactFormSubmit);

    // Form validation
    elements.contactForm?.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', debounce(validateInput, DEBOUNCE_DELAY));
    });
}

function toggleMobileMenu() {
    elements.navLinks?.classList.toggle('active');
    elements.hamburger?.classList.toggle('active');
    
    // Update ARIA attributes
    const isExpanded = elements.navLinks?.classList.contains('active');
    elements.hamburger?.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
}

function closeMobileMenu() {
    elements.navLinks?.classList.remove('active');
    elements.hamburger?.classList.remove('active');
    elements.hamburger?.setAttribute('aria-expanded', 'false');
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Console Commands
window.help = function() {
    console.log('Available Console Commands:\n');
    Object.entries(consoleCommands).forEach(([command, description]) => {
        console.log(`%c${command}()%c - ${description}`, 'color: #4a90e2; font-weight: bold', 'color: inherit');
    });
};

window.showCacheInfo = function() {
    const lastFetchTime = getCache(CACHE_KEYS.LAST_FETCH);
    const cachedRepos = getCache(CACHE_KEYS.REPOS);
    
    if (!lastFetchTime || !cachedRepos) {
        console.log('No GitHub cache found.');
        return;
    }

    const lastUpdate = formatDateTime(lastFetchTime);
    const nextUpdate = formatDateTime(getNextMidnightUTC());
    const repoCount = cachedRepos.length;

    console.log('GitHub Cache Status:');
    console.log(`%cLast Updated:%c ${lastUpdate}`, 'font-weight: bold', 'font-weight: normal');
    console.log(`%cNext Update:%c ${nextUpdate}`, 'font-weight: bold', 'font-weight: normal');
    console.log(`%cCached Repositories:%c ${repoCount}`, 'font-weight: bold', 'font-weight: normal');
    console.log(`%cCache Valid:%c ${isCacheValid(lastFetchTime)}`, 'font-weight: bold', 'font-weight: normal');
};

window.clearGitHubCache = function() {
    try {
        localStorage.removeItem(CACHE_KEYS.REPOS);
        localStorage.removeItem(CACHE_KEYS.LANGUAGES);
        localStorage.removeItem(CACHE_KEYS.LAST_FETCH);
        console.log('%cGitHub cache cleared successfully!%c\nRefresh the page to fetch fresh data.', 
            'color: #4CAF50; font-weight: bold', 'color: inherit');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

// DevTools Welcome Message
const helpMessage = `
%cWelcome to the Portfolio Console!%c

Type %chelp()%c to see available commands.
`;

function showInitialHelp() {
    if (window.devtools?.isOpen || 
        window.innerHeight < window.outerHeight - 100 || 
        window.Firebug?.chrome?.isInitialized) {
        console.clear();
        console.log(
            helpMessage,
            'color: #4a90e2; font-size: 14px; font-weight: bold',
            'color: inherit',
            'color: #4a90e2; font-weight: bold',
            'color: inherit'
        );
    }
}

// Event Listeners
window.addEventListener('devtoolschange', showInitialHelp);
document.addEventListener('DOMContentLoaded', showInitialHelp);
