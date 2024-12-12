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

## Technologies Used

-   **HTML:** Used for structuring the content of the website.
-   **CSS:** Used for styling the website and making it visually appealing.
-   **JavaScript:** Used for interactive elements, such as the hamburger menu, smooth scrolling, fetching GitHub repositories, and handling the contact form.
-   **EmailJS:** Used for sending emails from the contact form.

## Project Structure

-   `index.html`: The main HTML file containing the structure and content of the website.
-   `styles.css`: The CSS file containing the styles for the website.
-   `script.js`: The JavaScript file containing the logic for interactive elements and dynamic content.

## Setup and Installation

1. **Clone the repository:**

    ```bash
    git clone <repository_url>
    ```

2. **Navigate to the project directory:**

    ```bash
    cd <project_directory>
    ```

3. **Open `index.html` in your browser:**

    You can simply open the `index.html` file in your preferred web browser to view the website locally.

## GitHub Repository Timeline

The portfolio section dynamically fetches my GitHub repositories using the GitHub API. It then displays them in a timeline, with each repository represented by a card.

**Note:** The GitHub API has rate limits for unauthenticated requests. If you encounter issues with loading repositories, it might be due to exceeding the rate limit.

## Contact Form

The contact form allows visitors to send messages directly to me. It uses EmailJS to handle the email sending functionality.

**Note:** For the contact form to work, you need to set up an EmailJS account and configure the `config.js` file with your EmailJS service ID, template ID, and public key. You may also need to adjust the configuration variables to your needs.

## Customisation

You can customise the website by modifying the HTML, CSS, and JavaScript files. You can update the content, styles, and functionality to match your preferences.

-   **Content:** Update the text content in `index.html` to reflect your information.
-   **Styles:** Modify the CSS variables and styles in `styles.css` to change the appearance of the website.
-   **GitHub Repositories:** The `script.js` file automatically fetches your public repositories from GitHub. You don't need to manually update the repository list.
-   **Contact Form:** If using EmailJS, update the email template in your EmailJS account to customise the email that is sent when the form is submitted.