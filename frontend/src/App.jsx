import React, { useState, useEffect } from 'react'; // React core imports for state management and side effects
import './App.css'; // Main stylesheet for the app, containing all the styles for components and layout

/* Utility functions to convert ticket properties into visual badges and CSS classes. These functions help maintain a consistent look and feel across the app by mapping ticket types, priorities, and statuses to specific icons and styles. For example, typeBadge returns an emoji based on the ticket type, while priorityClass and statusClass return CSS class names that can be used to style elements accordingly. insightIcon maps AI insight types to corresponding emojis for quick visual identification. */
function typeBadge(type) {
  const labels = { bug: '🐛', story: '📖', task: '✅', other: '📦' };
  return labels[type] || '•';
}
function priorityClass(p) { return { Critical: 'p-critical', High: 'p-high', Medium: 'p-medium', Low: 'p-low' }[p] || ''; }
function statusClass(s)   { return { 'Open': 's-open', 'In Progress': 's-in-progress', 'Done': 's-done' }[s] || ''; }
function typeClass(t)     { return { bug: 'type-bug', story: 'type-story', task: 'type-task', other: 'type-other' }[t] || ''; }
function insightIcon(t)   { return { warning: '⚠️', positive: '✅', info: 'ℹ️' }[t] || '•'; }

/* Custom DonutChart component that takes in data and renders an SVG donut chart.*/
function DonutChart({ data, colors, size = 120, stroke = 22 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const offset = circ - (acc / total) * circ;
    acc += d.value;
    return { ...d, dash, gap, offset, color: colors[i % colors.length] };
  });

// The SVG consists of multiple <circle> elements, each representing a segment of the donut chart. The stroke-dasharray and stroke-dashoffset properties are used to create the visual effect of the segments.
  return (
    <svg width={size} height={size} className="donut-svg" style={{ transform: 'rotate(-90deg)' }}>
      {segments.map((seg, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={seg.color} strokeWidth={stroke}
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={seg.offset}
          style={{ transition: 'stroke-dasharray .6s ease' }} />
      ))}
    </svg>
  );
}

/* LoginPage component that renders the login form and handles user authentication. It also includes a quick-login panel with demo accounts for easy access during development or testing. The component manages its own state for form inputs, loading status, error messages, and the list of demo users. It communicates with the backend API to perform login and fetch demo users. */
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  // Load demo users from backend for the quick-login panel
  useEffect(() => {
    fetch('/api/auth/users') // Calls the backend endpoint to retrieve a list of demo users. This allows you to easily log in with predefined accounts without needing to create them manually.
      .then(res => res.json()) // Parses the JSON response from the backend, which should contain a list of demo users.
      .then(data => setDemoUsers(data.users || [])) // Updates the demoUsers state with the fetched users, or an empty array if the response doesn't contain a users field.
      .catch(() => {
        // Fallback demo users if endpoint not available
        setDemoUsers([
          { id: 'u1', email: 'nam.nguyen@datamir.com', password: 'password123', name: 'Nam Nguyen', avatar: 'NN', role: 'Senior Developer' },
          { id: 'u2', email: 'andrea.cossio@datamir.com',   password: 'password123', name: 'Andrea Cossio',   avatar: 'AC', role: 'Product Manager' },
          { id: 'u3', email: 'josh.moyer@datamir.com',  password: 'password123', name: 'Josh Moyer',  avatar: 'JM', role: 'QA Engineer' },
        ]);
      });
  }, []);

  /* The submit function is responsible for handling the login process when the user submits the form. It sends a POST request to the backend API with the email and password entered by the user. If the login is successful, it calls the onLogin callback with the user data returned from the backend. If there is an error during login, it updates the error state to display an appropriate message to the user. The function also manages the loading state to provide feedback while the login request is being processed. */
  const submit = async (e) => {
    e && e.preventDefault(); // Prevents the default form submission behavior, which would cause a page reload. This allows the login process to be handled entirely through JavaScript and provides a smoother user experience.
    setError(''); // Clears any existing error messages before attempting a new login. This ensures that the user sees only relevant error messages related to their current login attempt.
    setLoading(true);
    try { // Sends a POST request to the backend API at the /api/auth/login endpoint with the email and password as JSON in the request body. The backend will validate the credentials and respond with user data if the login is successful, or an error message if it fails.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json(); // Parses the JSON response from the backend. If the login is successful, the response should contain a user object. If the login fails, it may contain an error message.
      if (res.ok && data.user) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Invalid credentials. Try the demo accounts below.');
      }
    } catch (err) { // Catches any network errors or unexpected issues during the fetch request and updates the error state with a generic message. This helps inform the user that there was a problem connecting to the server, which could be due to the backend not running or other network issues.
      setError('Cannot reach the server. Make sure your backend is running.');
    }
    setLoading(false);
  };

  // The fillDemo function is a helper function that populates the login form with the email and password of a selected demo user. This allows users to quickly log in using predefined demo accounts without having to manually enter the credentials. When a demo account is clicked, this function is called with the corresponding user object, and it updates the email and password state variables accordingly.
  const fillDemo = (u) => { setEmail(u.email); setPass(u.password || 'password123'); };

  // The component's return statement renders the login page UI, including the login form, error messages, and the quick-login panel with demo accounts. The form includes input fields for email and password, and a submit button that triggers the login process. If there are any errors during login, they are displayed above the form. Below the form, there is a section for demo accounts that allows users to quickly fill in the login form with predefined credentials by clicking on a demo account.
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/dataminr_logo.webp" alt="Datamir" className="sidebar-logo-icon" />
          <span className="login-logo-text">Datamir<span>Dashboard</span></span>
        </div>
        <h1 className="login-h">Welcome back</h1>
        <p className="login-subtitle">Sign in with your Jira account to continue</p>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className="form-input" type="email" placeholder="you@company.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? '🔄 Signing in…' : '→ Sign in with Jira'}
        </button>

        <div className="login-divider"><span>demo accounts</span></div>

        <div className="demo-accounts">
          <h4>🎮 Quick Login</h4>
          {demoUsers.map(u => (
            <div key={u.id} className="demo-account" onClick={() => fillDemo(u)}>
              <div className="demo-avatar">{u.avatar}</div>
              <div className="demo-info">
                <div className="demo-name">{u.name}</div>
                <div className="demo-role">{u.role}</div>
              </div>
              <div className="demo-fill">Fill ›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* TicketModal component that displays detailed information about a selected ticket, including its properties, description, and AI-generated insights. It fetches additional AI analysis for the specific ticket from the backend when the modal is opened. The modal can be closed by clicking outside of it or on the close button. The component manages its own state for the AI data and loading status while fetching the analysis. */
function TicketModal({ ticket, onClose }) {
  const [aiData, setAiData] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);

  /* The useEffect hook is used to fetch AI analysis data for the specific ticket when the TicketModal component is mounted or when the ticket prop changes. It sends a GET request to the backend API at the /api/ai/ticket/:id endpoint, where :id is the ID of the selected ticket. While the data is being fetched, it sets the loadingAI state to true to indicate that the analysis is in progress. Once the data is successfully retrieved, it updates the aiData state with the received information and sets loadingAI to false. If there is an error during the fetch process, it catches the error and simply sets loadingAI to false without updating aiData, which will result in displaying an "AI analysis unavailable" message in the UI. */
  useEffect(() => {
    setLoadingAI(true);
    fetch(`/api/ai/ticket/${ticket.id}`)
      .then(res => res.json())
      .then(data => { setAiData(data); setLoadingAI(false); })
      .catch(() => setLoadingAI(false));
  }, [ticket]);

  /* The component's return statement renders the modal overlay and the modal content. The overlay allows users to click outside the modal to close it, while the modal itself displays detailed information about the selected ticket, including its type, ID, status, title, properties (such as priority, assignee, reporter, etc.), description, and AI-generated insights. The AI insights section shows a loading spinner while the analysis is being fetched and displays the summary and meta information once available. If the AI analysis is unavailable, it shows an appropriate message. The modal also includes a close button for users to easily dismiss it. */
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`ticket-type-badge ${typeClass(ticket.type)}`}>{typeBadge(ticket.type)}</span>
              <code style={{ fontSize: '12px', fontFamily: "'DM Mono',monospace", color: 'var(--sky-600)', fontWeight: '500' }}>{ticket.id}</code>
              <span className={`status-pill ${statusClass(ticket.status)}`}>{ticket.status}</span>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--gray-900)' }}>{ticket.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            {[
              ['Priority', <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className={`priority-dot ${priorityClass(ticket.priority)}`}></span>{ticket.priority}</span>],
              ['Type', ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)],
              ['Assignee', ticket.assignee],
              ['Reporter', ticket.reporter],
              ['Sprint', ticket.sprint],
              ['Story Points', `${ticket.storyPoints} pts`],
              ['Created', ticket.created],
              ['Updated', ticket.updated],
            ].map(([k, v]) => (
              <div key={k} className="detail-item">
                <div className="detail-key">{k}</div>
                <div className="detail-val">{v}</div>
              </div>
            ))}
          </div>

          <div className="description-box">
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Description</div>
            {ticket.description}
          </div>

          <div className="ai-ticket-box">
            <div className="ai-badge">✨ Gemini AI Analysis</div>
            {loadingAI ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', color: 'var(--sky-600)', fontSize: '13px' }}>
                <span className="loading-spinner"></span> Analyzing with Gemini…
              </div>
            ) : aiData ? (
              <>
                <p className="ai-ticket-summary">{aiData.aiSummary}</p>
                <div className="ai-meta">
                  <span className="ai-meta-tag">⚡ Risk: {aiData.riskLevel}</span>
                  <span className="ai-meta-tag">🕐 Est. {aiData.estimatedResolution}</span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>AI analysis unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [activePage, setActivePage] = useState('dashboard');

  // ✅ All data now comes from your backend
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, done: 0, critical: 0 });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Fetch tickets from GET /api/tickets
  useEffect(() => {
    setLoadingTickets(true);
    fetch('/api/tickets')
      .then(res => res.json())
      .then(data => { setTickets(data.tickets || []); setLoadingTickets(false); })
      .catch(() => setLoadingTickets(false));
  }, []);

  // Fetch stats from GET /api/stats
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Stats fetch failed:', err));
  }, []);

  // Fetch AI analysis from GET /api/ai/analysis
  useEffect(() => {
    fetch('/api/ai/analysis')
      .then(res => res.json())
      .then(data => setAiAnalysis(data))
      .catch(err => console.error('AI analysis fetch failed:', err));
  }, []);

  const filtered = tickets.filter(t => {
    const matchType = activeTab === 'all' || t.type === activeTab;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const catCounts = {
    bug:   tickets.filter(t => t.type === 'bug').length,
    story: tickets.filter(t => t.type === 'story').length,
    task:  tickets.filter(t => t.type === 'task').length,
    other: tickets.filter(t => t.type === 'other').length,
  };

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'tickets',   icon: '🎫', label: 'All Tickets', badge: stats.total },
    { id: 'bugs',      icon: '🐛', label: 'Bugs',        badge: stats.open, badgeColor: 'red' },
    { id: 'stories',   icon: '📖', label: 'Stories' },
    { id: 'tasks',     icon: '✅', label: 'Tasks' },
    { id: 'other',     icon: '📦', label: 'Other' },
  ];

  const handleNavClick = (id) => {
    setActivePage(id);
    if (['bugs', 'stories', 'tasks', 'other'].includes(id)) {
      setActiveTab(id === 'bugs' ? 'bug' : id === 'stories' ? 'story' : id === 'other' ? 'other' : 'task');
    } else {
      setActiveTab('all');
    }
  };

  return (
    <div className="app">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">J</div>
            <span className="sidebar-logo-text">Datamir<span>Dashboard</span></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Main</div>
          {navItems.map(item => (
            <div key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge != null && <span className={`nav-badge ${item.badgeColor || ''}`}>{item.badge}</span>}
            </div>
          ))}

          <div className="sidebar-section" style={{ marginTop: '12px' }}>AI Features</div>
          <div className={`nav-item ${activePage === 'ai' ? 'active' : ''}`} onClick={() => setActivePage('ai')}>
            <span className="nav-icon">✨</span> AI Insights
          </div>
          <div className={`nav-item ${activePage === 'analytics' ? 'active' : ''}`} onClick={() => setActivePage('analytics')}>
            <span className="nav-icon">📊</span> Analytics
          </div>

          <div className="sidebar-section" style={{ marginTop: '12px' }}>Settings</div>
          <div className="nav-item"><span className="nav-icon">⚙️</span> Settings</div>
          <div className="nav-item"><span className="nav-icon">🔌</span> Integrations</div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={onLogout} title="Click to log out">
            <div className="user-avatar">{user.avatar}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--gray-400)' }}>→</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">
              {activePage === 'dashboard' ? '📊 Dashboard' :
               activePage === 'ai'        ? '✨ AI Insights' :
               activePage === 'analytics' ? '📈 Analytics' :
               activePage === 'bugs'      ? '🐛 Bug Tracker' :
               activePage === 'stories'   ? '📖 User Stories' :
               activePage === 'tasks'     ? '✅ Tasks' :
               activePage === 'other'     ? '📦 Other Tickets' : '🎫 All Tickets'}
            </div>
            <div className="topbar-sub">Last synced with Jira · {new Date().toLocaleDateString()}</div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              <span>🔍</span>
              <input placeholder="Search tickets, IDs…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="icon-btn" title="Refresh" onClick={() => window.location.reload()}>↻</div>
            <div className="icon-btn" title="Notifications">🔔</div>
          </div>
        </div>

        {/* Content */}
        <div className="content">

          {/* ── STATS ROW ── */}
          <div className="stats-grid">
            {[
              { label: 'Total Tickets', value: stats.total,      icon: '🎫', change: '+2 this week',    dir: 'up' },
              { label: 'Open',          value: stats.open,       icon: '📂', change: '5 need triage',   dir: 'down' },
              { label: 'In Progress',   value: stats.inProgress, icon: '⚡', change: 'On track',        dir: 'up' },
              { label: 'Critical',      value: stats.critical,   icon: '🚨', change: '↑ from 2 last wk', dir: 'down' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
                <div className={`stat-change ${s.dir}`}>{s.change}</div>
                <div className="stat-icon">{s.icon}</div>
              </div>
            ))}
          </div>

          {/* ── MAIN GRID ── */}
          <div className="dashboard-grid">
            <div className="dashboard-col">

              {/* Ticket List Card */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><span className="card-title-icon">🎫</span> Tickets</span>
                  <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                    {filtered.length} of {tickets.length} shown
                  </span>
                </div>

                <div className="category-tabs">
                  {[
                    ['all',   'All',     stats.total],
                    ['bug',   'Bugs',    catCounts.bug],
                    ['story', 'Stories', catCounts.story],
                    ['task',  'Tasks',   catCounts.task],
                    ['other', 'Other',   catCounts.other],
                  ].map(([val, label, count]) => (
                    <button key={val}
                      className={`cat-tab ${val} ${activeTab === val ? 'active' : ''}`}
                      onClick={() => setActiveTab(val)}>
                      {label} <span style={{ opacity: .7 }}>({count})</span>
                    </button>
                  ))}
                </div>

                <div className="ticket-list">
                  {loadingTickets ? (
                    <div className="empty-state">
                      <span className="loading-spinner" style={{ margin: '0 auto' }}></span>
                      <div className="empty-state-text" style={{ marginTop: '12px' }}>Loading tickets…</div>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <div className="empty-state-text">No tickets match your search.</div>
                    </div>
                  ) : filtered.map((t, i) => (
                    <div key={t.id} className="ticket-row"
                      style={{ animationDelay: `${i * 0.04}s` }}
                      onClick={() => setSelectedTicket(t)}>
                      <div className={`ticket-type-badge ${typeClass(t.type)}`}>
                        {typeBadge(t.type)}
                      </div>
                      <div className="ticket-info">
                        <div className="ticket-id">{t.id} · {t.sprint}</div>
                        <div className="ticket-title">{t.title}</div>
                        <div className="ticket-meta">
                          <span className="ticket-meta-item">
                            <span className={`priority-dot ${priorityClass(t.priority)}`}></span>
                            {t.priority}
                          </span>
                          <span className="ticket-meta-item">👤 {t.assignee}</span>
                          <span className="ticket-meta-item">💎 {t.storyPoints}pts</span>
                        </div>
                      </div>
                      <span className={`status-pill ${statusClass(t.status)}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="charts-grid">
                <div className="card">
                  <div className="card-header">
                    <span className="card-title"><span className="card-title-icon">🍩</span> By Category</span>
                  </div>
                  <div className="card-body">
                    <div className="donut-wrap">
                      <DonutChart
                        data={[{ value: catCounts.bug || 1 }, { value: catCounts.story || 1 }, { value: catCounts.task || 1 }, { value: catCounts.other || 1 }]}
                        colors={['#ef4444', '#8b5cf6', '#22c55e', '#f59e0b']}
                        size={110} stroke={20} />
                      <div className="donut-legend">
                        {[['🐛 Bugs', catCounts.bug, '#ef4444'], ['📖 Stories', catCounts.story, '#8b5cf6'], ['✅ Tasks', catCounts.task, '#22c55e'], ['📦 Other', catCounts.other, '#f59e0b']].map(([l, v, c]) => (
                          <div key={l} className="legend-item">
                            <span className="legend-dot" style={{ background: c }}></span>
                            {l}
                            <span className="legend-val">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title"><span className="card-title-icon">📊</span> By Status</span>
                  </div>
                  <div className="card-body">
                    <div className="bar-chart">
                      {[
                        ['Open',        stats.open,       stats.total || 1, '#38bdf8'],
                        ['In Progress', stats.inProgress, stats.total || 1, '#f59e0b'],
                        ['Done',        stats.done,       stats.total || 1, '#22c55e'],
                      ].map(([label, val, total, color]) => (
                        <div key={label} className="bar-row">
                          <div className="bar-label">
                            <span>{label}</span>
                            <span style={{ fontWeight: '700', color: 'var(--gray-800)', fontFamily: "'DM Mono',monospace" }}>{val}</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${(val / total) * 100}%`, background: color }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── AI SIDEBAR ── */}
            <div className="dashboard-col">
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><span className="card-title-icon">✨</span> Gemini AI Summary</span>
                  <span className="ai-badge" style={{ margin: 0 }}>AI</span>
                </div>
                <div className="card-body">
                  {aiAnalysis ? (
                    <>
                      <div className="ai-summary-box">
                        <div className="ai-badge">✨ Gemini 1.5 Pro</div>
                        <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.7' }}>
                          {aiAnalysis.summary}
                        </p>
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-700)', marginBottom: '8px' }}>
                        💡 Insights
                      </div>
                      <div className="insight-list">
                        {aiAnalysis.insights.map((ins, i) => (
                          <div key={i} className={`insight-item ${ins.type}`}>
                            <span className="insight-icon">{insightIcon(ins.type)}</span>
                            <span>{ins.text}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-700)', margin: '16px 0 8px' }}>
                        🎯 Suggestions
                      </div>
                      <div className="suggestion-list">
                        {aiAnalysis.suggestions.map((s, i) => (
                          <div key={i} className="suggestion-item">
                            <div className="suggestion-num">{s.priority}</div>
                            <div>
                              <div className="suggestion-action">{s.action}</div>
                              <div className="suggestion-detail">{s.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-400)' }}>
                      <span className="loading-spinner" style={{ margin: '0 auto' }}></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority breakdown — driven by live stats */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><span className="card-title-icon">🚦</span> Priority Breakdown</span>
                </div>
                <div className="card-body">
                  <div className="bar-chart">
                    {[
                      ['Critical', tickets.filter(t => t.priority === 'Critical').length, '#ef4444'],
                      ['High',     tickets.filter(t => t.priority === 'High').length,     '#f97316'],
                      ['Medium',   tickets.filter(t => t.priority === 'Medium').length,   '#f59e0b'],
                      ['Low',      tickets.filter(t => t.priority === 'Low').length,      '#22c55e'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="bar-row">
                        <div className="bar-label">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                            {label}
                          </span>
                          <span style={{ fontWeight: '700', fontFamily: "'DM Mono',monospace" }}>{val}</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(val / (tickets.length || 1)) * 100}%`, background: color }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sprint Velocity */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><span className="card-title-icon">⚡</span> Sprint Velocity</span>
                </div>
                <div className="card-body">
                  {[['Sprint 11', '18 pts closed', '✅'], ['Sprint 12', '31 pts active', '⚡'], ['Sprint 13', '50 pts planned', '📅']].map(([sprint, info, icon]) => (
                    <div key={sprint} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--sky-50)', borderRadius: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)' }}>{sprint}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{info}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}

// ─── ROOT APP ──────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);

  return user
    ? <Dashboard user={user} onLogout={() => setUser(null)} />
    : <LoginPage onLogin={setUser} />;
}

export default App;

