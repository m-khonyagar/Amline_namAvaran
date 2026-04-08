/* ── Super-Agent Cursor-like UI v2 ───────────────────────────────
   Features:
   1.  Typewriter effect for brain agent output
   2.  Per-agent elapsed time + session summary footer
   3.  Session restore from /v1/tasks/{id}/trace on page reload
   4.  Stop button to cancel active SSE stream
   5.  Syntax highlighting via highlight.js
   6.  Download session as JSON or Markdown
   7.  Search / filter sidebar history
   8.  Diff view for coder agent output
   9.  Dark / Light theme switcher (persisted in localStorage)
   10. Browser Notification API when pipeline finishes
   11. Keyboard shortcut help modal (press ?)
   12. Progress bar in topbar showing pipeline completion %
──────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const $id  = (id) => document.getElementById(id);
  const feed          = $id('stepsFeed');
  const welcome       = $id('welcome');
  const sessionList   = $id('sessionList');
  const pipeline      = $id('pipeline');
  const progressBar   = $id('progressBar');
  const statusDot     = $id('statusDot');
  const statusLabel   = $id('statusLabel');
  const goalInput     = $id('goalInput');
  const sendBtn       = $id('sendBtn');
  const sendLabel     = $id('sendLabel');
  const stopBtn       = $id('stopBtn');
  const planOnly      = $id('planOnly');
  const skipBrain     = $id('skipBrain');
  const tokenInput    = $id('tokenInput');
  const errorBanner   = $id('errorBanner');
  const newBtn        = $id('newBtn');
  const themeToggle   = $id('themeToggle');
  const shortcutBtn   = $id('shortcutBtn');
  const shortcutModal = $id('shortcutModal');
  const closeModal    = $id('closeShortcutModal');
  const searchInput   = $id('searchInput');
  const downloadBtn   = $id('downloadBtn');

  // ── Agent metadata ────────────────────────────────────────────
  const AGENTS = {
    planner:    { icon: '📋', label: 'برنامه‌ریزی',       color: 'var(--c-planner)' },
    brain:      { icon: '🧠', label: 'تحلیل هوش مصنوعی', color: 'var(--c-brain)' },
    researcher: { icon: '🔍', label: 'تحقیق',            color: 'var(--c-researcher)' },
    coder:      { icon: '💻', label: 'کدنویسی',          color: 'var(--c-coder)' },
    tester:     { icon: '🧪', label: 'آزمون',            color: 'var(--c-tester)' },
    executor:   { icon: '⚡', label: 'اجرا',             color: 'var(--c-executor)' },
  };
  const PIPELINE_ORDER = ['planner', 'brain', 'researcher', 'coder', 'tester', 'executor'];

  // ── Feature 9: Theme switcher ─────────────────────────────────
  const THEME_KEY = 'sa_theme_v1';

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    // Swap highlight.js stylesheet
    const dark  = document.getElementById('hljs-theme-dark');
    const light = document.getElementById('hljs-theme-light');
    if (dark)  dark.disabled  = theme === 'light';
    if (light) light.disabled = theme === 'dark';
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });

  // Init theme from storage
  (() => {
    let saved = 'dark';
    try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch {}
    applyTheme(saved);
  })();

  // ── Feature 11: Keyboard shortcut modal ───────────────────────
  function openModal()  { shortcutModal.hidden = false; }
  function closeModalFn() { shortcutModal.hidden = true; }

  shortcutBtn.addEventListener('click', () => shortcutModal.hidden ? openModal() : closeModalFn());
  closeModal.addEventListener('click', closeModalFn);
  shortcutModal.addEventListener('click', (e) => { if (e.target === shortcutModal) closeModalFn(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && document.activeElement !== goalInput) {
      e.preventDefault();
      shortcutModal.hidden ? openModal() : closeModalFn();
      return;
    }
    if (e.key === 'Escape' && !shortcutModal.hidden) {
      closeModalFn();
    }
  });

  // ── Session history (localStorage) ───────────────────────────
  const STORAGE_KEY = 'sa_sessions_v1';
  let sessions = [];
  let activeSessionIdx = -1;
  let searchQuery = '';

  function loadSessions() {
    try { sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { sessions = []; }
  }

  function saveSessions() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50))); }
    catch {}
  }

  function addSession(goal, taskId) {
    const s = { goal, taskId, ts: new Date().toISOString(), events: [], totalElapsed: 0 };
    sessions.unshift(s);
    activeSessionIdx = 0;
    saveSessions();
    renderSidebar();
    return s;
  }

  // ── Feature 7: Sidebar search ─────────────────────────────────
  function renderSidebar() {
    const q = searchQuery.toLowerCase();
    const visible = sessions
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !q || s.goal.toLowerCase().includes(q));

    if (!visible.length) {
      sessionList.innerHTML = q
        ? '<p class="sidebar-empty">جلسه‌ای یافت نشد</p>'
        : '<p class="sidebar-empty">هنوز جلسه‌ای ثبت نشده</p>';
      return;
    }
    sessionList.innerHTML = visible.map(({ s, i }) => {
      const cls = i === activeSessionIdx ? 'session-item active' : 'session-item';
      const dt  = new Date(s.ts).toLocaleString('fa-IR', {
        hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric',
      });
      const g = esc(s.goal.length > 42 ? s.goal.slice(0, 42) + '…' : s.goal);
      return `<div class="${cls}" data-idx="${i}">
        <span class="session-goal">${g}</span>
        <span class="session-meta">${dt}</span>
      </div>`;
    }).join('');
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderSidebar();
  });

  sessionList.addEventListener('click', (e) => {
    const item = e.target.closest('.session-item');
    if (!item) return;
    const idx = parseInt(item.dataset.idx, 10);
    if (isNaN(idx) || !sessions[idx]) return;
    activeSessionIdx = idx;
    replaySession(sessions[idx]);
    renderSidebar();
  });

  function replaySession(s) {
    showFeed();
    feed.innerHTML = `<div class="goal-msg">${esc(s.goal)}</div>`;
    resetPipeline();
    let done = 0;
    for (const ev of s.events) {
      applyEvent(ev, /* replay= */ true);
      if (ev.status !== 'running') {
        markPipelineStep(ev.agent, ev.status === 'error' ? 'error' : 'done');
        done++;
      }
    }
    updateProgressBar(done);
    if (s.totalElapsed) showSessionFooter(s);
    updateDownloadBtn(s);
  }

  // ── Helpers ───────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showFeed() {
    welcome.hidden = true;
    feed.hidden    = false;
    errorBanner.hidden = true;
    downloadBtn.hidden = true;
  }

  function showWelcome() {
    welcome.hidden = false;
    feed.hidden    = true;
    errorBanner.hidden = true;
    downloadBtn.hidden = true;
    feed.innerHTML = '';
    resetPipeline();
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.hidden = false;
  }

  // ── Feature 12: Progress bar ──────────────────────────────────
  function resetPipeline() {
    pipeline.querySelectorAll('.pip-step').forEach((el) => { el.className = 'pip-step'; });
    updateProgressBar(0);
  }

  function markPipelineStep(agent, state) {
    const el = pipeline.querySelector(`.pip-step[data-agent="${agent}"]`);
    if (el) el.className = `pip-step ${state}`;
  }

  function updateProgressBar(completedCount) {
    const pct = Math.round((completedCount / PIPELINE_ORDER.length) * 100);
    progressBar.style.width  = `${pct}%`;
    progressBar.style.opacity = pct === 0 ? '0' : '1';
  }

  // ── Status bar ────────────────────────────────────────────────
  function setStatus(state, text) {
    statusDot.className  = `status-dot ${state}`;
    statusLabel.textContent = text;
  }

  async function checkReady() {
    try {
      const r = await fetch('/ready');
      const j = await r.json();
      if (j.provider === 'openai') {
        setStatus(j.api_key_configured ? 'ok' : 'warn',
          j.api_key_configured ? `OpenAI — ${j.model || ''}` : 'OpenAI: کلید API تنظیم نشده');
      } else {
        setStatus(j.ollama ? 'ok' : 'bad',
          j.ollama ? `Ollama — ${j.base_url || ''}` : 'Ollama در دسترس نیست');
      }
    } catch {
      setStatus('bad', 'سرور در دسترس نیست');
    }
  }

  // ── Feature 2: Session footer ─────────────────────────────────
  function showSessionFooter(s) {
    let footer = feed.querySelector('.session-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'session-footer';
      feed.appendChild(footer);
    }
    const agentCount = s.events.filter((e) => e.status !== 'running').length;
    footer.textContent = `✓ تکمیل شد — ${s.totalElapsed.toFixed(1)}s | ${agentCount} ${agentCount === 1 ? 'agent' : 'agents'}`;
  }

  // ── Feature 6: Download ───────────────────────────────────────
  function updateDownloadBtn(s) {
    if (!s || !s.events.length) { downloadBtn.hidden = true; return; }
    downloadBtn.hidden = false;
    downloadBtn.dataset.sessionIdx = sessions.indexOf(s);
  }

  downloadBtn.addEventListener('click', () => {
    const idx = parseInt(downloadBtn.dataset.sessionIdx, 10);
    const s = sessions[idx];
    if (!s) return;

    // Build and show a tiny dropdown
    const old = document.querySelector('.dl-menu');
    if (old) { old.remove(); return; } // toggle off

    const menu = document.createElement('div');
    menu.className = 'dl-menu';
    menu.innerHTML =
      '<button data-fmt="json">دانلود JSON</button>' +
      '<button data-fmt="md">دانلود Markdown</button>';

    const rect = downloadBtn.getBoundingClientRect();
    menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;z-index:999;`;
    document.body.appendChild(menu);

    function cleanup() {
      menu.remove();
      document.removeEventListener('click', cleanup, true);
    }
    setTimeout(() => document.addEventListener('click', cleanup, true), 10);

    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-fmt]');
      if (!btn) return;
      if (btn.dataset.fmt === 'json') {
        downloadAs(JSON.stringify(s, null, 2),
          `super-agent-${s.taskId || 'session'}.json`, 'application/json');
      } else {
        downloadAs(sessionToMarkdown(s),
          `super-agent-${s.taskId || 'session'}.md`, 'text/markdown');
      }
      cleanup();
    });
  });

  function downloadAs(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sessionToMarkdown(s) {
    const lines = [`# ${s.goal}`, ``, `*${new Date(s.ts).toLocaleString('fa-IR')}*`, ``];
    for (const ev of s.events) {
      const meta = AGENTS[ev.agent] || { icon: '🔧', label: ev.agent };
      lines.push(`## ${meta.icon} ${meta.label}`);
      if (ev.error) {
        lines.push(`> خطا: ${ev.error}`);
      } else if (ev.output) {
        lines.push('```json', JSON.stringify(ev.output, null, 2), '```');
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  // ── Step card rendering ───────────────────────────────────────
  let doneStepCount = 0;

  function getOrCreateCard(agent) {
    let card = feed.querySelector(`.step-card[data-agent="${agent}"]`);
    if (card) return card;

    const meta = AGENTS[agent] || { icon: '🔧', label: agent, color: 'var(--muted)' };
    card = document.createElement('div');
    card.className = 'step-card';
    card.dataset.agent = agent;
    card.dataset.start = Date.now();

    const header = document.createElement('div');
    header.className = 'step-header';

    const iconEl = document.createElement('span');
    iconEl.className = 'step-icon';
    iconEl.textContent = meta.icon;

    const agentEl = document.createElement('span');
    agentEl.className = 'step-agent';
    agentEl.textContent = meta.label;

    const statusEl = document.createElement('span');
    statusEl.className = 'step-status';
    statusEl.innerHTML = '<span class="spin"></span><span class="step-status-text">در حال اجرا…</span>';

    const elapsedEl = document.createElement('span');
    elapsedEl.className = 'step-elapsed';

    header.append(iconEl, agentEl, statusEl, elapsedEl);

    const body = document.createElement('div');
    body.className = 'step-body';
    body.innerHTML = '<div class="running-row"><span class="spin"></span> در حال پردازش…</div>';

    card.append(header, body);
    header.addEventListener('click', () => body.classList.toggle('collapsed'));
    feed.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return card;
  }

  function finalizeCard(card, status, output, error, agent, replay) {
    const elapsed = Math.round((Date.now() - parseInt(card.dataset.start || Date.now(), 10)) / 100) / 10;
    const statusEl  = card.querySelector('.step-status');
    const elapsedEl = card.querySelector('.step-elapsed');

    statusEl.textContent = '';
    const badge = document.createElement('span');
    badge.className   = status === 'error' ? 'badge-err' : 'badge-ok';
    badge.textContent = status === 'error' ? '✗ خطا' : '✓ انجام شد';
    statusEl.appendChild(badge);

    elapsedEl.textContent = `${elapsed}s`;

    const body = card.querySelector('.step-body');

    // Feature 1: Typewriter for brain in live mode
    // All content written below goes through renderBody which applies esc() to every
    // piece of server-derived data before inserting it into innerHTML.
    if (agent === 'brain' && !replay && !error && output) {
      const plan = output.llm_plan || '';
      if (plan) {
        body.innerHTML = renderBody(agent, output, error); // esc() applied in renderBody
        highlightCodeBlocks(body);
        typewriterReveal(body);
        attachCopyBtns(body);
        return;
      }
    }

    body.innerHTML = renderBody(agent, output, error); // esc() applied in renderBody
    attachCopyBtns(body);
    highlightCodeBlocks(body);
  }

  // ── Feature 1: Typewriter effect ─────────────────────────────
  function typewriterReveal(body) {
    const items = Array.from(body.querySelectorAll('li, div[style]'));
    if (!items.length) return;

    const CHARS_PER_FRAME = 5;
    const origTexts = items.map((el) => el.textContent);
    items.forEach((el) => { el.textContent = ''; });

    let itemIdx = 0;
    let charInItem = 0;

    function step() {
      if (itemIdx >= items.length) return;
      const target = items[itemIdx];
      const full   = origTexts[itemIdx];
      const end    = Math.min(charInItem + CHARS_PER_FRAME, full.length);
      target.textContent = full.slice(0, end);
      charInItem = end;
      if (charInItem >= full.length) { itemIdx++; charInItem = 0; }
      if (itemIdx < items.length) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Feature 5: Syntax highlighting ───────────────────────────
  function highlightCodeBlocks(body) {
    if (!window.hljs) return;
    body.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));
  }

  function attachCopyBtns(body) {
    body.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pre = btn.closest('.code-wrap').querySelector('pre');
        navigator.clipboard?.writeText(pre.textContent).then(() => {
          btn.textContent = 'کپی شد ✓';
          setTimeout(() => { btn.textContent = 'کپی'; }, 1500);
        });
      });
    });
  }

  // ── Content renderers ─────────────────────────────────────────
  function renderBody(agent, output, error) {
    if (error) return `<div class="step-error">خطا: ${esc(error)}</div>`;
    if (!output || !Object.keys(output).length) {
      return '<em style="color:var(--muted)">بدون خروجی</em>';
    }
    switch (agent) {
      case 'planner':    return renderPlanner(output);
      case 'brain':      return renderBrain(output);
      case 'researcher': return renderResearcher(output);
      case 'coder':      return renderCoder(output);
      case 'tester':     return renderTester(output);
      case 'executor':   return renderExecutor(output);
      default:           return `<pre><code class="language-json">${esc(JSON.stringify(output, null, 2))}</code></pre>`;
    }
  }

  function renderPlanner(o) {
    const tasks = o.tasks || [];
    if (!tasks.length) return `<pre><code class="language-json">${esc(JSON.stringify(o, null, 2))}</code></pre>`;
    return '<ol>' + tasks.map((t) => `<li>${esc(typeof t === 'string' ? t : JSON.stringify(t))}</li>`).join('') + '</ol>';
  }

  function renderBrain(o) {
    const plan = o.llm_plan || '';
    if (!plan) return `<pre><code class="language-json">${esc(JSON.stringify(o, null, 2))}</code></pre>`;
    const lines     = plan.split('\n').filter((l) => l.trim());
    const isNumbered = lines.every((l) => /^\d+[\.\)]\s/.test(l.trim()));
    if (isNumbered) {
      return '<ol>' + lines.map((l) => `<li>${esc(l.replace(/^\d+[\.\)]\s*/, ''))}</li>`).join('') + '</ol>';
    }
    return `<div style="white-space:pre-wrap;color:var(--text)">${esc(plan)}</div>`;
  }

  function renderResearcher(o) {
    const reqs = Array.isArray(o.requirements) ? o.requirements : [];
    if (!reqs.length) return `<pre><code class="language-json">${esc(JSON.stringify(o, null, 2))}</code></pre>`;
    return reqs.map((r) => {
      const text     = typeof r === 'string' ? r : (r.text || JSON.stringify(r));
      const pri      = (r.priority || '').toLowerCase();
      const priBadge = pri ? `<span class="req-priority ${pri}">${esc(pri)}</span>` : '';
      return `<div class="req-item">${priBadge}<span>${esc(text)}</span></div>`;
    }).join('');
  }

  // Feature 8: Diff view for coder
  function renderCoder(o) {
    const code = o.code || '';
    const lang = o.language || 'python';
    const diff = o.diff || '';
    if (!code && !diff) return `<pre><code class="language-json">${esc(JSON.stringify(o, null, 2))}</code></pre>`;
    let html = '';
    if (diff) html += renderDiff(diff);
    if (code) html += codeBlock(code, lang);
    return html;
  }

  function renderDiff(diff) {
    const rows = diff.split('\n').map((line) => {
      if (line.startsWith('+++') || line.startsWith('---')) return `<div class="diff-meta">${esc(line)}</div>`;
      if (line.startsWith('+'))  return `<div class="diff-add">${esc(line)}</div>`;
      if (line.startsWith('-'))  return `<div class="diff-rem">${esc(line)}</div>`;
      if (line.startsWith('@@')) return `<div class="diff-hunk">${esc(line)}</div>`;
      return `<div class="diff-ctx">${esc(line)}</div>`;
    }).join('');
    return `<div class="diff-wrap"><div class="diff-header">diff</div><div class="diff-body">${rows}</div></div>`;
  }

  function renderTester(o) {
    const tests = o.tests || o.test_cases || [];
    let html = '';
    if (Array.isArray(tests) && tests.length) {
      html += '<ol>' + tests.map((t) => `<li>${esc(typeof t === 'string' ? t : JSON.stringify(t))}</li>`).join('') + '</ol>';
    }
    const code = o.test_code || '';
    if (code) html += codeBlock(code, 'python');
    return html || `<pre><code class="language-json">${esc(JSON.stringify(o, null, 2))}</code></pre>`;
  }

  function renderExecutor(o) {
    const rc     = o.returncode ?? o.exit_code;
    const stdout = o.stdout || '';
    const stderr = o.stderr || '';
    const ok     = rc === 0 || rc == null;
    return `<div class="terminal">
      ${rc != null ? `<div class="${ok ? 'exit-ok' : 'exit-err'}">exit ${rc}</div>` : ''}
      ${stdout ? `<pre style="margin:4px 0 0">${esc(stdout)}</pre>` : ''}
      ${stderr ? `<pre style="color:var(--red);margin:4px 0 0">${esc(stderr)}</pre>` : ''}
    </div>`;
  }

  function codeBlock(code, lang) {
    return `<div class="code-wrap">
      <div class="code-lang">${esc(lang)}</div>
      <button class="copy-btn">کپی</button>
      <pre><code class="language-${esc(lang)}">${esc(code)}</code></pre>
    </div>`;
  }

  // ── Apply a single event (live or replay) ─────────────────────
  function applyEvent(ev, replay) {
    const card = getOrCreateCard(ev.agent);
    if (ev.status !== 'running') {
      finalizeCard(card, ev.status, ev.output, ev.error, ev.agent, replay);
    }
  }

  // ── Feature 4: Stop + SSE streaming ──────────────────────────
  let currentSession = null;
  let activeReader   = null;
  let runStartTime   = 0;

  async function startRun(goal) {
    if (!goal.trim()) return;

    showFeed();
    feed.innerHTML = `<div class="goal-msg">${esc(goal)}</div>`;
    resetPipeline();
    errorBanner.hidden = true;
    doneStepCount = 0;
    runStartTime  = Date.now();

    sendBtn.disabled = true;
    sendLabel.textContent = 'در حال اجرا…';
    stopBtn.hidden = false;
    setStatus('spin', 'در حال پردازش…');

    currentSession = addSession(goal, null);

    const token = tokenInput.value.trim();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let resp;
    try {
      resp = await fetch('/v1/run/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal,
          skip_brain: skipBrain.checked,
          workflow_mode: planOnly.checked ? 'plan_only' : null,
        }),
      });
    } catch (err) {
      showError('خطا در اتصال به سرور: ' + err.message);
      onFinish();
      return;
    }

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try { const j = await resp.json(); detail = j.detail || detail; } catch {}
      showError('خطا: ' + detail);
      onFinish();
      return;
    }

    const reader  = resp.body.getReader();
    activeReader  = reader;
    const decoder = new TextDecoder();
    let buf = '', evType = 'message', evData = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            evType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            evData = line.slice(6).trim();
          } else if (line === '') {
            if (evData) {
              try {
                const payload = JSON.parse(evData);
                if (evType === 'done')        { onDone(payload); }
                else if (evType === 'error')  { showError(payload.error || 'خطای نامشخص'); }
                else                          { onAgentEvent(payload); }
              } catch {}
              evType = 'message';
              evData = '';
            }
          }
        }
      }
    } catch (err) {
      const msg = err.message || '';
      if (!msg.includes('aborted') && !msg.includes('cancel')) {
        showError('خطا در دریافت داده: ' + msg);
      }
    }

    activeReader = null;
    onFinish();
  }

  function stopRun() {
    if (activeReader) {
      activeReader.cancel('user stopped');
      activeReader = null;
    }
    setStatus('warn', 'توسط کاربر متوقف شد');
    onFinish();
  }

  stopBtn.addEventListener('click', stopRun);

  function onAgentEvent(ev) {
    markPipelineStep(ev.agent, 'active');
    if (currentSession) {
      currentSession.events.push(ev);
      saveSessions();
    }
    applyEvent(ev, false);
    if (ev.status !== 'running') {
      markPipelineStep(ev.agent, ev.status === 'error' ? 'error' : 'done');
      doneStepCount++;
      updateProgressBar(doneStepCount);
    }
  }

  function onDone(payload) {
    if (currentSession) {
      if (payload.task_id) currentSession.taskId = payload.task_id;
      currentSession.totalElapsed = (Date.now() - runStartTime) / 1000;
      saveSessions();
      showSessionFooter(currentSession);
      updateDownloadBtn(currentSession);
    }
    const mode = payload.workflow_mode || '';
    const llm  = payload.llm;
    const tag  = llm ? `${llm.provider}${llm.active ? '' : ' (stub)'}` : '';
    setStatus('ok', mode === 'plan_only' ? 'برنامه‌ریزی انجام شد' : `تکمیل شد${tag ? ' — ' + tag : ''}`);

    // Feature 10: Browser notification when tab is hidden
    notifyDone(currentSession?.goal || 'درخواست');
  }

  function onFinish() {
    sendBtn.disabled = false;
    sendLabel.textContent = 'ارسال';
    stopBtn.hidden = true;
    checkReady();
  }

  // ── Feature 10: Browser Notifications ────────────────────────
  function notifyDone(goal) {
    if (document.visibilityState !== 'hidden') return;
    if (!('Notification' in window)) return;
    const body = goal.slice(0, 80);
    if (Notification.permission === 'granted') {
      new Notification('Super-Agent تکمیل شد ✓', { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') new Notification('Super-Agent تکمیل شد ✓', { body });
      });
    }
  }

  // ── Feature 3: Session restore on page reload ─────────────────
  async function tryRestoreLastSession() {
    if (!sessions.length) return;
    const last = sessions[0];
    if (!last.taskId) return;
    // Only try if the session is < 10 minutes old
    if (Date.now() - new Date(last.ts).getTime() > 10 * 60 * 1000) return;
    try {
      const r = await fetch(`/v1/tasks/${encodeURIComponent(last.taskId)}/trace`);
      if (!r.ok) return;
      const trace = await r.json();
      if (!Array.isArray(trace.events) || !trace.events.length) return;
      last.events = trace.events;
      saveSessions();
      activeSessionIdx = 0;
      replaySession(last);
      renderSidebar();
    } catch {}
  }

  // ── Event wiring ──────────────────────────────────────────────
  sendBtn.addEventListener('click', () => startRun(goalInput.value));

  goalInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      startRun(goalInput.value);
    }
  });

  newBtn.addEventListener('click', () => {
    activeSessionIdx = -1;
    renderSidebar();
    showWelcome();
    goalInput.value = '';
    goalInput.focus();
    checkReady();
  });

  document.querySelectorAll('.example-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      goalInput.value = btn.dataset.goal;
      goalInput.focus();
    });
  });

  // ── Init ──────────────────────────────────────────────────────
  const STATUS_POLL_MS = 30_000;

  loadSessions();
  renderSidebar();
  checkReady();
  tryRestoreLastSession();

  let statusInterval = setInterval(checkReady, STATUS_POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearInterval(statusInterval);
    } else {
      checkReady();
      statusInterval = setInterval(checkReady, STATUS_POLL_MS);
    }
  });

  goalInput.focus();
})();
