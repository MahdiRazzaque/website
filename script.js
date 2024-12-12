// Navbar functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// GitHub Repository Timeline
async function fetchGitHubRepos() {
    try {
        const response = await fetch('https://api.github.com/users/MahdiRazzaque/repos');
        const repos = await response.json();

        // Sort repositories by creation date (newest first)
        repos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const timelineContainer = document.getElementById('repo-timeline');
        timelineContainer.innerHTML = ''; // Clear loading message

        repos.forEach(repo => {
            const repoCard = document.createElement('div');
            repoCard.className = 'repo-card';
            
            const creationDate = new Date(repo.created_at).toLocaleDateString();
            
            repoCard.innerHTML = `
                <h3>${repo.name}</h3>
                <div class="timeline-date">${creationDate}</div>
                <p class="repo-description">${repo.description || 'No description available'}</p>
                <div class="repo-links">
                    <a href="${repo.html_url}" target="_blank" class="repo-link">
                        <i class="fab fa-github"></i> View Repository
                    </a>
                    ${repo.homepage ? `
                        <a href="${repo.homepage}" target="_blank" class="demo-link">
                            <i class="fas fa-external-link-alt"></i> Live Demo
                        </a>
                    ` : ''}
                </div>
            `;
            
            timelineContainer.appendChild(repoCard);
        });
    } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        document.getElementById('repo-timeline').innerHTML = 'Error loading repositories';
    }
}

// Add these styles to your CSS file
const styles = `
.repo-card {
    background-color: var(--secondary-color);
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    position: relative;
    border-left: 4px solid var(--accent-color);
    transition: transform 0.3s ease;
}

.repo-card:hover {
    transform: translateX(10px);
}

.repo-links {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
}

.repo-link, .demo-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    transition: background-color 0.3s ease;
}

.repo-link {
    background-color: #24292e;
    color: #fff;
}

.demo-link {
    background-color: var(--accent-color);
    color: #fff;
}

.repo-link:hover, .demo-link:hover {
    opacity: 0.9;
}

.repo-card h3 {
    color: var(--accent-color);
    margin-bottom: 0.5rem;
}

.repo-date {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 1rem;
}
`;

// Contact form handling
const contactForm = document.getElementById('contact-form');
const submitButton = contactForm.querySelector('.submit-btn');

contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        message: document.getElementById('message').value
    };

    // Using config object for email address
    emailjs.send(
        config.EMAILJS_SERVICE_ID,
        config.EMAILJS_TEMPLATE_ID,
        {
            from_name: formData.name,
            from_email: formData.email,
            message: formData.message,
            to_name: 'Mahdi Razzaque',
            to_email: config.TO_EMAIL
        }
    )
    .then(() => {
        showNotification('Message sent successfully!', 'success');
        contactForm.reset();
    })
    .catch((error) => {
        showNotification('Failed to send message. Please try again.', 'error');
        console.error('EmailJS Error:', error);
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
    });
});

// Add notification system
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubRepos();
});
