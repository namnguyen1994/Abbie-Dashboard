const express = require('express'); //Import Express framework to create the API server
const cors = require('cors');  //Import CORS middleware to enable cross-origin requests from the frontend
const app = express(); //Create Express app instances

//Setup middleware for CORS and JSON parsing so that every incoming request can be handled properly, allowing the frontend to communicate with this backend API without issues.
app.use(cors()); 
app.use(express.json());

/*______________________________________
  Mock Data for Users and Tickets
  - In a real application, this data would come from a database or external API (like Jira).
  - For this demo, we are hardcoding some sample users and tickets to simulate the backend responses.
________________________________________*/
const MOCK_USERS = [
  { id: 'user-1', email: 'nam.nguyen@datamir.com', password: 'password123', name: 'Nam Nguyen', avatar: 'NN', role: 'Senior Developer' },
  { id: 'user-2', email: 'abby.moyer@datamir.com', password: 'password123', name: 'Abby Moyer', avatar: 'AM', role: 'Director of Documentation' },
  { id: 'user-3', email: 'andrea.cossio@datamir.com', password: 'password123', name: 'Andrea Cossio', avatar: 'AC', role: 'UX Designer' },
];

const MOCK_TICKETS = [
  { id: 'BUG-101', key: 'BUG-101', type: 'Bug', priority: 'Critical', summary: 'Login page crashes on Safari 16.x when 2FA is enabled', description: 'Users on macOS Ventura with Safari 16.x experience a hard crash when attempting to complete 2-factor authentication flow.', status: 'In Progress', assignee: 'Nam Nguyen', reporter: 'Abby Moyer', created: '2024-01-15', updated: '2024-01-20', sprint: 'Sprint 24', storyPoints: 5, labels: ['authentication', 'safari', 'critical-path'], comments: 3, attachments: 2 },
  { id: 'BUG-98', key: 'BUG-98', type: 'Bug', priority: 'High', summary: 'Data export generates malformed CSV when special characters present', description: 'The CSV export function fails to properly escape commas and quotation marks in field values.', status: 'Open', assignee: 'Unassigned', reporter: 'Abby Moyer', created: '2024-01-12', updated: '2024-01-18', sprint: 'Sprint 24', storyPoints: 3, labels: ['export', 'csv', 'data'], comments: 1, attachments: 0 },
  { id: 'BUG-95', key: 'BUG-95', type: 'Bug', priority: 'Medium', summary: 'Notification bell count not resetting after viewing notifications', description: 'The unread notification counter persists even after the user has opened and viewed all notifications.', status: 'In Review', assignee: 'Nam Nguyen', reporter: 'Mike Chen', created: '2024-01-10', updated: '2024-01-19', sprint: 'Sprint 23', storyPoints: 2, labels: ['notifications', 'ui'], comments: 5, attachments: 1 },
  { id: 'BUG-90', key: 'BUG-90', type: 'Bug', priority: 'Low', summary: 'Tooltip misalignment on dashboard widgets in Firefox', description: 'Hover tooltips are rendering 20px to the right of their intended position in Firefox 121.', status: 'Done', assignee: 'Andrea Cossio', reporter: 'Abby Moyer', created: '2024-01-05', updated: '2024-01-15', sprint: 'Sprint 23', storyPoints: 1, labels: ['firefox', 'tooltip', 'css'], comments: 2, attachments: 0 },
  { id: 'STORY-45', key: 'STORY-45', type: 'Story', priority: 'High', summary: 'As a user, I want to filter dashboard by date range to analyze trends', description: 'Implement a date range picker on the main dashboard that filters all widget data accordingly.', status: 'In Progress', assignee: 'Andrea Cossio', reporter: 'Abby Moyer', created: '2024-01-08', updated: '2024-01-20', sprint: 'Sprint 24', storyPoints: 8, labels: ['dashboard', 'analytics', 'filters'], comments: 7, attachments: 3 },
  { id: 'STORY-42', key: 'STORY-42', type: 'Story', priority: 'Medium', summary: 'As an admin, I want to manage team permissions via a role matrix', description: 'Build a permission management interface allowing admins to assign granular permissions to roles.', status: 'Open', assignee: 'Nam Nguyen', reporter: 'Alex Johnson', created: '2024-01-06', updated: '2024-01-16', sprint: 'Sprint 24', storyPoints: 13, labels: ['admin', 'permissions', 'rbac'], comments: 4, attachments: 1 },
  { id: 'STORY-38', key: 'STORY-38', type: 'Story', priority: 'High', summary: 'As a user, I want real-time collaboration indicators on shared documents', description: 'Show live cursors and user presence indicators when multiple users are editing the same document.', status: 'Done', assignee: 'Mike Chen', reporter: 'Sarah Lee', created: '2023-12-20', updated: '2024-01-10', sprint: 'Sprint 23', storyPoints: 10, labels: ['collaboration', 'real-time', 'websocket'], comments: 12, attachments: 4 },
  { id: 'TASK-201', key: 'TASK-201', type: 'Task', priority: 'Medium', summary: 'Upgrade Node.js runtime to v20 LTS across all services', description: 'Migrate all backend microservices from Node.js 18 to Node.js 20 LTS. Update Dockerfiles, CI/CD pipelines.', status: 'In Progress', assignee: 'Vy Lam', reporter: 'Maryam Rehman', created: '2024-01-14', updated: '2024-01-21', sprint: 'Sprint 24', storyPoints: 5, labels: ['infrastructure', 'nodejs', 'upgrade'], comments: 2, attachments: 0 },
  { id: 'TASK-198', key: 'TASK-198', type: 'Task', priority: 'Low', summary: 'Write unit tests for UserAuthService covering edge cases', description: 'Achieve 90%+ test coverage for the UserAuthService module, focusing on edge cases.', status: 'Open', assignee: 'Julia Jin', reporter: 'Josh Moyer', created: '2024-01-11', updated: '2024-01-18', sprint: 'Sprint 24', storyPoints: 3, labels: ['testing', 'unit-tests', 'auth'], comments: 1, attachments: 0 },
  { id: 'TASK-195', key: 'TASK-195', type: 'Task', priority: 'High', summary: 'Set up Datadog APM monitoring for production environment', description: 'Integrate Datadog APM agent, configure custom dashboards for key SLIs and alerting rules.', status: 'In Review', assignee: 'Mike Chen', reporter: 'Emma Bruce', created: '2024-01-09', updated: '2024-01-20', sprint: 'Sprint 23', storyPoints: 8, labels: ['monitoring', 'devops', 'datadog'], comments: 6, attachments: 2 },
  { id: 'TASK-190', key: 'TASK-190', type: 'Task', priority: 'Medium', summary: 'Refactor database connection pool configuration', description: 'Review and optimize PostgreSQL connection pool settings to reduce connection overhead.', status: 'Done', assignee: 'Nam Nguyen', reporter: 'Josh Moyer', created: '2024-01-03', updated: '2024-01-12', sprint: 'Sprint 23', storyPoints: 4, labels: ['database', 'performance', 'postgresql'], comments: 3, attachments: 1 },
  { id: 'EPIC-12', key: 'EPIC-12', type: 'Other', priority: 'High', summary: 'Q1 2024 Performance Optimization Initiative', description: 'Epic tracking all performance improvement work for Q1. Target: reduce P95 API latency by 40%.', status: 'In Progress', assignee: 'Maryam Rehman', reporter: 'Vy Lam', created: '2024-01-01', updated: '2024-01-21', sprint: 'Sprint 24', storyPoints: 40, labels: ['epic', 'performance', 'q1-2024'], comments: 15, attachments: 5 },
  { id: 'DOC-55', key: 'DOC-55', type: 'Other', priority: 'Low', summary: 'Update API documentation for v2.1 endpoints', description: 'Revise Swagger/OpenAPI specs for all new endpoints introduced in the v2.1 release.', status: 'Open', assignee: 'Unassigned', reporter: 'Julia Jin', created: '2024-01-13', updated: '2024-01-17', sprint: 'Sprint 24', storyPoints: 2, labels: ['documentation', 'api'], comments: 0, attachments: 0 },
];

/*______________________________________
  Helper function to generate AI analysis based on the current tickets.
  - This simulates what an AI might return after analyzing the ticket data, providing insights and suggestions for the team.
  - In a real application, this would involve calling an AI service with the ticket data and processing the response.
  - For this demo, we are hardcoding the analysis logic to return consistent insights based on the mock data.
________________________________________*/
const generateAIAnalysis = (tickets) => {
  const bugCount = tickets.filter(t => t.type === 'Bug').length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const criticalBugs = tickets.filter(t => t.type === 'Bug' && t.priority === 'Critical').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  return {
    summary: `Your team is managing ${tickets.length} tickets across ${new Set(tickets.map(t => t.sprint)).size} sprints. With ${criticalBugs} critical bug${criticalBugs !== 1 ? 's' : ''} requiring immediate attention, the overall workload is moderately high. ${inProgressCount} tickets are actively in progress, indicating good team velocity.`,
    insights: [
      { type: 'warning', title: 'Critical Bug Alert', detail: 'BUG-101 (Safari 2FA crash) is a critical-path issue affecting user authentication. Recommend prioritizing resolution this sprint to prevent user churn.' },
      { type: 'info', title: 'Story Point Distribution', detail: 'STORY-42 carries 13 story points — the highest in the current sprint. Consider breaking it into smaller subtasks to maintain predictable velocity.' },
      { type: 'success', title: 'Sprint Velocity', detail: 'Sprint 23 closed with 17 completed story points. Current Sprint 24 is tracking similarly, suggesting consistent team performance.' },
      { type: 'warning', title: 'Unassigned Tickets', detail: `${tickets.filter(t => t.assignee === 'Unassigned').length} ticket(s) are unassigned. Assign owners to prevent blockers.` },
    ],
    suggestions: [
      'Conduct a 30-minute triage session to address the 2 unassigned tickets and prevent sprint spillover.',
      'Consider pairing a senior dev with BUG-101 given its critical priority and authentication impact.',
      'The Q1 Performance Epic (EPIC-12) has 40 story points — break down into sprint-sized milestones with clear owners.',
      'Increase test coverage task (TASK-198) should be prioritized alongside feature work to maintain code health.',
      'Schedule a retrospective on the tooltip bug pattern — similar CSS issues may exist in other browsers.',
    ],
    riskScore: criticalBugs > 0 ? 72 : 45,
    velocityTrend: 'stable',
  };
};

/*______________________________________
  API Routes
  - Receives the user's login credentials and checks them against the mock user data. 
    - If valid, it returns a mock JWT token and user info (excluding the password). 
    - If invalid, it returns a 401 error with a message prompting the user to check their Jira email and password.
    - Handles user logout by simply returning a success message 
*/
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;  //Extract email and password from the request body
  const user = MOCK_USERS.find(u => u.email === email && u.password === password); //Find a user in the mock data that matches the provided email and password
  if (!user) return res.status(401).json({ error: 'Invalid credentials. Please check your Jira email and password.' }); //If no matching user is found, return a 401 Unauthorized response with an error message
  const { password: _, ...safeUser } = user; //Destructure the user object to exclude the password before sending it back in the response
  res.json({ token: `mock-jwt-token-${user.id}`, user: safeUser }); //If a matching user is found, return a JSON response containing a mock JWT token and the user information (excluding the password)
});

/*______________________________________
This route handle the logout action.
    If successful, it returns a JSON response with a message confirming that the user has been logged out successfully.
*/
app.post('/api/auth/logout', (req, res) => res.json({ message: 'Logged out successfully' }));

/*______________________________________
    This route handles fetching tickets with optional filtering based on query parameters.
    - It extracts the type, status, sprint, and search query parameters from the request.
    - It filters the mock tickets based on the provided parameters, allowing for flexible querying of the ticket data.
    - Finally, it returns a JSON response containing the filtered list of tickets and the total count of those tickets.
*/
app.get('/api/tickets', (req, res) => {
  const { type, status, sprint, search } = req.query;
  let filtered = [...MOCK_TICKETS];
  if (type && type !== 'All') filtered = filtered.filter(t => t.type === type);
  if (status && status !== 'All') filtered = filtered.filter(t => t.status === status);
  if (sprint && sprint !== 'All') filtered = filtered.filter(t => t.sprint === sprint);
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(t => t.summary.toLowerCase().includes(q) || t.key.toLowerCase().includes(q)); }
  res.json({ tickets: filtered, total: filtered.length });
});

/*______________________________________
    This route handles fetching a specific ticket by its ID.
    - It extracts the ticket ID from the route parameters and searches for a matching ticket in the mock data.
    - If a ticket with the specified ID is found, it returns that ticket as a JSON response.
    - If no matching ticket is found, it returns a 404 Not Found response with an error message indicating that the ticket was not found.
*/
app.get('/api/tickets/:id', (req, res) => {
  const ticket = MOCK_TICKETS.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

/*______________________________________
    This route handles fetching aggregated statistics about the tickets.
    - It calculates the total number of tickets and counts how many tickets fall into each type, status, and priority category.
    - It also provides a list of sprints and calculates the completion rate based on how many tickets are marked as 'Done' compared to the total number of tickets.
    - Finally, it returns all this aggregated information as a JSON response.
*/
app.get('/api/stats', (req, res) => {
  const byType = {}, byStatus = {}, byPriority = {};
  MOCK_TICKETS.forEach(t => {
    byType[t.type] = (byType[t.type] || 0) + 1; //Count the number of tickets for each type (e.g., Bug, Story, Task) and store it in the byType object
    byStatus[t.status] = (byStatus[t.status] || 0) + 1; //Count the number of tickets for each status (e.g., Open, In Progress, Done) and store it in the byStatus object   
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; //Count the number of tickets for each priority level (e.g., Low, Medium, High) and store it in the byPriority object
  });
  res.json({ total: MOCK_TICKETS.length, byType, byStatus, byPriority, sprints: ['Sprint 23', 'Sprint 24'], completionRate: Math.round((byStatus['Done'] || 0) / MOCK_TICKETS.length * 100) }); //Return a JSON response containing the total number of tickets, the counts by type, status, and priority, a list of sprints, and the completion rate calculated as the percentage of tickets marked as 'Done' out of the total number of tickets.
});

/*______________________________________
    This route handles fetching AI-generated analysis based on the current tickets.
    - It simulates a delay to mimic the time it would take for an AI service to process the ticket data and generate insights.
    - It calls the generateAIAnalysis helper function, passing in the mock tickets, to get a structured analysis that includes a summary, insights, suggestions, a risk score, and a velocity trend.
    - Finally, it returns this AI-generated analysis as a JSON response.
________________________________________*/
app.get('/api/ai/analysis', (req, res) => {
  setTimeout(() => res.json(generateAIAnalysis(MOCK_TICKETS)), 800); //Simulate a delay of 800 milliseconds before sending the AI analysis response to mimic processing time
});

/*______________________________________
    This route handles fetching AI-generated suggestions for a specific ticket based on its ID.
    - It extracts the ticket ID from the request body and searches for a matching ticket in the mock data.
    - If a ticket with the specified ID is found, it generates suggestions based on the ticket type and other attributes, simulating what an AI might recommend for that ticket.
*/
app.post('/api/ai/ticket-suggestion', (req, res) => {
  const { ticketId } = req.body;
  const ticket = MOCK_TICKETS.find(t => t.id === ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const suggestions = {
    Bug: ['Reproduce in a clean environment to confirm the issue is not environment-specific.', 'Add a regression test to the test suite once resolved to prevent recurrence.', 'Check if related issues exist in the backlog that may share the same root cause.'],
    Story: ['Break this story into smaller sub-tasks (≤5 story points each) for better sprint tracking.', 'Ensure acceptance criteria are clearly defined before development begins.', 'Consider a spike ticket to validate technical approach if uncertainty exists.'],
    Task: ['Document the completion criteria clearly before starting.', 'Identify dependencies and communicate them to the team lead.', 'Schedule a quick review checkpoint at 50% completion.'],
    Other: ['Link related tickets to this item for full traceability.', 'Set a target completion date to avoid indefinite scope creep.', 'Assign a clear owner even for non-standard ticket types.'],
  };
  //Simulate a delay of 600 milliseconds before sending the AI suggestions response to mimic processing time, and return a JSON response containing the ticket ID, AI-generated suggestions based on the ticket type, an estimated effort recommendation based on the story points, and a risk level assessment based on the ticket priority.
  setTimeout(() => res.json({ ticketId, aiSuggestions: suggestions[ticket.type] || suggestions.Other, estimatedEffort: ticket.storyPoints > 8 ? 'Consider splitting this ticket' : 'Effort seems appropriate', riskLevel: ticket.priority === 'Critical' ? 'High' : ticket.priority === 'High' ? 'Medium' : 'Low' }), 600);
});

//Start the server and listen on the specified port (defaulting to 5000 if not set in the environment variables). Log a message to the console indicating that the API is running and on which port it is accessible.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));