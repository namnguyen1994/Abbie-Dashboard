/* Three important packages that help handle the API call and facilitate communication between front and backend */
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');   
require('dotenv').config({ path: __dirname + '/.env' }); // Load environment variables from .env file
console.log('ENV CHECK:', process.env.JIRA_BASE_URL, process.env.JIRA_PROJECT);

// Import database functions for initializing the database, getting and upserting metadata, managing settings, and logging activity
const { initDB, getMetadata, getAllMetadata, upsertMetadata, getSetting, setSetting, logActivity, getActivityLog } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG = {
  JIRA_BASE_URL : process.env.JIRA_BASE_URL,
  JIRA_EMAIL    : process.env.JIRA_EMAIL,
  JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  JIRA_PROJECT  : process.env.JIRA_PROJECT,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  KB_URL        : process.env.KB_URL,
  KB_RELEASE_URL: process.env.KB_RELEASE_URL,
};

//Decleare valid values for "Include Release Notes" field in Jira Tickets
const RELEASE_NOTE_TYPES = ['null', 'public', 'internal', 'hidden'];

const EDITOR_ROLES = ['Senior Developer', 'QA Engineer']; // Roles that can edit ticket metadata fields

// Sample user login information to enable quick login
const MOCK_USERS = [
  { id: 'u1', email: 'nam.nguyen@datamir.com',    password: 'password123', name: 'Nam Nguyen',    avatar: 'NN', role: 'Senior Developer' },
  { id: 'u2', email: 'andrea.cossio@datamir.com', password: 'password123', name: 'Andrea Cossio', avatar: 'AC', role: 'Product Manager'  },
  { id: 'u3', email: 'josh.moyer@datamir.com',    password: 'password123', name: 'Josh Moyer',    avatar: 'JM', role: 'QA Engineer'      },
];

/* 
  It is a helper function used to call Gemini AI and get the response based on the prompt we send. 
  It uses the axios package to make a POST request to the Gemini API endpoint, passing the prompt and generation configuration. 
  The function returns the generated text from Gemini or an empty string if there was an issue with the response structure.
*/
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const response = await axios.post(url, { 
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 16384 },
  });

  // Navigate the response structure to extract the generated text, with safety checks for each level
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/*
  This function is responsible for fetching Jira tickets using the Jira API. 
  It constructs a JQL query to retrieve issues from a specific project, orders them by their last update time, and limits the results to a specified maximum. 
  The function uses basic authentication with the Jira API token and email, and returns an array of issues or an empty array if there are no issues found.
*/
async function fetchJiraTickets(maxResults = 50) {
  const jql = `project=${CONFIG.JIRA_PROJECT} ORDER BY issuekey ASC`;
  const url   = `${CONFIG.JIRA_BASE_URL}/rest/api/3/search/jql`;
  const token = Buffer.from(`${CONFIG.JIRA_EMAIL}:${CONFIG.JIRA_API_TOKEN}`).toString('base64');

  // Make the GET request to the Jira API with the appropriate headers and query parameters
  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${token}`, Accept: 'application/json' },
    params: {
      jql,
      maxResults,
      fields: '*all'
    },
  });

  // Safely navigate the response to return the issues array, or an empty array if not present
  return response.data.issues || [];
}

/*
  This function takes a raw Jira issue object and transforms it into a normalized ticket format that the frontend can easily work with. 
  It extracts relevant fields such as title, description, status, priority, type, assignee, reporter, sprint, story points, and more. 
*/
function normaliseTicket(issue) {
  // If the issue or its fields are missing, return a default ticket object with placeholder values to prevent frontend errors
  if (!issue || !issue.fields) {
    return {
      id          : issue?.key || 'UNKNOWN',
      title       : '(no data)',
      description : '',
      status      : 'Unknown',
      priority    : 'Medium',
      type        : 'other',
      assignee    : 'Unassigned',
      reporter    : 'Unknown',
      sprint      : 'Backlog',
      storyPoints : 0,
      created     : '',
      updated     : '',
      labels      : [],
      comments    : 0,
      attachments : 0,
      fixVersion  : null,
      includeReleaseNotes: 'null',
      aiSummary   : null,
      aiCategory  : null,
    };
  }

  // Extract fields from the issue for easier access
  const f = issue.fields;

  //  Determine the ticket type based on the issue type name, with a fallback to 'other' if it doesn't match known types
  const rawType = (f.issuetype?.name || 'Other').toLowerCase();
  const labels  = (f.labels || []).map(l => l.toLowerCase());

  let type = 'other';
  if (rawType.includes('bug') || labels.some(l => l.includes('bug'))) {
    type = 'bug';
  } else if (rawType.includes('story') || labels.some(l => l.includes('story'))) {
    type = 'story';
  } else if (rawType.includes('task') || labels.some(l => l.includes('task'))) {
    type = 'task';
  } else if (rawType.includes('defect') || labels.some(l => l.includes('defect'))) {
    type = 'defect';
  }
  
  const fixVersionRaw = f['customfield_10150']?.value || null;

  const rnRaw = f['customfield_10151']?.value?.toLowerCase();
  const includeReleaseNotes = RELEASE_NOTE_TYPES.includes(rnRaw) ? rnRaw : 'null';

  // Return a normalized ticket object with all the necessary fields for the frontend, using safe navigation and default values where appropriate
  return {
    id          : issue.key,
    title       : f.summary                              || '(no summary)',
    description : f.description?.content?.[0]?.content?.[0]?.text || f.description || '',
    status      : f.status?.name                         || 'Unknown',
    priority    : f.priority?.name                       || 'Medium',
    type,
    assignee    : f.assignee?.displayName                || 'Unassigned',
    reporter    : f.reporter?.displayName                || 'Unknown',
    sprint      : f.customfield_10020?.[0]?.name         || 'Backlog',
    storyPoints : f.customfield_10016                    || 0,
    created     : (f.created || '').split('T')[0],
    updated     : (f.updated || '').split('T')[0],
    labels      : f.labels                              || [],
    comments    : f.comment?.total                      || 0,
    attachments : f.attachment?.length                  || 0,
    fixVersion  : fixVersionRaw,
    includeReleaseNotes,
    aiSummary   : null,
    aiCategory  : null,
  };
}

/*
  mergeMetadata — takes a normalised ticket and attaches its SQLite metadata row.
  If no metadata exists yet, the docs fields are all null.
*/
function mergeMetadata(ticket, metaMap) {
  const meta = metaMap.get(ticket.id) || {};
  return {
    ...ticket,
    docs: {
      epicPlat        : meta.epic_plat           || null,
      docsStatus      : meta.docs_status         || null,
      docsToChange    : meta.docs_to_change      || null,
      rnWriteup       : meta.rn_writeup          || null,
      notes           : meta.notes               || null,
      docsTeamMember  : meta.docs_team_member    || null,
      sme             : meta.sme                 || null,
      reviewProcess   : meta.review_process      || null,
      docsChangesNoted: meta.docs_changes_noted  || null,
      wrikeCardAdded  : meta.wrike_card_added    || null,
      includeRnSheet  : meta.include_rn_sheet    || null,
      enteredIntoRn   : meta.entered_into_rn     || null,
      platLinkAdded   : meta.plat_link_added     || null,
      updatedAt       : meta.updated_at          || null,
    },
  };
}

function buildReleaseNoteSuggestionPrompt(ticket) {
  const { id, title, description, type, priority, includeReleaseNotes } = ticket;
  const desc = description || 'No description provided.';

  if (includeReleaseNotes === 'hidden') {
    return `Ticket ${id} is marked as "hidden" for release notes and should not be included in the release notes.`;
  }

  const baseContext = `
Ticket ID: ${id}
Title    : ${title}
Type     : ${type}
Priority : ${priority}
Description: ${desc}
`.trim();

  const AiInstructions = {
    null: `
The "Include Release Notes" field is not set for this ticket. Provide a general suggesstion that the documentation team can use as a starting point.
Include both a customer-facing paragraph (public) and an internal note for employees so the team can decide which parts to publish.`,

    public: `
This ticket is marked as "public" for release notes, which means it should be included in the customer-facing release notes.
Write release-note content that is safe for external customers. Use friendly, non-technical language. Do not include internal implementation details,
workaround steps, or anything that could expose system architecture.`,

    internal: `
This ticket is marked as "internal" for release notes. Write a release-note content for employees only.
Include two sections:
1. A "Public Summary" suitable for customers (if any public-facing impact exists, otherwise say "No customer impact")
2. An "Internal Details" section that can include technical details, implementation notes, root-cause analysis, and any other information that internal staff should know.`,
  };

  return `
You are a technical writer helping a documentation team draft release notes for a Jira ticket.

Company release-note style guide (REQUIRED - follow this for structure, tone, and formatting): ${CONFIG.KB_RELEASE_URL}

${baseContext}

Audience guidance:
${AiInstructions[includeReleaseNotes]}

Return a JSON object with the following keys:
- "suggestion" : the suggested release note text (plain string, markdown allowed)
- "publicPart" : the public-safe portion only (string, or null if not applicable)
- "internalPart": the internal-only portion (string, or null if not applicable)
- "tips"      : array of 2-3 short strings with writing tips for this ticket

Respond ONLY with valid JSON, no markdown formatting in the response.
`.trim();
}

// ── AUTH (mocked for demo) ─────────────────────────────────
app.get('/api/auth/users', (req, res) => {
  res.json({ users: MOCK_USERS.map(({ password: _, ...u }) => u) }); // Return users without passwords for security reasons
});

/* 
This endpoint handles user login by checking the provided email and password against the mock users. 
If the credentials are valid, it returns a mock token and user information (excluding the password). 
If not, it responds with a 401 Unauthorized status and an error message.
*/
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Get the user's IP address for logging purposes
  const user = MOCK_USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    logActivity(email, 'unknown', 'LOGIN_FAILED', null, 'Failed login attempt', ip);
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const { password: _, ...safeUser } = user; // Exclude password from the user object before sending it back
  logActivity(user.email, user.role, 'LOGIN_SUCCESS', null, 'User logged in successfully', ip);
  res.json({ token: `token-${user.id}`, user: safeUser });// Return user info without password for security reasons
});

//This endpoint simulates user logout by simply returning a success message.
app.post('/api/auth/logout', (req, res) => {
  const { userEmail, userRole } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Get the user's IP address for logging purposes
  logActivity(userEmail, userRole, 'LOGOUT', null, 'User logged out', ip);
  res.json({ message: 'Logged out successfully' });
});

/*
Get all tickets: This endpoint fetches Jira tickets using the fetchJiraTickets function, normalizes them with the normaliseTicket function, and returns the list of tickets along with the total count.
If there's an error during the fetch or normalization process, it logs detailed error information and responds with a 500 status and an error message, along with an empty tickets array and a total of 0 to prevent frontend issues.
*/
app.get('/api/tickets', async (req, res) => {
  try {
    const issues  = await fetchJiraTickets(50);
    let tickets = issues.map(normaliseTicket);
    const metaMap  = getAllMetadata(); // Get all metadata from the database as a Map for efficient lookup

    tickets = tickets.map(t => mergeMetadata(t, metaMap)); // Merge metadata into each ticket

    const {fixVersion, includeReleaseNotes} = req.query;
    if (fixVersion) {
      tickets = tickets.filter(t => t.fixVersion === fixVersion);
    }
    if (includeReleaseNotes) {
      tickets = tickets.filter(t => t.includeReleaseNotes === includeReleaseNotes);
    }

    if (tickets.length === 0) {
      logActivity('system', 'system', 'JIRA_FETCH_FAILED', null, 'Jira returned 0 tickets — check project key and API credentials', null);
    } else {
      logActivity('system', 'system', 'JIRA_FETCH_SUCCESS', null, `Fetched ${tickets.length} tickets from Jira`, null);
    }

    res.json({ tickets, total: tickets.length });
  } catch (err) {
    console.error('Error fetching tickets:', err.response?.data || err.message);
    logActivity('system', 'system', 'JIRA_FETCH_FAILED', null, err.message, null);
    res.status(500).json({ error: err.message, tickets: [], total: 0 });
  }
});

/*
Get single ticket: This endpoint retrieves a specific Jira ticket by its ID, normalizes it, and returns the ticket data. 
If the ticket is not found, it responds with a 404 status and a "Ticket not found" message. 
For other errors, it responds with a 500 status and the error message.
*/
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const token    = Buffer.from(`${CONFIG.JIRA_EMAIL}:${CONFIG.JIRA_API_TOKEN}`).toString('base64'); // Create a basic auth token using Jira email and API token
    const response = await axios.get(`${CONFIG.JIRA_BASE_URL}/rest/api/3/issue/${req.params.id}`, { // Make a GET request to the Jira API to fetch the issue details by ID
      headers: { Authorization: `Basic ${token}`, Accept: 'application/json' },
    });
    const ticket = normaliseTicket(response.data); // Normalize the raw Jira issue data into a consistent ticket format
    const metaMap = getAllMetadata(); // Get all metadata from the database as a Map for efficient lookup
    res.json(mergeMetadata(ticket, metaMap));
  } catch (err) {
    const status = err.response?.status === 404 ? 404 : 500;
    res.status(status).json({ error: status === 404 ? 'Ticket not found' : err.message });
  }
});

/*
Get stats: This endpoint fetches Jira tickets, normalizes them, and calculates various statistics such as total tickets, open tickets, in-progress tickets, done tickets, critical priority tickets, and counts by type (bug, story, task, other). 
It returns these statistics in a JSON response. If there's an error during the process, it responds with a 500 status and the error message.
*/
app.get('/api/stats', async (req, res) => {
  try {
    const issues  = await fetchJiraTickets(100);
    const tickets = issues.map(normaliseTicket);

    // Helper function to count tickets based on a specific key and value, used to calculate various stats
    const count = (key, val) => tickets.filter(t => t[key] === val).length;

    const fixVersions = [...new Set(tickets.map(t => t.fixVersion).filter(Boolean))].sort(); // Get unique fix versions for potential filtering in the frontend
    
    res.json({
      total     : tickets.length,
      open      : count('status', 'Open') + count('status', 'To Do'),
      inProgress: count('status', 'In Progress'),
      done      : count('status', 'Done'),
      critical  : count('priority', 'Critical') + count('priority', 'Highest'),
      byType    : {
        bug  : count('type', 'bug'),
        story: count('type', 'story'),
        task : count('type', 'task'),
        defect: count('type', 'defect'),
        other: count('type', 'other'),
      },
      fixVersions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 
This endpoint retrieves the metadata for a specific ticket by its ID. It uses the getMetadata function to fetch the metadata from the database and returns it in JSON format. 
If no metadata is found, it returns an empty object.
*/
app.get('/api/metadata/:id', (req, res) => {
  const meta = getMetadata(req.params.id);
  res.json(meta || {});
});

app.post('/api/metadata/:id', (req, res) => {
  const { role, userEmail, ...fields } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Get the user's IP address for logging purposes

  // Role check — reject if caller is not an editor
  if (!EDITOR_ROLES.includes(role)) {
    logActivity(userEmail, role, 'PERMISSION_DENIED', req.params.id, 'Attempted to edit documentation fields without permission', ip);
    return res.status(403).json({ error: 'You do not have permission to edit documentation fields.' });
  }
 
  // Map frontend field names to database column names
  const dbFields = {};
  if (fields.epicPlat         !== undefined) dbFields.epic_plat           = fields.epicPlat;
  if (fields.docsStatus       !== undefined) dbFields.docs_status         = fields.docsStatus;
  if (fields.docsToChange     !== undefined) dbFields.docs_to_change      = fields.docsToChange;
  if (fields.rnWriteup        !== undefined) dbFields.rn_writeup          = fields.rnWriteup;
  if (fields.notes            !== undefined) dbFields.notes               = fields.notes;
  if (fields.docsTeamMember   !== undefined) dbFields.docs_team_member    = fields.docsTeamMember;
  if (fields.sme              !== undefined) dbFields.sme                 = fields.sme;
  if (fields.reviewProcess    !== undefined) dbFields.review_process      = fields.reviewProcess;
  if (fields.docsChangesNoted !== undefined) dbFields.docs_changes_noted  = fields.docsChangesNoted;
  if (fields.wrikeCardAdded   !== undefined) dbFields.wrike_card_added    = fields.wrikeCardAdded;
  if (fields.includeRnSheet   !== undefined) dbFields.include_rn_sheet    = fields.includeRnSheet;
  if (fields.enteredIntoRn    !== undefined) dbFields.entered_into_rn     = fields.enteredIntoRn;
  if (fields.platLinkAdded    !== undefined) dbFields.plat_link_added     = fields.platLinkAdded;

  if (Object.keys(dbFields).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided.' });
  }
 
  const updated = upsertMetadata(req.params.id, dbFields);
  logActivity(userEmail, role, 'FIELD_EDIT', req.params.id, `Edited metadata fields: ${Object.keys(dbFields).join(', ')}`, ip);
  res.json({ success: true, metadata: updated });
});


/*
This endpoint takes a list of tickets and sends them to Gemini AI for categorization and summarization.
It constructs a prompt that describes the task to Gemini, including the rules for categorizing tickets and a formatted list of the tickets to analyze.
If successful, the original tickets are enriched with the AI's category and summary, and returned in the response.
*/
app.post('/api/ai/categorize', async (req, res) => {
  const { tickets } = req.body;
  if (!tickets?.length) return res.json({ tickets: [] });

   // Process in batches of 10 to avoid Gemini response truncation on large ticket lists
  const BATCH_SIZE = 10;
  let enriched = [...tickets];
 
  const batches = [];
  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);
    const list = batch.map((t, j) =>
    `[${i + j}] ID:${t.id} | Type:${t.type} | Title:${t.title} | Desc:${(t.description || '').slice(0, 120)}` // Format each ticket as a single line with key details for the AI to analyze
  ).join('\n');

  // Construct a prompt for Gemini AI that instructs it to categorize each ticket and provide a summary, with clear rules for categorization and a formatted list of tickets to analyze
  const prompt = `
You are a Jira ticket analyst. For each ticket below, return a JSON array (same order) where each object has:
  - "index": the number in brackets
  - "category": one of "Bug", "Defect", "Story", "Task", or "Other"
  - "summary": a 1-2 sentence plain-English summary of what this ticket is about

Rules for category:
- Bug    = software defect in existing functionality
- Defect = data or config issue (not code), or known limitation
- Story  = user-facing feature or user story
- Task   = internal work (infra, docs, testing, upgrade)
- Other  = anything that does not fit above

Tickets:
${list}

Respond ONLY with a valid JSON array, no extra text, no markdown.
`;
    batches.push(prompt);
  }

/*
Call Gemini AI with constructed prompt and handle the response.
If the response is successful, parse the JSON and enrich the original tickets with the AI's category and summary.
If there's an error during the AI call or response parsing, log the error and return the original tickets without enrichment to ensure the frontend can still display them.
*/

  try {
    const results = await Promise.all(batches.map(prompt => callGemini(prompt)));
    
    results.forEach(raw => {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      parsed.forEach(ai => {
          const idx = ai.index;
          if (enriched[idx]) {
            enriched[idx] = {
              ...enriched[idx],
              type      : (ai.category || enriched[idx].type).toLowerCase(),
              aiCategory: ai.category || null,
              aiSummary : ai.summary  || null,
            };
          }
        });
    });
    res.json({ tickets: enriched });
  } catch (err) {
    console.error('Gemini categorise error:', err.message);
    logActivity('system', 'system', 'GEMINI_CATEGORIZE_FAILED', null, err.message, null);
    res.json({ tickets }); 
  }
});

/*
This endpoint retrieves a specific Jira ticket by its ID, constructs a detailed prompt about the ticket, and sends it to Gemini AI for analysis.
The prompt instructs Gemini to provide a summary, risk level, estimated resolution time, and suggested actions based on the ticket's details.
If the AI call is successful, it parses the response and returns the analysis in JSON format.
Otherwise, it handles errors by returning appropriate status codes and error messages, ensuring the frontend can handle the response gracefully.
*/
app.get('/api/ai/ticket/:id', async (req, res) => {
  try {
    const token    = Buffer.from(`${CONFIG.JIRA_EMAIL}:${CONFIG.JIRA_API_TOKEN}`).toString('base64');
    const response = await axios.get(`${CONFIG.JIRA_BASE_URL}/rest/api/3/issue/${req.params.id}`, {
      headers: { Authorization: `Basic ${token}`, Accept: 'application/json' },
    });
    const ticket = normaliseTicket(response.data);

    const prompt = `
You are a senior software engineer AND documentation specialist reviewing a Jira ticket.
Ticket ID   : ${ticket.id}
Title       : ${ticket.title}
Type        : ${ticket.type}
Priority    : ${ticket.priority}
Status      : ${ticket.status}
Description : ${ticket.description || 'No description provided.'}

Return a JSON object with these keys:
- "aiSummary": 2-3 sentence human-readable summary
- "riskLevel": "Low" | "Medium" | "High" | "Critical"
- "estimatedResolution": e.g. "1-2 days", "3-5 days", "1 week+"
- "suggestedActions": array of 2-3 short action strings
- "docRecommendations": array of 3-5 documentation-specific recommendations for the docs team, each as a plain string. Cover what docs need to be created or updated, whether release notes are needed, what audience should be targeted (internal vs external), any terminology or screenshots that should be included, and any review steps the docs team should follow.

Respond ONLY with valid JSON, no markdown.
`;

    const raw  = await callGemini(prompt);
    const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(data);
  } catch (err) {
    const status = err.response?.status === 404 ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.post('/api/ai/release-note-suggestion', async (req, res) => {
  const { ticket } = req.body;
  if (!ticket) return res.status(400).json({ error: 'No ticket provided' });

  if (ticket.includeReleaseNotes === 'hidden') {
    return res.json({ 
      suggestion: 'This ticket is marked as "hidden" so no release notes are required.',
      publicPart: null,
      internalPart: null,
      tips: ['No action needed for hidden tickets.'],
    });
  }

  const prompt = buildReleaseNoteSuggestionPrompt(ticket);
  if (!prompt){
    return res.status(400).json({ error: 'Unable to build prompt for this ticket' });
  }

  try {
    const raw  = await callGemini(prompt);
    const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(data);
  } catch (err) {
    console.error('Release note suggestion error:', err.message);
    res.status(500).json({ error: err.message });
  } 
});

//This endpoint takes a list of tickets and sends them to Gemini AI for analysis to provide insights on team health, potential risks, and suggestions for improvement.
app.post('/api/ai/analysis', async (req, res) => {
  const { tickets } = req.body;
  if (!tickets?.length) return res.json({ summary: 'No tickets to analyse.', insights: [], suggestions: [] });

  const bugCount    = tickets.filter(t => t.type === 'bug').length;
  const defectCount = tickets.filter(t => t.type === 'defect').length;
  const storyCount  = tickets.filter(t => t.type === 'story').length;
  const taskCount   = tickets.filter(t => t.type === 'task').length;
  const criticalCount = tickets.filter(t => t.priority === 'Critical' || t.priority === 'Highest').length;
  const unassigned    = tickets.filter(t => t.assignee === 'Unassigned').length;

  // Construct a prompt for Gemini AI that provides an overview of the tickets and asks for a summary of team health, insights, and suggestions for improvement.
  const prompt = `
You are an agile team coach reviewing ${tickets.length} Jira tickets.
Stats: ${bugCount} bugs, ${defectCount} defects, ${storyCount} stories, ${taskCount} tasks, ${criticalCount} critical-priority tickets, ${unassigned} unassigned.
Top tickets: ${tickets.slice(0, 8).map(t => `${t.id}(${t.type},${t.priority})`).join(', ')}

Return a JSON object with:
- "summary": 3-4 sentence paragraph overview of team health
- "insights": array of 3-4 objects { "type": "warning"|"positive"|"info", "text": "..." }
- "suggestions": array of 3 objects { "priority": "P1"|"P2"|"P3", "action": "short title", "detail": "one sentence detail" }

Respond ONLY with valid JSON, no markdown.
`;

  try {
    const raw  = await callGemini(prompt);
    const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(data);
  } catch (err) {
    console.error('Analysis AI error:', err.message);
    logActivity('system', 'system', 'GEMINI_ANALYSIS_FAILED', null, err.message, null);
    res.status(500).json({ error: err.message });
  }
});

//This endpoint generates professional release notes in markdown format based on a list of tickets, the release version, and an optional knowledge base URL for tone and terminology reference.
app.post('/api/ai/release-notes', async (req, res) => {
  const { tickets, version, kbUrl, userEmail, userRole } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Get the user's IP address for logging purposes
  if (!tickets?.length) return res.status(400).json({ error: 'No tickets provided' });

  const kbSource = kbUrl || CONFIG.KB_URL;
  const ReleaseStyleURL = CONFIG.KB_RELEASE_URL;

  const activeTickets = tickets.filter(t => t.includeReleaseNotes !== 'hidden');

  const publicTickets = activeTickets.filter(t => t.includeReleaseNotes === 'public');
  const internalTickets = activeTickets.filter(t => t.includeReleaseNotes === 'internal');
  const nullTickets = activeTickets.filter(t => t.includeReleaseNotes === 'null');

  const bugs     = activeTickets.filter(t => t.type === 'bug' || t.type === 'defect');
  const stories  = activeTickets.filter(t => t.type === 'story');
  const tasks    = activeTickets.filter(t => t.type === 'task');
  const others   = activeTickets.filter(t => t.type === 'other');

  // Helper function to format a list of tickets into a markdown bullet list for the AI prompt, showing the ticket ID and title. If the list is empty, it returns "(none)".
  const fmt      = (arr) => arr.map(t => `- ${t.id}: ${t.title}`).join('\n') || '  (none)'; 
  const fmtFull = (arr) => arr.map(t => `- ${t.id} [${t.includeReleaseNotes}]:  ${t.title}`).join('\n') || '  (none)';

  const prompt = `
You are a technical writer creating professional release notes for version "${version || 'v1.0'}".

Release notes style guide (REQUIRED - follow this for structure, tone, and formatting): ${ReleaseStyleURL}

Company knowledge base URL (use for correct product names, feature terminology and any product-specific phrasing): ${kbSource}

---TICKET GROUPING BY AUDIENCE---

PUBLIC tickets (safe for customers - use friendly, non-technical language):
${fmt(publicTickets)}

INTERNAL tickets (employees only - include both public summary AND internal details):
${fmt(internalTickets)}

UNSET / NULL tickets (no audience specified - use writer's discretion; lean toward public-safe):
${fmt(nullTickets)}

---TICKET GROUPING BY TYPE---
Bug Fixes & Defects : ${fmt(bugs)}

New Features / Stories : ${fmt(stories)}

Tasks / Improvements : ${fmt(tasks)}

Other : ${fmt(others)}

Write two sections:
## PUBLIC RELEASE NOTES
Professional, customer-facing notes for "${version || 'v1.0'}". Structure:
1. ### Overview  (1 short paragraph)
2. ### Bug Fixes  (bullet list, friendly language)
3. ### New Features  (bullet list)
4. ### Improvements  (bullet list)
Include only PUBLIC and NULL tickets here. Exclude all INTERNAL-only details

## INTERNAL RELEASE NOTES
Employee-facing notes for "${version || 'v1.0'}". Structure:
1. ### Internal Overview (brief paragraph about what changed operationally)
2. ### Internal Notes (bullet list with technical detail for INTERNAL tickets)
3. ### Action Items (any steps employees need to take, e.g. config changes, deployments, customer communication)

Follow the release notes style guide for tone, structure, and formatting. Use the knowledge base URL for any product-specific terminology or phrasing.
Return ONLY the markdown text, no extra commentary.
`.trim();

  try {
    const notes = await callGemini(prompt);
    logActivity(userEmail, userRole, 'RELEASE_NOTES_GENERATED', null, `Generated release notes for version ${version || 'v1.0'} with ${tickets.length} tickets`, ip);
    res.json({ releaseNotes: notes });
  } catch (err) {
    console.error('Release notes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Maps CSV column headers to database column names for upserting metadata. The 'PLAT' column is used as the unique identifier (ticket_id) and is not included in the upsert fields.
const COLUMN_MAP = {
  'PLAT'                                                                          : 'ticket_id',
  'Epic PLAT'                                                                     : 'epic_plat',
  'Status'                                                                        : 'docs_status',
  'Docs to Change'                                                                : 'docs_to_change',
  'Release Notes Writeup'                                                         : 'rn_writeup',
  'Notes'                                                                         : 'notes',
  'Docs Team Member'                                                              : 'docs_team_member',
  'SME'                                                                           : 'sme',
  'Review Process'                                                                : 'review_process',
  'Are all docs changes for this ticket noted in the "Docs to Change" column?'   : 'docs_changes_noted',
  'Is this ticket added to the Wrike card for all "Docs to Change" articles?'    : 'wrike_card_added',
  'Include Release Notes'                                                         : 'include_rn_sheet',
  'Entered into Release Notes?'                                                   : 'entered_into_rn',
  'PLAT Number/Link Added to Internal Version?'                                  : 'plat_link_added',
};
 
// Maps db column names back to sheet column headers for writing back to the sheet
const REVERSE_COLUMN_MAP = Object.fromEntries(
  Object.entries(COLUMN_MAP).map(([csv, db]) => [db, csv])
);

// Simple CSV parser that handles quoted fields with commas and newlines. Returns an array of lines, where each line is an array of fields.
function parseCSV(raw) {
  const lines = []; let line = []; let field = ''; let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i], next = raw[i + 1];
    if (inQuote) {
      if      (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')                 { inQuote = false; }
      else                                 { field += ch; }
    } else {
      if      (ch === '"')  { inQuote = true; }
      else if (ch === ',')  { line.push(field); field = ''; }
      else if (ch === '\n') { line.push(field); lines.push(line); line = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else                  { field += ch; }
    }
  }
  if (field || line.length) { line.push(field); lines.push(line); }
  return lines;
}
 
// POST /api/import-csv — parses uploaded CSV and upserts into database
app.post('/api/import-csv', (req, res) => {
  const { csvContent, role, userEmail } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Get the user's IP address for logging purposes

  if (!EDITOR_ROLES.includes(role)){
    logActivity(userEmail, role, 'PERMISSION_DENIED', null, 'Attempted to import CSV without permission', ip);
    return res.status(403).json({ error: 'Permission denied.' });
  }
  if (!csvContent) {
    return res.status(400).json({ error: 'No CSV content provided.' });
  }

  // Parse the CSV content, map columns to database fields, and upsert metadata for each ticket. Logs the number of imported and skipped records, and handles errors gracefully.
  try {
    const lines = parseCSV(csvContent);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV appears to be empty.' });
    const headers = lines[0].map(h => h.trim());
    let imported = 0, skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 2) continue;
      const record = {};
      headers.forEach((h, idx) => { record[h] = (line[idx] || '').trim(); });
      if (!record['PLAT']) { skipped++; continue; }
      const dbRow = {};
      Object.entries(COLUMN_MAP).forEach(([csvCol, dbCol]) => {
        if (dbCol !== 'ticket_id') dbRow[dbCol] = record[csvCol] || null;
      });
      upsertMetadata(record['PLAT'], dbRow);
      imported++;
    }
    logActivity(userEmail, role, 'CSV_IMPORT', null, `Imported ${imported} tickets from CSV, (${skipped} skipped)`, ip);
    res.json({ success: true, imported, skipped, message: `✅ Imported ${imported} tickets (${skipped} skipped)` });
  } catch (err) {
    console.error('CSV import error:', err.message);
    logActivity(userEmail, role, 'CSV_IMPORT_FAILURE', null, err.message, ip);
    res.status(500).json({ error: err.message });
  }
});

/* 
The following code handles Google Sheets integration, allowing the application to sync ticket metadata with a Google Sheet. It includes functions to extract the Sheet ID from a URL, get the active Sheet ID and tab from settings or environment variables, and authenticate with Google APIs. 
It also defines endpoints to get and set the Sheet settings, sync data from the Sheet into the database, and sync individual ticket changes back to the Sheet. 
The COLUMN_MAP defines how CSV columns map to database fields for syncing purposes.
*/

const { google } = require('googleapis');
const nodePath   = require('path');
const { log } = require('console');
 
// Extracts the Sheet ID from a full Google Sheets URL or returns the value as-is if it's already an ID
function extractSheetId(urlOrId) {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}
 
// Returns the currently saved Sheet ID from the database, falling back to .env
function getActiveSheetId() {
  const saved = getSetting('google_sheet_id');
  return saved || process.env.GOOGLE_SHEET_ID || null;
}
 
// Returns the currently saved Sheet tab name from the database, falling back to .env or defaulting to 'Sheet1'
function getActiveSheetTab() {
  const saved = getSetting('google_sheet_tab');
  return saved || process.env.GOOGLE_SHEET_TAB || 'Sheet1';
}

// Authenticates with Google APIs using a service account key file and the necessary scopes for Sheets and Drive access
function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    keyFile: nodePath.join(__dirname, 'google-credentials.json'),
    scopes : [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}
 
// GET /api/sheet-settings — returns the currently saved Sheet URL and tab
app.get('/api/sheet-settings', (req, res) => {
  res.json({
    sheetUrl: getSetting('google_sheet_url') || '',
    sheetTab: getActiveSheetTab(),
  });
});
 
// POST /api/sheet-settings — saves a new Sheet URL (and optional tab) to the database
app.post('/api/sheet-settings', (req, res) => {
  const { sheetUrl, sheetTab, role } = req.body;
  if (!EDITOR_ROLES.includes(role)) return res.status(403).json({ error: 'Permission denied.' });
  if (!sheetUrl) return res.status(400).json({ error: 'Sheet URL is required.' });
 
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return res.status(400).json({ error: 'Could not extract Sheet ID from URL.' });
 
  setSetting('google_sheet_url', sheetUrl);
  setSetting('google_sheet_id',  sheetId);
  if (sheetTab) setSetting('google_sheet_tab', sheetTab);
 
  res.json({ success: true, sheetId, message: '✅ Sheet URL saved successfully.' });
});
 
// GET /api/sync-from-sheet — pulls all rows from the Google Sheet into the database
app.get('/api/sync-from-sheet', async (req, res) => {
  const sheetId  = getActiveSheetId();
  const sheetTab = getActiveSheetTab();
  const userEmail = req.query.userEmail || 'unknown';
  const userRole = req.query.userRole || 'unknown';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!sheetId) return res.status(400).json({ error: 'No Google Sheet URL configured. Click Sync Sheet to set one.' });
 
  try {
    const auth     = getGoogleAuth();
    const sheets   = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range        : sheetTab,
    });
 
    const rows = response.data.values || [];

    if (rows.length < 2) return res.status(400).json({ error: 'Sheet appears to be empty.' });
 
    const headers = rows[0].map(h => (h || '').trim());
    let imported = 0, skipped = 0;
 
    for (let i = 1; i < rows.length; i++) {
      const record = {};
      headers.forEach((h, idx) => { record[h] = (rows[i][idx] || '').trim(); });
      if (!record['PLAT']) { skipped++; continue; }
      const dbRow = {};
      Object.entries(COLUMN_MAP).forEach(([csvCol, dbCol]) => {
        if (dbCol !== 'ticket_id') dbRow[dbCol] = record[csvCol] || null;
      });
      upsertMetadata(record['PLAT'], dbRow);
      imported++;
    }
    
    logActivity(userEmail, userRole, 'SHEET_SYNC_IN', null, `Synced ${imported} tickets from Google Sheet (${skipped} skipped)`, ip);
    res.json({ success: true, imported, skipped, message: `✅ Synced ${imported} tickets from Google Sheet` });
  } catch (err) {
    console.error('Sync from sheet error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
 
// POST /api/sync-to-sheet — writes one ticket's changes back to the Google Sheet
app.post('/api/sync-to-sheet', async (req, res) => {
  const { ticketId, fields, role, userEmail } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!EDITOR_ROLES.includes(role)){
    logActivity(userEmail, role, 'PERMISSION_DENIED', null, 'Attempted to sync ticket to Google Sheet without permission', ip);
    return res.status(403).json({ error: 'Permission denied.' });
  }

  if (!ticketId || !fields) {
    return res.status(400).json({ error: 'ticketId and fields are required.' });
  }

  const sheetId  = getActiveSheetId();
  const sheetTab = getActiveSheetTab();
 
  if (!sheetId) return res.status(400).json({ error: 'No Google Sheet URL configured.' });
 
  try {
    const auth     = getGoogleAuth();
    const sheets   = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: sheetTab });
    const rows     = response.data.values || [];

    if (rows.length < 2) return res.status(404).json({ error: 'Sheet is empty.' });
 
    const headers = rows[0].map(h => (h || '').trim());
    const platIdx = headers.indexOf('PLAT');

    if (platIdx === -1) return res.status(400).json({ error: 'PLAT column not found in sheet.' });

    const rowIdx = rows.findIndex((row, i) => i > 0 && (row[platIdx] || '').trim() === ticketId);
    if (rowIdx === -1) return res.status(404).json({ error: `${ticketId} not found in sheet.` });
 
    const updatedRow = [...(rows[rowIdx] || [])];
 
    // Fields come in as camelCase (docsStatus) — convert to snake_case (docs_status)
    // so REVERSE_COLUMN_MAP can find the matching sheet column header
    const camelToSnake = str => str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
 
    Object.entries(fields).forEach(([key, value]) => {
      const snakeKey = camelToSnake(key);
      const sheetCol = REVERSE_COLUMN_MAP[snakeKey];
      if (!sheetCol) return;
      const colIdx = headers.indexOf(sheetCol);
      if (colIdx !== -1) updatedRow[colIdx] = value || '';
    });
 
    await sheets.spreadsheets.values.update({
      spreadsheetId    : sheetId,
      range            : `${sheetTab}!A${rowIdx + 1}`,
      valueInputOption : 'RAW',
      requestBody      : { values: [updatedRow] },
    });
 
    logActivity(userEmail, role, 'SHEET_SYNC_OUT', ticketId, `Synced fields to Google Sheet row ${rowIdx + 1}`, ip);
    res.json({ success: true, message: `✅ ${ticketId} synced to Google Sheet` });
  } catch (err) {
    console.error('Sync to sheet error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity-log — returns recent activity for Senior Developer and QA Engineer
app.get('/api/activity-log', (req, res) => {
  const { role } = req.query;
  const VIEWER_ROLES = ['Senior Developer', 'QA Engineer'];
  if (!VIEWER_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const logs = getActivityLog(200);
  res.json({ logs });
});

// POST /api/ai/query — accepts a plain text question and returns a Gemini answer with a 15s server-side timeout
app.post('/api/ai/query', async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'No question provided.' });
 
  if (!CONFIG.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured.' });
  }

  const prompt = `
You are a helpful assistant for a Jira project management dashboard.
Answer the following question clearly and concisely in plain text (no markdown).
 
Question: ${question.trim()}
`.trim();
 
  // Race the Gemini call against a 15-second timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), 15000)
  );

    const geminiCall = (async () => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    });
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  })();
 
  try {
    const answer = await Promise.race([geminiCall, timeoutPromise]);
    res.json({ answer });
  } catch (err) {
    if (err.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'TIMEOUT' });
    }
    const detail = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.error('AI query error:', detail);
    res.status(500).json({ error: detail });
  }
});

//Start the backend server on the specified port and log a message indicating the API is running and the URL to access it.
const PORT = process.env.PORT || 5000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to initialise database:', err.message);
  process.exit(1);
});