This is a full-stack web dashboard that connects to an Organization Jira account in order to pull live Jira tickets and utilize Gemini AI to automatically categorize, summarize, and generate release notes.

This dashboard was built with React (frontend) and Node.js/Express (backend).

Main Features:
    * Live Jira Integration: Pulls real tickets from your Jira project automatically
    * Gemini AI Categorization: Categorizes each ticket as Bug, Defect, Story, Task, or Other
    * AI Summaries: Gemini AI help writes a short summary for every Jira ticket
    * Release Notes Generator: Select one or multiple Jira tickets and have Gemini help writes professional release notes
    * Dashboard Charts: Pie chart and bar charts showing ticket breakdown by category, status, and priority
    * Search & Filter: Allow user to filter out ticket by type or ID
    * User Login: Contain a login page for user to sign in


Tech Stack

    * Frontend:
        - React for UI Framework
        - Vite to aid with development and build tool
        - CSS document for all the layout styles and animation

    * Backend:
        - Node.js to create the runtime environment
        - Express to help with API server connection and routing
        - Axios to help with HTTP requests between Jira and Gemini AI
        - dotenv file to aid with managing the API keys more securely

    * API:
        - Jira Rest API v3 to help fetch live tickets from Jira project
        - Google Gemini AI to categorize the ticket, provide short summary, and write release note.

Project Structure

    Abby Dashboard/
    |
    ├── backend/
    │   ├── .env               
    │   ├── .gitignore         
    │   ├── package.json
    │   └── server.js          
    │
    └── frontend/
        ├── public/
        │   └── dataminr_logo.webp
        ├── src/
        │   ├── App.css        
        │   ├── App.jsx       
        │   └── main.jsx     
        ├── index.html
        └── package.json

To Getting Started, please ensure the following prerequisites are met:
    * Node.js v18 or higher
    * A Jira account with API access
    * A Google Gemini API key

Main step:

    1. Download the dashboard repository from github

    2. Set up the backend using following command in visual studio terminal:
        *  cd backend
        *  npm install

    3. Create a .env file inside the backend folder that will contain the following information:
        * JIRA_BASE_URL=https://your-org.atlassian.net
        * JIRA_EMAIL=you@email.com
        * JIRA_API_TOKEN=your_jira_api_token
        * JIRA_PROJECT=YOUR_PROJECT_KEY
        * GEMINI_API_KEY=your_gemini_api_key
        * KB_URL=https://your-company.com/knowledge-base
    
    4. Set up the frontend using the following command in visual studio terminal:
        * cd frontend
        * npm install

    5. Run the app by running the following command in the terminal for backend and frontend:
        * Backend:
            - cd backend
            - node server.js
            - If successful, should see "API running on http://localhost:5000" in the console log
        
        * Frontend:
            - cd frontend
            - npm run dev
            - If successful, should see "Local: http://localhost:5173" in the console log
    
    6. Click on the http://localhost:5173 link to be taken to the login page 

