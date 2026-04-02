//Need to import React and necessary hooks for state management and side effects, as well as the main CSS file for styling the dashboard application.
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Helper functions to map ticket types, priorities, and statuses to badges and CSS classes for consistent styling across the dashboard.
function typeBadge(type) {
  return { bug: '🐛', defect: '⚠️', story: '📖', task: '✅', other: '📦' }[type] || '•';
}
function priorityClass(p) {
  return { Critical: 'p-critical', Highest: 'p-critical', High: 'p-high', Medium: 'p-medium', Low: 'p-low' }[p] || '';
}
function statusClass(s) {
  return { Open: 's-open', 'To Do': 's-open', 'In Progress': 's-inprogress', Done: 's-done', 'In Review': 's-review' }[s] || '';
}
function typeClass(t) {
  return { bug: 'type-bug', defect: 'type-defect', story: 'type-story', task: 'type-task', other: 'type-other' }[t] || '';
}

// Pie chart component that takes in data and renders a donut chart using SVG, calculating the necessary stroke dash arrays and offsets to visually represent the proportions of each category.
function DonutChart({ data, colors, size = 120, stroke = 22 }) {
  const r    = (size - stroke) / 2;
  const cx   = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  let acc = 0;

  const segments = data.map((d, i) => {
    const pct    = d.value / total;
    const dash   = pct * circ;
    const gap    = circ - dash;
    const offset = circ - (acc / total) * circ;
    acc += d.value;
    return { ...d, dash, gap, offset, color: colors[i % colors.length] };
  });

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      {segments.map((seg, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={seg.color} strokeWidth={stroke}
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={seg.offset}
          style={{ transition: 'stroke-dasharray .5s ease' }} />
      ))}
    </svg>
  );
}

// Login page component that manages user input for email and password, handles form submission to authenticate with the backend, and displays demo user accounts that can be auto-filled for quick access during testing or demos.
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  // On component mount, fetch a list of demo users from the backend API. If the fetch fails (e.g., backend not running), fall back to a hardcoded list of demo users with predefined emails, names, avatars, and roles for demonstration purposes.
  useEffect(() => {
    fetch('/api/auth/users')
      .then(r => r.json())
      .then(d => setDemoUsers(d.users || []))
      .catch(() => setDemoUsers([
        { id: 'u1', email: 'nam.nguyen@dataminr.com',    name: 'Nam Nguyen',    avatar: 'NN', role: 'Senior Developer' },
        { id: 'u2', email: 'andrea.cossio@dataminr.com', name: 'Andrea Cossio', avatar: 'AC', role: 'Product Manager'  },
        { id: 'u3', email: 'josh.moyer@dataminr.com',    name: 'Josh Moyer',    avatar: 'JM', role: 'QA Engineer'      },
      ]));
  }, []);

/*
Handle form submission for user login. 
It sends a POST request to the backend API with the entered email and password. 
If the response is successful and contains user data, it calls the onLogin callback with the user information. 
If there's an error (e.g., invalid credentials or server issues), it sets an appropriate error message to be displayed on the login page.
*/
  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.user) { onLogin(data.user); }
      else { setError(data.error || 'Invalid credentials. Try a demo account.'); }
    } catch {
      setError('Cannot reach the server. Make sure your backend is running.');
    }
    setLoading(false);
  };

  // When a demo user is clicked, this function fills the email and password fields with the demo user's credentials, allowing for quick login without manual typing.
  const fillDemo = (u) => { setEmail(u.email); setPass('password123'); };

/* 
The component renders a styled login form with fields for email and password, a submit button, and a section displaying demo user accounts. 
It also shows error messages when login fails and provides visual feedback during the loading state.
*/
  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-logo">
          <img src="/dataminr_logo.webp" alt="Dataminr" className="login-logo-img" />
          <span className="login-logo-text">Dataminr<span>Dashboard</span></span>
        </div>

        <h1 className="login-h">Welcome back</h1>
        <p className="login-subtitle">Sign in to access your Jira + AI dashboard</p>

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
          {loading ? '🔄 Signing in…' : '→ Sign in'}
        </button>

        <div className="login-divider"><span>demo accounts</span></div>

        <div className="demo-accounts">
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

const EDITOR_ROLES = ['Senior Developer', 'Admin'];

const DOC_FIELDS = [
  { label: 'Epic PLAT (Parent)',                               key: 'epicPlat',         type: 'text'     },
  { label: 'Docs Status',                                      key: 'docsStatus',       type: 'text'     },
  { label: 'Docs to Change',                                   key: 'docsToChange',     type: 'text'     },
  { label: 'Release Notes Writeup',                            key: 'rnWriteup',        type: 'textarea' },
  { label: 'Notes',                                            key: 'notes',            type: 'textarea' },
  { label: 'Docs Team Member',                                 key: 'docsTeamMember',   type: 'text'     },
  { label: 'SME',                                              key: 'sme',              type: 'text'     },
  { label: 'Review Process',                                   key: 'reviewProcess',    type: 'text'     },
  { label: 'Are all docs changes noted?',                      key: 'docsChangesNoted', type: 'yesno'    },
  { label: 'Is ticket added to Wrike card?',                   key: 'wrikeCardAdded',   type: 'yesno'    },
  { label: 'Include Release Notes (Sheet)',                    key: 'includeRnSheet',   type: 'rn'       },
  { label: 'Entered into Release Notes?',                      key: 'enteredIntoRn',    type: 'yesno'    },
  { label: 'PLAT Number/Link Added to Internal Version?',      key: 'platLinkAdded',    type: 'yesno'    },
];

function DocsSection({ ticket, user }) {
  const initialDocs  = ticket.docs || {};
  const [editing,    setEditing]  = useState(false);
  const [form,       setForm]     = useState({ ...initialDocs });
  const [saving,     setSaving]   = useState(false);
  const [saveMsg,    setSaveMsg]  = useState('');
  const canEdit = EDITOR_ROLES.includes(user?.role);
 
  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
 
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res  = await fetch(`/api/metadata/${ticket.id}`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ ...form, role: user?.role, userEmail: user?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      
      try {
        const syncRes  = await fetch('/api/sync-to-sheet', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ ticketId: ticket.id, fields: form, role: user?.role, userEmail: user?.email }),
        });
        const syncData = await syncRes.json();
        if (!syncRes.ok) {
          console.error('Sync to sheet failed:', syncData.error);
          setSaveMsg(`✅ Saved (sheet sync failed: ${syncData.error})`);
        } else {
          setSaveMsg('✅ Saved and synced to Google Sheet');
        }
      } catch (syncErr) {
        console.error('Sync to sheet error:', syncErr.message);
        setSaveMsg(`✅ Saved (sheet sync error: ${syncErr.message})`);
      }
      setEditing(false);
    } catch (err) {
      setSaveMsg(`⚠️ ${err.message}`);
    }
    setSaving(false);
  };

  const renderValue = (field) => {
    const val = form[field.key];
    if (editing && canEdit) {
      if (field.type === 'textarea') {
        return (
          <textarea className="docs-input docs-textarea"
            value={val || ''} onChange={e => handleChange(field.key, e.target.value)} />
        );
      }
      if (field.type === 'yesno') {
        return (
          <select className="docs-input docs-select"
            value={val || ''} onChange={e => handleChange(field.key, e.target.value)}>
            <option value="">—</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="N/A">N/A</option>
          </select>
        );
      }
      if (field.type === 'rn') {
        return (
          <select className="docs-input docs-select"
            value={val || ''} onChange={e => handleChange(field.key, e.target.value)}>
            <option value="">—</option>
            <option value="Public">Public</option>
            <option value="Internal">Internal</option>
            <option value="Hidden">Hidden</option>
          </select>
        );
      }
      return (
        <input className="docs-input"
          value={val || ''} onChange={e => handleChange(field.key, e.target.value)} />
      );
    }
    return <span className="docs-value">{val || <span style={{ color: 'var(--gray-400)' }}>—</span>}</span>;
  };
 
  return (
    <div className="docs-section">
      <div className="docs-section-header">
        <span className="docs-section-title">📄 Documentation Fields</span>
        {canEdit && !editing && (
          <button className="btn-secondary docs-edit-btn" onClick={() => { setEditing(true); setSaveMsg(''); }}>
            ✏️ Edit
          </button>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => { setEditing(false); setForm({ ...initialDocs }); setSaveMsg(''); }}>
              Cancel
            </button>
            <button className="btn-primary docs-edit-btn" onClick={handleSave} disabled={saving}>
              {saving ? '🔄 Saving…' : '💾 Save'}
            </button>
          </div>
        )}
      </div>
 
      {saveMsg && (
        <div className={`docs-save-msg ${saveMsg.startsWith('✅') ? 'success' : 'error'}`}>
          {saveMsg}
        </div>
      )}
 
      <div className="docs-fields-grid">
        {DOC_FIELDS.map(field => (
          <div key={field.key} className={`docs-field ${field.type === 'textarea' ? 'full-width' : ''}`}>
            <div className="docs-field-label">{field.label}</div>
            <div className="docs-field-value">{renderValue(field)}</div>
          </div>
        ))}
      </div>
 
      {ticket.docs?.updatedAt && (
        <div className="docs-updated-at">Last updated: {ticket.docs.updatedAt}</div>
      )}
    </div>
  );
}

// Modal component that displays detailed information about a selected ticket, including its properties, description, and AI-generated analysis.
function TicketModal({ ticket, onClose, user }) {
  const [aiData,     setAiData]     = useState(null);
  const [loadingAI,  setLoadingAI]  = useState(true);
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [showAnalysis,  setShowAnalysis]  = useState(true); 
  const [showDocRecs,   setShowDocRecs]   = useState(true);

  // When the component mounts or when the ticket ID changes, this effect triggers a fetch request to the backend API to retrieve AI-generated analysis for the specific ticket.
  useEffect(() => {
    setLoadingAI(true);
    setAiData(null);
    fetch(`/api/ai/ticket/${ticket.id}`)
      .then(r => r.json())
      .then(d => { setAiData(d); setLoadingAI(false); })
      .catch(() => setLoadingAI(false));
  }, [ticket.id]);

  // The component renders a modal overlay that displays the ticket's title, type, status, priority, assignee, reporter, sprint, story points, creation and update dates, as well as the description and AI analysis.
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`ticket-type-badge ${typeClass(ticket.type)}`}>{typeBadge(ticket.type)}</span>
              <code className="ticket-id-code">{ticket.id}</code>
              <span className={`status-pill ${statusClass(ticket.status)}`}>{ticket.status}</span>
              {ticket.aiCategory && (
                <span className="ai-cat-pill">{ticket.aiCategory}</span>
              )}
            </div>
            <h2 className="modal-title">{ticket.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Properties grid */}
          <div className="detail-grid">
            {[
              ['Priority', <span className="priority-row"><span className={`priority-dot ${priorityClass(ticket.priority)}`}></span>{ticket.priority}</span>],
              ['Type',     (ticket.aiCategory || ticket.type)],
              ['Assignee', ticket.assignee],
              ['Reporter', ticket.reporter],
              ['Sprint',   ticket.sprint],
              ['Points',   `${ticket.storyPoints} pts`],
              ['Created',  ticket.created],
              ['Updated',  ticket.updated],
              ['Fix Version', ticket.fixVersion || '-'],
              ['Include Release Notes', ticket.includeReleaseNotes || 'null'],
            ].map(([k, v]) => (
              <div key={k} className="detail-item">
                <div className="detail-key">{k}</div>
                <div className="detail-val">{v}</div>
              </div>
            ))}
          </div>

          {/* Gemini AI Summary styles */}
          {ticket.aiSummary && showAiSummary && (
            <div className="description-box ai-summary-dismissible" style={{ marginBottom: '12px' }}>
              <div className="desc-label-row">
                <span className="desc-label">✨ AI Summary</span>
                <button className="ai-dismiss-btn" onClick={() => setShowAiSummary(false)} title="Dismiss">✕ Dismiss</button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.7' }}>{ticket.aiSummary}</p>
            </div>
          )}
          {ticket.aiSummary && !showAiSummary && (
            <button className="ai-restore-btn" onClick={() => setShowAiSummary(true)}>
              ✨ Show AI Summary
            </button>
          )}

          <div className="description-box">
            <div className="desc-label">Description</div>
            <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.7' }}>
              {ticket.description || 'No description provided.'}
            </p>
          </div>

          {/* Gemini AI Analysis */}
 {showAnalysis ? (
            <div className="ai-ticket-box">
              <div className="desc-label-row">
                <div className="ai-badge" style={{ margin: 0 }}>✨ Gemini Deep Analysis</div>
                <button className="ai-dismiss-btn" onClick={() => setShowAnalysis(false)}>✕ Dismiss</button>
              </div>
              {loadingAI ? (
                <div className="ai-loading">
                  <span className="loading-spinner"></span> Analyzing with Gemini…
                </div>
              ) : aiData ? (
                <>
                  <p className="ai-ticket-summary">{aiData.aiSummary}</p>
                  <div className="ai-meta">
                    <span className="ai-meta-tag">⚡ Risk: {aiData.riskLevel}</span>
                    <span className="ai-meta-tag">🕐 Est. {aiData.estimatedResolution}</span>
                  </div>
                  {aiData.suggestedActions?.length > 0 && (
                    <ul className="ai-actions">
                      {aiData.suggestedActions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  )}
 
                  {/* Documentation Recommendations */}
                  {aiData.docRecommendations?.length > 0 && (
                    showDocRecs ? (
                      <div className="doc-recs-box">
                        <div className="desc-label-row">
                          <div className="doc-recs-label">📄 Docs Team Recommendations</div>
                          <button className="ai-dismiss-btn" onClick={() => setShowDocRecs(false)}>✕ Dismiss</button>
                        </div>
                        <ul className="doc-recs-list">
                          {aiData.docRecommendations.map((rec, i) => (
                            <li key={i} className="doc-recs-item">
                              <span className="doc-recs-num">{i + 1}</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <button className="ai-restore-btn" onClick={() => setShowDocRecs(true)}>
                        📄 Show Docs Recommendations
                      </button>
                    )
                  )}
                </>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>AI analysis unavailable.</p>
              )}
            </div>
          ) : (
            <button className="ai-restore-btn" onClick={() => setShowAnalysis(true)}>
              ✨ Show Gemini Deep Analysis
            </button>
          )}
 
          <DocsSection ticket={ticket} user={user} />
        </div>
      </div>
    </div>
  );
}

/*
 AI-powered release notes page that allows users to select which tickets to include, configure the release version and an optional knowledge base URL, and generates professional release notes in markdown format using Gemini AI. 
 The generated notes can be copied to the clipboard and are rendered with basic markdown formatting for easy reading.
*/
function ReleaseNotesPage({ tickets, user }) {
  const [version,      setVersion]      = useState('v1.0');
  const [kbUrl,        setKbUrl]        = useState('');
  const [notes,        setNotes]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [copied,       setCopied]       = useState(false);

  // Pre-select all tickets
  useEffect(() => {
    setSelectedIds(tickets.map(t => t.id));
  }, [tickets]);

/*
 Toggle the selection of a ticket by its ID. If the ticket is already selected, it will be deselected; 
 If it's not selected, it will be added to the selection. This allows users to easily choose which tickets to include in the generated release notes.
*/
  const toggleTicket = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

// Generate release notes by sending the selected tickets, version, and knowledge base URL to the backend API.
  const generateNotes = async () => {
    const selected = tickets.filter(t => selectedIds.includes(t.id));
    if (!selected.length) { alert('Please select at least one ticket.'); return; }

    setLoading(true);
    setNotes('');
    try {
      const res  = await fetch('/api/ai/release-notes', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ tickets: selected, version, kbUrl, userEmail: user?.email, userRole: user?.role }),
      });
      const data = await res.json();
      setNotes(data.releaseNotes || data.error || 'No response from AI.');
    } catch {
      setNotes('❌ Failed to generate release notes. Check your backend.');
    }
    setLoading(false);
  };

  // Copy the generated release notes in markdown format to the clipboard and provide visual feedback that the copy action was successful.
  const copyToClipboard = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown → HTML renderer (headings, bullets, bold)
  const renderMarkdown = (md) => {
    if (!md) return '';
    return md
      .split('\n')
      .map(line => {
        if (/^### (.+)$/.test(line)) {
          return line.replace(/^### (.+)$/, '<h3>$1</h3>');
        }
        if (/^## (.+)$/.test(line))  {
          return line.replace(/^## (.+)$/,  '<h2>$1</h2>');
        }
        if (/^# (.+)$/.test(line))   {
          return line.replace(/^# (.+)$/,   '<h1>$1</h1>');
        }
        if (/^\* (.+)$/.test(line))  {
          return line.replace(/^\* (.+)$/,  '<li>$1</li>');
        }
        if (/^- (.+)$/.test(line))   {
          return line.replace(/^- (.+)$/,   '<li>$1</li>');
        }
        if (line.trim() === '')      {
          return '<br/>';
        }
        return `<p>${line}</p>`;
      })
      .join('')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(<li>.*?<\/li>)+/gs, match => `<ul>${match}</ul>`);
  };

  // The component renders a two-column layout where the left side allows users to select which tickets to include in the release notes, and the right side provides configuration options and displays the generated release notes.
  return (
    <div className="release-page fade-in">
      <div className="release-layout">

        {/* LEFT: ticket selector */}
        <div className="release-sidebar card">
          <div className="card-header">
            <span className="card-title">🎫 Select Tickets</span>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{selectedIds.length}/{tickets.length}</span>
          </div>
          <div className="card-body">
            <button className="btn-secondary" style={{ marginBottom: '10px', width: '100%' }}
              onClick={() => setSelectedIds(selectedIds.length === tickets.length ? [] : tickets.map(t => t.id))}>
              {selectedIds.length === tickets.length ? 'Deselect All' : 'Select All'}
            </button>
            <div className="release-ticket-list">
              {[...tickets]
                .sort((a, b) => {
                  const numA = parseInt(a.id.replace(/\D/g, ''), 10);
                  const numB = parseInt(b.id.replace(/\D/g, ''), 10);
                  return numA - numB;
                })
                .map(t => {
                  const rnColors = { public: '#dcfce7', internal: '#fef3c7', hidden: '#fee2e2', null: '#f1f5f9' };
                  const rnText   = { public: '🌐', internal: '🔒', hidden: '🙈', null: '❓' };
                  const rnType   = t.includeReleaseNotes || 'null';
                  return (
                  <label key={t.id} className={`release-ticket-item ${selectedIds.includes(t.id) ? 'selected' : ''}`}>
                    <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleTicket(t.id)} />
                    <span className={`ticket-type-badge small ${typeClass(t.type)}`}>{typeBadge(t.type)}</span>
                    <div className="release-ticket-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className="release-ticket-id">{t.id}</span>
                        <span style={{
                          fontSize: '10px', fontWeight: '600', padding: '1px 6px',
                          borderRadius: '20px', background: rnColors[rnType],
                          color: '#374151', whiteSpace: 'nowrap',
                        }}>
                          {rnText[rnType]} {rnType}
                        </span>
                      </div>
                      <span className="release-ticket-title">{t.title}</span>
                    </div>
                  </label>
                );})}
            </div>
          </div>
        </div>

        {/* RIGHT: config + output */}
        <div className="release-main">
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <span className="card-title">⚙️ Configuration</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1', minWidth: '160px' }}>
                  <label className="form-label">Version / Release Name</label>
                  <input className="form-input" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. v2.1.0" />
                </div>
                <div className="form-group" style={{ flex: '2', minWidth: '260px' }}>
                  <label className="form-label">Company Knowledge Base URL (optional)</label>
                  <input className="form-input" value={kbUrl} onChange={e => setKbUrl(e.target.value)}
                    placeholder="https://your-company.com/knowledge-base" />
                </div>
              </div>
              <button className="btn-primary" onClick={generateNotes} disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? '🔄 Generating…' : '✨ Generate Release Notes with Gemini'}
              </button>
            </div>
          </div>

          {/* Output */}
          {(loading || notes) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">📋 Release Notes</span>
                {notes && (
                  <button className="btn-secondary" onClick={copyToClipboard}>
                    {copied ? '✅ Copied!' : '📋 Copy Markdown'}
                  </button>
                )}
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="ai-loading" style={{ justifyContent: 'center', padding: '40px' }}>
                    <span className="loading-spinner"></span>
                    <span style={{ color: 'var(--sky-600)', marginLeft: '10px' }}>Gemini is writing your release notes…</span>
                  </div>
                ) : (
                  <div className="release-notes-output"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) }} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Activity log action labels and colors for display
const ACTION_LABELS = {
  LOGIN_SUCCESS           : { label: '✅ Login',            color: '#22c55e' },
  LOGIN_FAILED            : { label: '❌ Login Failed',     color: '#ef4444' },
  LOGOUT                  : { label: '👋 Logout',           color: '#64748b' },
  FIELD_EDIT              : { label: '✏️ Field Edit',        color: '#0ea5e9' },
  CSV_IMPORT              : { label: '📂 CSV Import',        color: '#8b5cf6' },
  CSV_IMPORT_FAILURE      : { label: '❌ CSV Import Failed', color: '#ef4444' },
  SHEET_SYNC_IN           : { label: '🔄 Sheet Sync In',    color: '#f59e0b' },
  SHEET_SYNC_OUT          : { label: '🔄 Sheet Sync Out',   color: '#f59e0b' },
  RELEASE_NOTES_GENERATED : { label: '📋 Release Notes',    color: '#0284c7' },
  PERMISSION_DENIED       : { label: '🚫 Access Denied',    color: '#ef4444' },
  JIRA_FETCH_SUCCESS      : { label: '🟢 Jira Fetch OK',            color: '#22c55e' },
  JIRA_FETCH_FAILED       : { label: '🔴 Jira Fetch Failed',        color: '#ef4444' },
  GEMINI_CATEGORIZE_FAILED  : { label: '🤖 Gemini Categorize Failed', color: '#f59e0b' },
  GEMINI_ANALYSIS_FAILED    : { label: '🤖 Gemini Analysis Failed',   color: '#f59e0b' },
};

/*
  ActivityLogPage — shows recent user activity for security auditing.
  Only visible to Senior Developer, and QA Engineer roles.
*/
function ActivityLogPage({ user }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');
 
  useEffect(() => {
    fetch(`/api/activity-log?role=${encodeURIComponent(user?.role)}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => { setError('Failed to load activity log.'); setLoading(false); });
  }, [user?.role]);
 
  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.action === filter);
 
  return (
    <div className="release-page fade-in">
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔐 Activity Log</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
              {filteredLogs.length} entries
            </span>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="ai-loading" style={{ padding: '40px', justifyContent: 'center' }}>
              <span className="loading-spinner"></span>
              <span style={{ color: 'var(--sky-600)' }}>Loading activity log…</span>
            </div>
          ) : error ? (
            <div className="empty-state"><div className="empty-state-icon">⚠️</div><div className="empty-state-text">{error}</div></div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🔐</div><div className="empty-state-text">No activity recorded yet.</div></div>
          ) : (
            <div className="activity-log-table">
              <div className="activity-log-header">
                <span>Timestamp</span>
                <span>User</span>
                <span>Role</span>
                <span>Action</span>
                <span>Ticket</span>
                <span>Details</span>
                <span>IP</span>
              </div>
              {filteredLogs.map((log, i) => {
                const actionMeta = ACTION_LABELS[log.action] || { label: log.action, color: '#94a3b8' };
                return (
                  <div key={i} className="activity-log-row">
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span className="log-email">{log.user_email}</span>
                    <span className="log-role">{log.user_role}</span>
                    <span className="log-action" style={{ color: actionMeta.color, fontWeight: 600 }}>
                      {actionMeta.label}
                    </span>
                    <span className="log-ticket">{log.ticket_id || '—'}</span>
                    <span className="log-details">{log.details || '—'}</span>
                    <span className="log-ip">{log.ip_address || '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AI Query Page component that allows users to ask questions about their project, tickets, or processes and receive responses from Gemini AI in plain English.
function AiQueryPage() {
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
 
  const CLIENT_TIMEOUT_MS = 17000; // slightly longer than server's 15s to let server error arrive first
 
  const submitQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    setError('');
 
    // Client-side timeout as a safety net
    const clientTimeout = setTimeout(() => {
      setLoading(false);
      setError('AI response unavailable. Please try again later.');
    }, CLIENT_TIMEOUT_MS);
 
    try {
      const res  = await fetch('/api/ai/query', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ question }),
      });
      clearTimeout(clientTimeout);
      const data = await res.json();
      if (!res.ok || data.error === 'TIMEOUT') {
        setError('AI response unavailable. Please try again later.');
      } else if (!res.ok) {
        setError(`AI response unavailable. Please try again later. (${data.error})`);
      } else {
        setAnswer(data.answer || 'No response returned.');
      }
    } catch {
      clearTimeout(clientTimeout);
      setError('AI response unavailable. Please try again later.');
    }
    setLoading(false);
  };
 
  return (
    <div className="release-page fade-in">
      <div className="card">
        <div className="card-header">
          <span className="card-title">🤖 Ask AI</span>
          <span className="ai-badge" style={{ margin: 0 }}>Gemini</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>
            Ask any question about your project, tickets, or process. Gemini will respond in plain English.
          </p>
          <div className="ai-query-input-row">
            <textarea
              className="ai-query-textarea"
              placeholder="e.g. What should I prioritize this sprint? How do I write good release notes?"
              value={question}
              rows={3}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitQuery(); } }}
            />
            <button className="btn-primary ai-query-btn" onClick={submitQuery} disabled={loading || !question.trim()}>
              {loading ? '🔄' : '→ Ask'}
            </button>
          </div>
 
          {/* Timeout / error message */}
          {error && (
            <div className="error-banner gemini-error-banner" style={{ marginTop: '16px' }}>
              🤖 <strong>{error}</strong>
            </div>
          )}
 
          {/* Loading state */}
          {loading && (
            <div className="ai-loading" style={{ marginTop: '20px' }}>
              <span className="loading-spinner"></span>
              <span style={{ color: 'var(--sky-600)', fontSize: '13px' }}>Gemini is thinking…</span>
            </div>
          )}
 
          {/* Answer */}
          {answer && !loading && (
            <div className="ai-query-answer fade-in">
              <div className="ai-badge" style={{ marginBottom: '10px' }}>✨ Gemini Response</div>
              <p style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {answer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/*
Dashboard component that serves as the main interface for users after logging in, displaying an overview of tickets, statistics, and providing navigation to different sections of the dashboard. 
It also handles fetching tickets from the backend, sending them for AI analysis, and managing the state of the application.
*/
function Dashboard({ user, onLogout }) {
  const [activePage,     setActivePage]     = useState('dashboard');
  const [activeTab,      setActiveTab]      = useState('all');
  const [search,         setSearch]         = useState('');
  const [filterVersion,  setFilterVersion]  = useState('all');
  const [filterRnType,   setFilterRnType]   = useState('all');
  const [showAiPanel,    setShowAiPanel]    = useState(true);
  const [showCategoryChart, setShowCategoryChart] = useState(true);
  const [showStatusChart,   setShowStatusChart]   = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [tickets,        setTickets]        = useState([]);
  const [fixVersions,    setFixVersions]    = useState([]);
  const [stats,          setStats]          = useState({ total: 0, open: 0, inProgress: 0, done: 0, critical: 0, byType: {} });
  const [aiAnalysis,     setAiAnalysis]     = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingAI,      setLoadingAI]      = useState(false);
  const [jiraError,      setJiraError]      = useState('');
  const [geminiError,    setGeminiError]    = useState('');

/*
First step: load tickets from the backend API and set the loading state while the fetch is in progress. 
If the fetch is successful, it updates the tickets state with the retrieved data. 
If there's an error (e.g., Jira offline), it sets an error message to be displayed in the UI.
*/
  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setJiraError('');
    setGeminiError('');
    try {
      const res  = await fetch('/api/tickets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Jira fetch failed');

      const raw = data.tickets || [];
      if (raw.length === 0) throw new Error('No tickets returned from Jira. Check your project key and API credentials.');
      setTickets(raw);           // show immediately while AI runs

      //Second step: send raw tickets to the backend for AI categorization and enrichment, then update the tickets state with the categorized data once it is received. This allows the dashboard to display AI-generated categories and insights alongside the original ticket information.
      if (raw.length > 0) {
        setLoadingAI(true);
             try {
          const catRes  = await fetch('/api/ai/categorize', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ tickets: raw }),
          });
          if (!catRes.ok) throw new Error(`Categorization failed (${catRes.status})`);
 
          const catData = await catRes.json();
          const enriched = catData.tickets?.length ? catData.tickets : raw;
          setTickets(enriched);
 
          const analysisRes  = await fetch('/api/ai/analysis', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ tickets: enriched }),
          });
          if (!analysisRes.ok) throw new Error(`Analysis failed (${analysisRes.status})`);
 
          const analysisData = await analysisRes.json();
          if (analysisData?.summary) setAiAnalysis(analysisData);
        } catch (aiErr) {
          setGeminiError(aiErr.message);
        }
        setLoadingAI(false);
      }
    } catch (err) {
      setJiraError(err.message);
    }
    setLoadingTickets(false);
  }, []);

  //Third step: fetch overall statistics about the tickets from the backend API on component mount, and update the stats state with the retrieved data to be displayed in the dashboard's overview section.
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {setStats(d); setFixVersions(d.fixVersions || []);})
      .catch(err => console.error('Stats error:', err));
  }, []);

  //Fourth step: trigger the initial load of tickets when the component mounts, ensuring that the dashboard displays the most up-to-date information from Jira as soon as the user logs in.
  useEffect(() => { loadTickets(); }, [loadTickets]);

  //Filtering the tickets based on the active tab (e.g., all, bugs, stories) and the search query entered by the user.
  const filtered = tickets.filter(t => {
    const matchTab = activeTab === 'all' || t.type === activeTab;
    const matchVersion = filterVersion === 'all' || t.fixVersion === filterVersion;
    const matchRnType = filterRnType === 'all' || t.includeReleaseNotes === filterRnType;
    const q        = search.toLowerCase();
    const matchSrch = !search
      || t.title.toLowerCase().includes(q)
      || t.id.toLowerCase().includes(q);
    return matchTab && matchVersion && matchRnType && matchSrch;
  });

  //Calculating the count of tickets for each category (bug, story, task, other) to be displayed as badges in the navigation menu, providing users with a quick overview of the distribution of different types of tickets in their Jira project.
  const catCounts = {
    bug   : tickets.filter(t => t.type === 'bug').length,
    defect: tickets.filter(t => t.type === 'defect').length,
    story : tickets.filter(t => t.type === 'story').length,
    task  : tickets.filter(t => t.type === 'task').length,
    other : tickets.filter(t => t.type === 'other').length,
  };

  //Defining the navigation items for the sidebar, including their icons, labels, and badges (e.g., total ticket count, bug count) to provide users with easy access to different sections of the dashboard and a quick overview of their Jira tickets.
  const navItems = [
    { id: 'dashboard',     icon: '🏠', label: 'Dashboard' },
    { id: 'tickets',       icon: '🎫', label: 'All Tickets', badge: stats.total },
    { id: 'bugs',          icon: '🐛', label: 'Bugs',        badge: catCounts.bug,   badgeColor: 'red' },
    { id: 'stories',       icon: '📖', label: 'Stories',     badge: catCounts.story  },
    { id: 'defects',       icon: '⚠️', label: 'Defects',     badge: catCounts.defect, badgeColor: 'red' },
    { id: 'tasks',         icon: '✅', label: 'Tasks',       badge: catCounts.task   },
    { id: 'other',         icon: '📦', label: 'Other' },
    { id: 'release-notes', icon: '📋', label: 'Release Notes' },
    { id: 'ai-query',      icon: '🤖', label: 'Ask AI' },
    
    // Activity Log — only visible to Senior Developer and QA Engineer
    ...(['Senior Developer', 'QA Engineer'].includes(user?.role)
      ? [{ id: 'activity-log', icon: '🔐', label: 'Activity Log' }]
      : []),
  ];

  const handleNav = (id) => {
    setActivePage(id);
    const map = { bugs: 'bug', defects: 'defect', stories: 'story', tasks: 'task', other: 'other' };
    setActiveTab(map[id] || 'all');
  };

  // Mapping of active page IDs to their corresponding titles, which are displayed in the top bar of the dashboard to indicate the current section the user is viewing.
  const pageTitle = {
    dashboard    : '📊 Dashboard',
    tickets      : '🎫 All Tickets',
    bugs         : '🐛 Bug Tracker',
    defects      : '⚠️ Defects', 
    stories      : '📖 User Stories',
    tasks        : '✅ Tasks',
    other        : '📦 Other Tickets',
    'release-notes': '📋 Release Notes',
    'ai-query'     : '🤖 Ask AI',
    'activity-log' : '🔐 Activity Log'
  }[activePage] || '📊 Dashboard';

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/dataminr_logo.webp" alt="Dataminr" className="login-logo-img" />
          <span className="sidebar-logo-text">Dashboard</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge > 0 && (
                <span className={`nav-badge ${item.badgeColor === 'red' ? 'red' : ''}`}>{item.badge}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Jira status */}
        <div className="sidebar-footer">
          <div className={`jira-status ${jiraError ? 'error' : 'ok'}`}>
            {jiraError
              ? <><span>🔴</span><span>Jira offline</span></>
              : <><span>🟢</span><span>Jira connected</span></>
            }
          </div>
          <div className="user-card">
            <div className="user-avatar">{user.avatar || user.name?.[0]}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={async () => {
            await fetch('/api/auth/logout', {
              method : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body   : JSON.stringify({ userEmail: user?.email, userRole: user?.role }),
            });
            onLogout();
          }}>Sign out</button>
        </div>
      </aside>
      
      {/* Main content status and style */}
      <main className="main">
        {/* Top bar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-sub">Live Jira sync · {new Date().toLocaleDateString()}</div>
          </div>
          <div className="topbar-right">
            <div className="search-bar">
              <span>🔍</span>
              <input placeholder="Search tickets, IDs…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="icon-btn" title="Refresh" onClick={loadTickets}>↻</button>
            {EDITOR_ROLES.includes(user?.role) && (
              <label className="btn-import-csv" title="Import CSV">
                📂 Import CSV
                <input type="file" accept=".csv" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const csvContent = await file.text();
                    try {
                      const res  = await fetch('/api/import-csv', {
                        method : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body   : JSON.stringify({ csvContent, role: user?.role, userEmail: user?.email}),
                      });
                      const data = await res.json();
                      if (res.ok) { alert(data.message); loadTickets(); }
                      else        { alert(`❌ ${data.error}`); }
                    } catch { alert('❌ Import failed. Check your backend.'); }
                    e.target.value = '';
                  }} />
              </label>
            )}
            {EDITOR_ROLES.includes(user?.role) && (
              <button className="btn-import-csv" title="Sync from Google Sheet"
                onClick={async () => {
                  // Fetch the currently saved Sheet URL so we can pre-fill the prompt
                  let currentUrl = '';
                  try {
                    const s = await fetch('/api/sheet-settings').then(r => r.json());
                    currentUrl = s.sheetUrl || '';
                  } catch { /* ignore */ }
 
                  // Ask the client to paste their Google Sheet URL
                  const input = window.prompt(
                    '📋 Paste your Google Sheet URL:\n(It will be saved for future syncs)',
                    currentUrl
                  );
                  if (!input) return; // user cancelled
 
                  // Save the new URL first, then sync
                  try {
                    const saveRes  = await fetch('/api/sheet-settings', {
                      method : 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body   : JSON.stringify({ sheetUrl: input, role: user?.role }),
                    });
                    const saveData = await saveRes.json();
                    if (!saveRes.ok) { alert(`❌ ${saveData.error}`); return; }
 
                    const syncRes  = await fetch(`/api/sync-from-sheet?userEmail=${encodeURIComponent(user?.email)}&userRole=${encodeURIComponent(user?.role)}`);
                    const syncData = await syncRes.json();
                    if (syncRes.ok) { alert(syncData.message); loadTickets(); }
                    else            { alert(`❌ ${syncData.error}`); }
                  } catch { alert('❌ Sync failed. Check your backend.'); }
                }}>
                🔄 Sync Sheet
              </button>
            )}
            <div className="icon-btn">🔔</div>
          </div>
        </div>

        <div className="content">

          {/* Release Note Page */}
          {activePage === 'release-notes' ? (
            <ReleaseNotesPage tickets={tickets} user={user} />
          ) : activePage === 'ai-query' ? (
            <AiQueryPage />
          ) :  activePage === 'activity-log' ? (
            <ActivityLogPage user = {user} />
          ) : (
            <>
              {/* Stat Card */}
              <div className="stats-grid">
                {[
                  { label: 'Total Tickets', value: stats.total      ?? tickets.length, icon: '🎫', change: 'from Jira',         dir: 'up'   },
                  { label: 'Open',          value: stats.open       ?? 0,              icon: '📂', change: 'need attention',     dir: 'down' },
                  { label: 'In Progress',   value: stats.inProgress ?? 0,              icon: '⚡', change: 'active now',         dir: 'up'   },
                  { label: 'Critical',      value: stats.critical   ?? 0,              icon: '🚨', change: 'high priority',      dir: 'down' },
                ].map((s, i) => (
                  <div key={i} className="stat-card fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className={`stat-change ${s.dir}`}>{s.change}</div>
                    <div className="stat-icon">{s.icon}</div>
                  </div>
                ))}
              </div>

              {/* Jira Error Banner if connection fail */}
              {jiraError && (
                <div className="error-banner">
                  ⚠️ <strong>Jira connection failed:</strong> {jiraError}. Check your <code>JIRA_API_TOKEN</code> and <code>JIRA_BASE_URL</code> in server.js.
                </div>
              )}

               {/* Gemini Error Banner */}
              {geminiError && (
                <div className="error-banner gemini-error-banner">
                  🤖 <strong>Gemini AI unavailable:</strong> {geminiError}. Please check your <code>GEMINI_API_KEY</code> in server.js and try again later.
                </div>
              )}

              {/* Dashboard Grid */}
              <div className="dashboard-grid">
                {/* Left col: ticket list + charts */}
                <div className="dashboard-col">
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title"><span className="card-title-icon">🎫</span> Tickets</span>
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                        {filtered.length} of {tickets.length} shown
                      </span>
                    </div>

                    {/* Category tabs */}
                    <div className="category-tabs">
                      {[
                        ['all',   'All',     tickets.length],
                        ['bug',   'Bugs',    catCounts.bug  ],
                        ['defect', 'Defects', catCounts.defect],
                        ['story', 'Stories', catCounts.story],
                        ['task',  'Tasks',   catCounts.task ],
                        ['other', 'Other',   catCounts.other],
                      ].map(([val, label, count]) => (
                        <button key={val}
                          className={`cat-tab ${val} ${activeTab === val ? 'active' : ''}`}
                          onClick={() => setActiveTab(val)}>
                          {label} <span style={{ opacity: .7 }}>({count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Fix Version + Release Note Type filters */}   
                    <div className="ticket-filter-bar">               
                      {fixVersions.length > 0 && (                   
                        <select className="filter-select"             
                          value={filterVersion} onChange={e => setFilterVersion(e.target.value)}>
                          <option value="all">All Versions</option>
                          {fixVersions.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                      <select className="filter-select"
                        value={filterRnType} onChange={e => setFilterRnType(e.target.value)}>
                        <option value="all">All Release Note Types</option>
                        <option value="public">🌐 Public</option>
                        <option value="internal">🔒 Internal</option>
                        <option value="hidden">🙈 Hidden</option>
                        <option value="null">❓ Not Set</option>
                      </select>
                      {(filterVersion !== 'all' || filterRnType !== 'all') && (
                        <button className="filter-clear-btn"
                          onClick={() => { setFilterVersion('all'); setFilterRnType('all'); }}>
                          ✕ Clear
                        </button>
                      )}
                    </div>                        

                    {/* Ticket rows */}
                    <div className="ticket-list">
                      {loadingTickets ? (
                        <div className="empty-state">
                          <span className="loading-spinner" style={{ margin: '0 auto' }}></span>
                          <div className="empty-state-text" style={{ marginTop: '12px' }}>
                            Fetching tickets from Jira…
                          </div>
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-state-icon">🔍</div>
                          <div className="empty-state-text">No tickets match your search.</div>
                        </div>
                      ) : [...filtered].sort((a, b) => {
                            const numA = parseInt(a.id.replace(/\D/g, ''), 10);
                            const numB = parseInt(b.id.replace(/\D/g, ''), 10);
                            return numA - numB;
                          }).map((t, i) => (
                        <div key={t.id} className="ticket-row fade-in"
                          style={{ animationDelay: `${i * 0.03}s` }}
                          onClick={() => setSelectedTicket(t)}>
                          <div className={`ticket-type-badge ${typeClass(t.type)}`}>
                            {typeBadge(t.type)}
                          </div>
                          <div className="ticket-info">
                            <div className="ticket-id">{t.id} · {t.sprint}</div>
                            <div className="ticket-title">{t.title}</div>
                            {/* Gemini AI summary preview */}
                            {t.aiSummary && (
                              <div className="ticket-ai-preview">✨ {t.aiSummary}</div>
                            )}
                            <div className="ticket-meta">
                              <span className="ticket-meta-item">
                                <span className={`priority-dot ${priorityClass(t.priority)}`}></span>
                                {t.priority}
                              </span>
                              <span className="ticket-meta-item">👤 {t.assignee}</span>
                              {t.storyPoints > 0 && (
                                <span className="ticket-meta-item">💎 {t.storyPoints}pts</span>
                              )}
                              {t.aiCategory && (
                                <span className="ai-cat-chip">{t.aiCategory}</span>
                              )}
                            </div>
                          </div>
                          <span className={`status-pill ${statusClass(t.status)}`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Charts row */}
                     <div className="charts-grid">
 
                    {/* By Category */}
                    {showCategoryChart ? (
                      <div className="card">
                        <div className="card-header">
                          <span className="card-title"><span className="card-title-icon">🍩</span> By Category</span>
                          <button type="button" className="ai-dismiss-btn" onClick={e => { e.stopPropagation(); setShowCategoryChart(false); }}>✕ Hide</button>
                        </div>
                        <div className="card-body">
                          <div className="donut-wrap">
                            <DonutChart
                              data={[
                                { value: catCounts.bug    || 1 },
                                { value: catCounts.story  || 1 },
                                { value: catCounts.task   || 1 },
                                { value: catCounts.other  || 1 },
                                { value: catCounts.defect || 1 },
                              ]}
                              colors={['#ef4444', '#8b5cf6', '#22c55e', '#f59e0b', '#f97316']}
                              size={110} stroke={20} />
                            <div className="donut-legend">
                              {[
                                ['🐛 Bugs',    catCounts.bug,    '#ef4444'],
                                ['📖 Stories', catCounts.story,  '#8b5cf6'],
                                ['✅ Tasks',   catCounts.task,   '#22c55e'],
                                ['📦 Other',   catCounts.other,  '#f59e0b'],
                                ['⚠️ Defects', catCounts.defect, '#f97316'],
                              ].map(([l, v, c]) => (
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
                    ) : (
                      <button type="button" className="ai-restore-btn" onClick={() => setShowCategoryChart(true)}>🍩 Show By Category</button>
                    )}
 
                    {/* By Status */}
                    {showStatusChart ? (
                      <div className="card">
                        <div className="card-header">
                          <span className="card-title"><span className="card-title-icon">📊</span> By Status</span>
                          <button type="button" className="ai-dismiss-btn" onClick={e => { e.stopPropagation(); setShowStatusChart(false); }}>✕ Hide</button>
                        </div>
                        <div className="card-body">
                          <div className="bar-chart">
                            {[
                              ['Open',        stats.open        || 0, '#38bdf8'],
                              ['In Progress', stats.inProgress  || 0, '#f59e0b'],
                              ['Done',        stats.done        || 0, '#22c55e'],
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
                    ) : (
                      <button type="button" className="ai-restore-btn" onClick={() => setShowStatusChart(true)}>📊 Show By Status</button>
                    )}
 
                  </div>
                </div>

                {/* Right column: AI analysis */}
                <div className="dashboard-col">
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title"><span className="card-title-icon">✨</span> Gemini AI Analysis</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="ai-badge" style={{ margin: 0 }}>AI</span>
                        <button className="panel-toggle-btn" onClick={() => setShowAiPanel(p => !p)}>
                          {showAiPanel ? '▲ Hide' : '▼ Show'}
                        </button>
                      </div>
                    </div>
                    {showAiPanel && (
                    <div className="card-body">
                      {loadingAI ? (
                        <div className="ai-loading">
                          <span className="loading-spinner"></span>
                          <span style={{ color: 'var(--sky-600)', fontSize: '13px' }}>Gemini is analyzing your tickets…</span>
                        </div>
                      ) : aiAnalysis ? (
                        <>
                          <div className="ai-summary-box">
                            <div className="ai-badge">✨ Gemini 2.5 Flash</div>
                            <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.7' }}>
                              {aiAnalysis.summary}
                            </p>
                          </div>
 
                          <div className="section-label">💡 Insights</div>
                          <div className="insight-list">
                            {(aiAnalysis.insights || []).map((ins, i) => (
                              <div key={i} className={`insight-item ${ins.type}`}>
                                <span className="insight-icon">
                                  {{ warning: '⚠️', positive: '✅', info: 'ℹ️' }[ins.type] || '•'}
                                </span>
                                <span>{ins.text}</span>
                              </div>
                            ))}
                          </div>
 
                          <div className="section-label" style={{ marginTop: '16px' }}>🎯 Suggestions</div>
                          <div className="suggestion-list">
                            {(aiAnalysis.suggestions || []).map((s, i) => (
                              <div key={i} className="suggestion-item">
                                <div className="suggestion-num">{s.priority || `P${i+1}`}</div>
                                <div>
                                  <div className="suggestion-action">{s.action}</div>
                                  <div className="suggestion-detail">{s.detail}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="empty-state" style={{ padding: '20px 0' }}>
                          <div className="empty-state-icon">✨</div>
                          <div className="empty-state-text">
                            AI analysis will appear once tickets are loaded.
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Priority breakdown */}
                                    <div className="card">
                    <div className="card-header">
                      <span className="card-title"><span className="card-title-icon">🚦</span> Priority Breakdown</span>
                    </div>
                    <div className="card-body">
                      <div className="bar-chart">
                        {[
                          ['Critical', tickets.filter(t => t.priority === 'Critical' || t.priority === 'Highest').length, '#ef4444'],
                          ['High',     tickets.filter(t => t.priority === 'High').length,     '#f97316'],
                          ['Medium',   tickets.filter(t => t.priority === 'Medium').length,   '#f59e0b'],
                          ['Low',      tickets.filter(t => t.priority === 'Low'    || t.priority === 'Lowest').length, '#22c55e'],
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

                  {/* Quick release notes shortcut */}
                  <div className="card release-cta" onClick={() => setActivePage('release-notes')} style={{ cursor: 'pointer' }}>
                    <div className="card-header" style={{ border: 'none' }}>
                      <span className="card-title"><span className="card-title-icon">📋</span> Release Notes</span>
                      <span className="ai-badge" style={{ margin: 0 }}>AI</span>
                    </div>
                    <div className="card-body">
                      <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6' }}>
                        Generate professional release notes from your Jira tickets using Gemini AI and your company knowledge base.
                      </p>
                      <div className="btn-primary" style={{ marginTop: '10px', display: 'inline-block', cursor: 'pointer' }}>
                        Open Release Notes →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} user={user} />
      )}
    </div>
  );
}

// Main App component that manages user authentication state and conditionally renders either the Dashboard or the LoginPage based on whether a user is logged in or not.
function App() {
  const [user, setUser] = useState(null);
  return user
    ? <Dashboard user={user} onLogout={() => setUser(null)} />
    : <LoginPage onLogin={setUser} />;
}

export default App;