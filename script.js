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

// Cache constants
const CACHE_KEYS = {
    REPOS: 'github_repos_cache',
    LANGUAGES: 'github_languages_cache',
    LAST_FETCH: 'github_last_fetch'
};

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

function isCacheValid(lastFetchTime) {
    if (!lastFetchTime) return false;
    const now = Date.now();
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

// Utility Functions
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

function showNotification(message, type) {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

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

function setLoading(element, isLoading) {
    if (isLoading) {
        element.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading repositories...</p>
            </div>
        `;
    }
}

function showError(element, message, retryCallback = null) {
    element.innerHTML = `
        <div class="error-container">
            <i class="fas fa-exclamation-circle"></i>
            <p class="error-message">${escapeHtml(message)}</p>
            ${retryCallback ? '<button class="retry-button">Try Again</button>' : ''}
        </div>
    `;
    
    if (retryCallback) {
        const retryButton = element.querySelector('.retry-button');
        retryButton?.addEventListener('click', retryCallback);
    }
}

// Cache utility functions
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
    }
}

// GitHub Repository Functions
async function fetchGitHubRepos() {
    const timelineContainer = elements.repoTimeline;
    if (!timelineContainer) return;

    try {
        timelineContainer.innerHTML = '<div class="loading">Loading repositories...</div>';
        
        if (!window.config?.GITHUB_USERNAME) {
            throw new Error('GitHub username not configured');
        }

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
            const response = await fetch(`https://api.github.com/users/${window.config.GITHUB_USERNAME}/repos?per_page=100`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Portfolio-Website'
                }
            });

            if (response.status === 403) {
                // If cache exists but is expired, use it as fallback
                if (cachedRepos) {
                    const lastUpdate = formatDateTime(lastFetchTime);
                    console.log(`Rate limit exceeded, using expired cache as fallback. Last updated: ${lastUpdate}`);
                    repos = cachedRepos;
                } else {
                    throw new Error('GitHub API rate limit exceeded. Please try again later.');
                }
            } else if (response.status === 404) {
                throw new Error('GitHub username not found.');
            } else if (!response.ok) {
                throw new Error(`Failed to fetch repositories (${response.status})`);
            } else {
                repos = await response.json();
                // Update cache
                setCache(CACHE_KEYS.REPOS, repos);
                const currentTime = Date.now();
                setCache(CACHE_KEYS.LAST_FETCH, currentTime);
                const nextUpdate = formatDateTime(getNextMidnightUTC());
                const lastUpdate = formatDateTime(currentTime);
                console.log(`Repository data cached. Last updated: ${lastUpdate}. Next update: ${nextUpdate}`);
            }
        }
        
        if (!Array.isArray(repos) || repos.length === 0) {
            timelineContainer.innerHTML = '<p class="no-repos">No repositories found.</p>';
            return;
        }

        // Sort and filter repositories
        const sortedRepos = repos
            .filter(repo => !repo.fork && !repo.private)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (sortedRepos.length === 0) {
            timelineContainer.innerHTML = '<p class="no-repos">No public repositories found.</p>';
            return;
        }

        timelineContainer.innerHTML = sortedRepos
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

    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        const errorMessage = error.message === 'GitHub API rate limit exceeded. Please try again later.' ?
            'GitHub API rate limit exceeded. Please try again in a few minutes.' :
            error.message || 'Error loading repositories. Please try again later.';
            
        showError(
            timelineContainer, 
            errorMessage,
            () => fetchGitHubRepos()
        );
    }
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

        const languagesList = Object.keys(languages);

        if (languagesList.length > 0) {
            const repoCard = document.querySelector(`[data-languages-url="${languagesUrl}"]`);
            const languagesContainer = repoCard?.querySelector('.repo-languages');
            if (languagesContainer) {
                languagesContainer.innerHTML = languagesList
                    .map(lang => `<span class="language-tag">${escapeHtml(lang)}</span>`)
                    .join('');
                languagesContainer.classList.remove('skeleton');
            }
        }
    } catch (error) {
        console.error('Error fetching languages:', error);
    }
}

function createRepoCard(repo) {
    const languages = repo.languages_url ? 
        `<div class="repo-languages skeleton" data-languages-url="${repo.languages_url}"></div>` : '';
    
    return `
        <div class="repo-card" data-repo-id="${repo.id}">
            <h3>${escapeHtml(repo.name)}</h3>
            <div class="timeline-date">${new Date(repo.created_at).toLocaleDateString()}</div>
            <p class="repo-description">${escapeHtml(repo.description || 'No description available')}</p>
            ${languages}
            <div class="repo-links">
                <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="repo-link">
                    <i class="fab fa-github"></i> View Repository
                </a>
                ${repo.homepage ? `
                    <a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer" class="demo-link">
                        <i class="fas fa-external-link-alt"></i> Live Demo
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

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
async function handleContactFormSubmit(e) {
    e.preventDefault();
    if (!elements.contactForm || !elements.submitButton) return;

    const formElements = elements.contactForm.elements;
    setFormState(formElements, true);

    try {
        const formData = getFormData();
        validateFormData(formData);
        await sendEmail(formData);
        
        showNotification('Message sent successfully!', 'success');
        elements.contactForm.reset();
    } catch (error) {
        console.error('Contact Form Error:', error);
        showNotification(error.message || 'Failed to send message. Please try again.', 'error');
    } finally {
        setFormState(formElements, false);
    }
}

function setFormState(formElements, isDisabled) {
    Array.from(formElements).forEach(element => {
        element.disabled = isDisabled;
    });
    elements.submitButton.textContent = isDisabled ? 'Sending...' : 'Send Message';
}

function getFormData() {
    return {
        name: document.getElementById('name')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        message: document.getElementById('message')?.value.trim() || ''
    };
}

// Event Listeners
function initializeEventListeners() {
    // Mobile menu
    elements.hamburger?.addEventListener('click', () => {
        elements.navLinks?.classList.toggle('active');
        elements.hamburger.classList.toggle('active');
    });

    // Close mobile menu when clicking links
    elements.navLinksItems?.forEach(link => {
        link.addEventListener('click', () => {
            elements.navLinks?.classList.remove('active');
            elements.hamburger?.classList.remove('active');
        });
    });

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', handleSmoothScroll);
    });

    // Contact form
    elements.contactForm?.addEventListener('submit', handleContactFormSubmit);

    // Handle form validation on input
    elements.contactForm?.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', debounce(validateInput, DEBOUNCE_DELAY));
    });
}

function handleSmoothScroll(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function validateInput(e) {
    const input = e.target;
    const formGroup = input.closest('.form-group');
    const value = input.value.trim();
    
    formGroup.classList.remove('error');
    formGroup.querySelector('.error-message')?.remove();

    if (!value) {
        showInputError(formGroup, 'This field is required');
    } else if (input.type === 'email' && !isValidEmail(value)) {
        showInputError(formGroup, 'Please enter a valid email address');
    }
}

function showInputError(formGroup, message) {
    formGroup.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
}

// Add a function to clear the cache if needed
function clearGitHubCache() {
    try {
        localStorage.removeItem(CACHE_KEYS.REPOS);
        localStorage.removeItem(CACHE_KEYS.LANGUAGES);
        localStorage.removeItem(CACHE_KEYS.LAST_FETCH);
        console.log('GitHub cache cleared successfully');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// Console Help System
const consoleCommands = {
    help: "Lists all available console commands and their descriptions",
    clearGitHubCache: "Clears the GitHub repositories and languages cache, forcing a fresh fetch on next load",
    showCacheInfo: "Shows the current cache status, including last update time and next scheduled update"
};

// Add to window object so they're accessible in console
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
        console.log('%cGitHub cache cleared successfully!%c\nRefresh the page to fetch fresh data.', 'color: #4CAF50; font-weight: bold', 'color: inherit');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

// Add initial help message when DevTools is opened
const helpMessage = `
%cWelcome to the Portfolio Console!%c

Type %chelp()%c to see available commands.
`;

// Function to show help message when DevTools opens
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

// Listen for DevTools open
window.addEventListener('devtoolschange', showInitialHelp);
document.addEventListener('DOMContentLoaded', showInitialHelp);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    fetchGitHubRepos();
});
