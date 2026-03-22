This is a full-stack web dashboard that connects to an organization's Jira account to pull live Jira tickets and utilize Gemini AI to automatically categorize, summarize, and generate release notes. It also includes a Documentation Fields system backed by SQLite and synced to Google Sheets as requested by documentation team.

This dashboard was built with React (frontend) and Node.js/Express (backend).

Main Features:

    * Live Jira Integration: Pulls real tickets from your Jira project automatically
    * Gemini AI Categorization: Categorizes each ticket as Bug, Defect, Story, Task, or Other
    * AI Summaries: Gemini AI help writes a short summary for every Jira ticket
    * Release Notes Generator: Select one or multiple Jira tickets and have Gemini help writes professional release notes
    * Documentation Fields: allow custom fields in Google Sheet to show up on Dashboard. These custom fields are stored in SQLite and synced to Google Sheets.
    * Google Sheet Sync: two-way synce between the dashboard and the client's Google Sheet
    * CSV Import: allow documentation team to import documentation data directly from a CSV file via the dashboard
    * Fix Version & Release Note Filters: filter tickets by fix version or release note type (Public, Internal, Hidden or Null)
    * Activity Log: security audit log tracking logins, edits, imports, syncs and permission denials
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
        - sql.js is utilized as database that is pure JavaScript and require no native build
        - googleapis provide two way sync between Dashboard and Google Sheet using Google Sheets API
        - dotenv file to aid with managing the API keys more securely

    * API:
        - Jira Rest API v3 to help fetch live tickets from Jira project
        - Google Gemini AI to categorize the ticket, provide short summary, and write release note.
        - Google Sheets API to sync up documentation fields

Project Structure

    Abby Dashboard/
    │
    ├── backend/
    │   ├── server.js           
    │   ├── database.js         
    │   ├── metadata.db        
    │   ├── google-credentials.json  
    │   ├── .env                
    │   ├── .gitignore
    │   └── package.json
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
    * A Google Cloud Project with Sheets API enabled for Google Sheets sync

Main step:

    1. Download the dashboard repository from github

    2. Set up the backend using following command in visual studio terminal:
        *  cd backend
        *  npm install

    3. Create a .env file inside the backend folder that will contain the following information:
        * JIRA_BASE_URL=https://your-org.atlassian.net              (find your Jira instance URL)
        * JIRA_EMAIL=you@email.com                                  (email address of your Jira account)
        * JIRA_API_TOKEN=your_jira_api_token                        (Jira->account setting -> security->api tokens->create)
        * JIRA_PROJECT=YOUR_PROJECT_KEY                             (The project key shown in your Jira board URL(ex. PLAT, SCURM etc.))
        * GEMINI_API_KEY=your_gemini_api_key                        (Go to Google AI Studio and get API key)
        * KB_URL=https://your-company.com/knowledge-base            (Your company's product knowledge base URL)
        * KB_RELEASE_URL=https://your-company.com/release-note-style-guide        (Your company's release note style guide URL)
        * GOOGLE_SHEET_TAB=Sheet1                                   (The tab name at the bottom of your Google Sheet)
    
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

    7. Set up Google Sheet sync 
        a. Create Google Cloud Project 
            i.   Go to console.cloud.google.com
            ii.  Click the project dropdown → New Project → name it and click Create
        
        b. Enable the API
            i.   Go to APIs & Services → Library
            ii.  Search for and enable Google Sheets API
            iii. Search for and enable Google Drive API
        
        c. Create a service account
            i.   Go to APIs & Services → Credentials → Create Credentials → Service Account
            ii.  Name it dashboard-reader → click Create and Continue → Done
        
        d. Download the credentials
            i.   Click the service account → Keys → Add Key → Create new key → JSON
            ii.  Save the downloaded file as google-credentials.json inside the backend/ folder
            iii. Make sure google-credentials.json is listed in .gitignore — it must never be committed

        e. Share the Google Sheet 
            i.   Open google-credentials.json and copy the client_email value
            ii.  Open the client's Google Sheet → click Share
            iii. Paste the client_email → set permission to Editor → click Share

        f. Connect the sheet from the dashboard 
            i.   Log in to the dashboard as Admin or Senior Developer
            ii.  Click 🔄 Sync Sheet in the top bar
            iii. Paste the full Google Sheet URL when prompted
            iv.  Click OK — the URL is saved and the sheet syncs automatically 

Importing Documentation Data

The dashboard supports two ways to load documentation data:

    * Option A — Import CSV (recommended for initial load)
        - Export your Google Sheet as CSV (File → Download → CSV)
        - Log in as Senior Developer
        - Click 📂 Import CSV in the top bar
        - Select the CSV file — it imports automatically

    * Option B — Sync from Google Sheet
        - Click 🔄 Sync Sheet in the top bar
        - Paste your Google Sheet URL
        - Click OK — all rows are synced to the database

User Roles & Permissions

    * Senior Developer has access to:
        - View ticket, documentation fields, and edit documentation fields
        - Import CSV and sync to Google Sheet
        - Generate release note
        - View activity log
    
    * Product Manager has access to:
        - View tickets, and documentation field
        - Generate release note

    * QA Engineer has access to:
        - View tickets and documentation field
        - Generate release note
        - View activity log

Security Notes

Never commit .env, google-credentials.json, or metadata.db to GitHub
Add these to your .gitignore:

    .env
    metadata.db
    google-credentials.json
    sheet.csv

The Activity Log records all logins, edits, imports, syncs, and permission denials with timestamps and IP addresses
All editing actions require role verification on the backend — the role is not trusted from the frontend alone

