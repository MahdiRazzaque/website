# Personal Portfolio Website

## Overview

This project is my personal portfolio website. I'm a first-year Computer Science student at King's College London, and this website showcases my skills, experience, education, and projects. It serves as a digital CV and a platform for me to connect with potential employers, collaborators, and anyone interested in my work.

## Features

-   **Responsive Design:** The website is designed to be responsive and accessible across various devices, including desktops, tablets, and smartphones.
-   **Smooth Scrolling:** Navigation links provide smooth scrolling to different sections of the page.
-   **GitHub Repository Timeline:** Dynamically fetches and displays my GitHub repositories in a timeline format, sorted by creation date (newest first). Each repository card includes the name, creation date, description, and links to the repository and live demo (if available).
-   **Contact Form:** A contact form allows visitors to send messages directly to me. The form utilises EmailJS for handling email sending.
-   **Social Media Links:** Links to my GitHub, LinkedIn, Twitter, and Instagram profiles are provided in the Socials section.
-   **Resume:** Detailed CV information including Key Skills, Education, and Work Experience.
-   **About Section:** An introduction to me, my interests, and skills.
-   **Cache System:** Implements smart caching for GitHub repositories to improve performance and handle rate limits.
-   **Developer Console:** Includes helpful console commands for debugging and cache management.

## Technologies Used

-   **HTML5:** Semantic markup for better accessibility and SEO
-   **CSS3:** Modern styling with CSS variables and responsive design
-   **JavaScript (ES6+):** Modern JavaScript with async/await and proper error handling
-   **EmailJS:** Email handling for the contact form
-   **GitHub API:** Dynamic repository fetching
-   **Nginx:** Production server configuration

## Project Structure

```
portfolio-website/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
├── config.example.js   # Example configuration file
├── config.js           # Your actual configuration (gitignored)
├── assets/            # Images and other static assets
└── README.md          # Documentation
```

## Setup and Installation

### Local Development

1. **Clone the repository:**
    ```bash
    git clone https://github.com/MahdiRazzaque/website.git
    cd website
    ```

2. **Configure the website:**
    ```bash
    # Copy the example config file
    cp config.example.js config.js
    
    # Edit config.js with your credentials
    nano config.js
    ```

3. **Set up EmailJS:**
    - Create an account at [EmailJS](https://www.emailjs.com/)
    - Create an email service and template
    - Update `config.js` with your EmailJS credentials

4. **Run locally:**
    - Using Python's built-in server:
        ```bash
        python -m http.server 8000
        ```
    - Or using Node's http-server:
        ```bash
        npx http-server
        ```

### Production Deployment (Ubuntu/Nginx)

1. **Set up the server:**
    ```bash
    # Install Nginx
    sudo apt update
    sudo apt install nginx
    
    # Create website directory
    sudo mkdir -p /var/www/portfolio
    sudo chown -R $USER:$USER /var/www/portfolio
    ```

2. **Configure Nginx:**
    ```nginx
    server {
        listen 443 ssl;
        server_name your_domain.com;

        root /var/www/portfolio;
        index index.html;

        # Handle JavaScript files
        location ~* \.js$ {
            add_header Content-Type application/javascript;
            try_files $uri =404;
        }

        location / {
            try_files $uri $uri/ /index.html =404;
        }
    }
    ```

3. **Set proper permissions:**
    ```bash
    sudo chmod 755 /var/www/portfolio
    sudo chmod 644 /var/www/portfolio/*
    sudo find /var/www/portfolio -type d -exec chmod 755 {} \;
    ```

## Configuration

Create a `config.js` file based on `config.example.js`:

```javascript
window.config = {
    // EmailJS Configuration
    EMAILJS_PUBLIC_KEY: 'your_key_here',
    EMAILJS_SERVICE_ID: 'your_service_id',
    EMAILJS_TEMPLATE_ID: 'your_template_id',
    
    // Email Configuration
    TO_EMAIL: 'your@email.com',
    
    // GitHub Configuration
    GITHUB_USERNAME: 'your_github_username'
};
```

## Developer Tools

Open browser DevTools (F12) to access these console commands:

- `help()` - List all available console commands
- `showCacheInfo()` - Display GitHub cache status
- `clearGitHubCache()` - Clear the GitHub cache

## Cache System

The website implements a smart caching system for GitHub repositories that:
- Updates at midnight UTC daily
- Falls back to cached data if rate limited
- Shows cache status in the console
- Provides manual cache management through console commands

## Troubleshooting

1. **JavaScript not loading:**
   - Check browser console for errors
   - Verify file permissions
   - Clear browser cache
   - Ensure config.js is properly set up

2. **Contact form not working:**
   - Verify EmailJS credentials
   - Check browser console for errors
   - Verify email template configuration

3. **GitHub repositories not loading:**
   - Check rate limit status
   - Clear cache using `clearGitHubCache()`
   - Verify GitHub username in config.js