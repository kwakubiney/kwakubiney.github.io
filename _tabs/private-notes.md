---
layout: page
title: Private Notes
icon: fas fa-lock
order: 6
---

<div id="private-notes-container">
  <div id="auth-status" class="auth-section">
    <p id="auth-message">Checking access...</p>
  </div>

  <div id="notes-list" class="notes-list" style="display: none;">
    <h2>📝 My Private Notes</h2>
    <p class="notes-intro">These are my personal thoughts and reflections. Thanks for being part of my trusted circle!</p>
    <ul id="notes-ul"></ul>
  </div>

  <div id="note-view" class="note-view" style="display: none;">
    <button onclick="showNotesList()" class="back-btn">← Back to notes</button>
    <article id="note-content"></article>
  </div>

  <div id="request-access" class="request-section" style="display: none;">
    <div class="lock-icon">🔒</div>
    <h2>Private Notes</h2>
    <p>This section contains my personal notes and thoughts, visible only to approved readers.</p>
    
    <div id="request-form">
      <input type="email" id="email-input" placeholder="Enter your email" required>
      <button id="request-btn" onclick="requestAccess()">Request Access</button>
    </div>
    
    <p id="request-status" class="status-message"></p>
    
    <div id="already-requested" style="display: none;">
      <p>Already have access? <button onclick="sendMagicLink()">Get Magic Link</button></p>
    </div>
  </div>

  <div id="pending-approval" class="pending-section" style="display: none;">
    <div class="pending-icon">⏳</div>
    <h2>Access Pending</h2>
    <p>Your request has been submitted! I'll review it and you'll receive an email when approved.</p>
  </div>
</div>

<style>
.auth-section, .request-section, .pending-section, .notes-list, .note-view {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.auth-section, .request-section, .pending-section {
  text-align: center;
}

.lock-icon, .pending-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.request-section input[type="email"] {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  width: 100%;
  max-width: 300px;
  margin-bottom: 1rem;
  background: var(--card-bg, #fff);
  color: var(--text-color, #333);
}

.request-section button, #already-requested button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.request-section button:hover, #already-requested button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.status-message {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.status-message.success {
  background: rgba(72, 187, 120, 0.1);
  color: #48bb78;
}

.status-message.error {
  background: rgba(245, 101, 101, 0.1);
  color: #f56565;
}

.notes-list ul {
  list-style: none;
  padding: 0;
}

.notes-list li {
  padding: 1rem;
  margin: 0.5rem 0;
  background: var(--card-bg, #f9f9f9);
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.notes-list li:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.notes-list li .note-title {
  font-weight: 500;
  color: var(--link-color, #667eea);
}

.note-date {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  display: block;
  margin-top: 0.25rem;
}

.notes-intro {
  color: var(--text-muted, #666);
  margin-bottom: 1.5rem;
}

.back-btn {
  background: none;
  border: none;
  color: var(--link-color, #667eea);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.back-btn:hover {
  text-decoration: underline;
}

#note-content {
  line-height: 1.8;
}

#note-content h1 {
  margin-bottom: 1rem;
}
</style>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
const SUPABASE_URL = '{{ site.supabase.url }}';
const SUPABASE_ANON_KEY = '{{ site.supabase.anon_key }}';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentNotes = [];

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // User is logged in, check if approved
    const { data: approved } = await supabase
      .from('approved_users')
      .select('email')
      .eq('email', session.user.email)
      .single();
    
    if (approved) {
      await loadNotes();
      showNotesList();
    } else {
      showPendingApproval();
    }
  } else {
    showRequestAccess();
  }
}

async function loadNotes() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, slug, title, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading notes:', error);
    return;
  }
  
  currentNotes = notes;
  const ul = document.getElementById('notes-ul');
  ul.innerHTML = notes.map(note => `
    <li onclick="viewNote('${note.slug}')">
      <span class="note-title">${note.title}</span>
      <span class="note-date">${new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </li>
  `).join('');
}

async function viewNote(slug) {
  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error || !note) {
    console.error('Error loading note:', error);
    return;
  }
  
  const contentDiv = document.getElementById('note-content');
  contentDiv.innerHTML = marked.parse(note.content);
  
  document.getElementById('notes-list').style.display = 'none';
  document.getElementById('note-view').style.display = 'block';
}

function showNotesList() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('notes-list').style.display = 'block';
  document.getElementById('note-view').style.display = 'none';
  document.getElementById('request-access').style.display = 'none';
  document.getElementById('pending-approval').style.display = 'none';
}

function showRequestAccess() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('notes-list').style.display = 'none';
  document.getElementById('note-view').style.display = 'none';
  document.getElementById('request-access').style.display = 'block';
  document.getElementById('pending-approval').style.display = 'none';
}

function showPendingApproval() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('notes-list').style.display = 'none';
  document.getElementById('note-view').style.display = 'none';
  document.getElementById('request-access').style.display = 'none';
  document.getElementById('pending-approval').style.display = 'block';
}

async function requestAccess() {
  const email = document.getElementById('email-input').value;
  const statusEl = document.getElementById('request-status');
  const btn = document.getElementById('request-btn');
  
  if (!email) {
    statusEl.textContent = 'Please enter your email';
    statusEl.className = 'status-message error';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  
  try {
    // Insert access request
    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({ email: email, status: 'pending' });
    
    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }
    
    // Send magic link
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.href
      }
    });
    
    if (authError) throw authError;
    
    statusEl.textContent = '✓ Check your email! Click the link to complete your request.';
    statusEl.className = 'status-message success';
    
  } catch (error) {
    statusEl.textContent = 'Something went wrong. Please try again.';
    statusEl.className = 'status-message error';
    console.error(error);
  }
  
  btn.disabled = false;
  btn.textContent = 'Request Access';
}

async function sendMagicLink() {
  const email = prompt('Enter your email:');
  if (email) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.href
      }
    });
    
    if (error) {
      alert('Error sending magic link. Please try again.');
    } else {
      alert('Check your email for the magic link!');
    }
  }
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', checkAuth);

// Handle magic link redirect
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    checkAuth();
  }
});
</script>
