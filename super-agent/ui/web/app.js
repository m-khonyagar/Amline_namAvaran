/* ── Super-Agent Cursor-like UI ──────────────────────────────── */
(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const $id  = (id) => document.getElementById(id);
  const feed       = $id('stepsFeed');
  const welcome    = $id('welcome');
  const sessionList= $id('sessionList');
  const pipeline   = $id('pipeline');
  const statusDot  = $id('statusDot');
  const statusLabel= $id('statusLabel');
  const goalInput  = $id('goalInput');
  const sendBtn    = $id('sendBtn');
  const sendLabel  = $id('sendLabel');
  const planOnly   = $id('planOnly');
  const skipBrain  = $id('skipBrain');
  const tokenInput = $id('tokenInput');
  const errorBanner= $id('errorBanner');
  const newBtn     = $id('newBtn');

  // ── Agent metadata ────────────────────────────────────────────
  const AGENTS = {
    planner:    { icon: '📋', label: 'برنامه‌ریزی',          color: 'var(--c-planner)' },
    brain:      { icon: '🧠', label: 'تحلیل هوش مصنوعی',    color: 'var(--c-brain)' },
    researcher: { icon: '🔍', label: 'تحقیق',               color: 'var(--c-researcher)' },
    coder:      { icon: '💻', label: 'کدنویسی',             color: 'var(--c-coder)' },
    tester:     { icon: '🧪', label: 'آزمون',               color: 'var(--c-tester)' },
    executor:   { icon: '⚡', label: 'اجرا',                color: 'var(--c-executor)' },
  };
  const PIPELINE_ORDER = ['planner', 'brain', 'researcher', 'coder', 'tester', 'executor'];

  // ── Session history (localStorage) ───────────────────────────
  const STORAGE_KEY = 'sa_sessions_v1';
  let sessions = [];
  let activeSessionIdx = -1;

  function loadSessions() {
    try { sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { sessions = []; }
  }

  function saveSessions() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50))); }
    catch {}
  }

  function addSession(goal, taskId) {
    const s = {
      goal,
      taskId,
      ts: new Date().toISOString(),
      events: [],
    };
    sessions.unshift(s);
    activeSessionIdx = 0;
    saveSessions();
    renderSidebar();
    return s;
  }

  function renderSidebar() {
    if (!sessions.length) {
      sessionList.innerHTML = '<p class="sidebar-empty">هنوز جلسه‌ای ثبت نشده</p>';
      return;
    }
    sessionList.innerHTML = sessions.map((s, i) => {
      const cls = i === activeSessionIdx ? 'session-item active' : 'session-item';
      const dt  = new Date(s.ts).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
      const g   = esc(s.goal.length > 42 ? s.goal.slice(0, 42) + '…' : s.goal);
      return `<div class="${cls}" data-idx="${i}">
        <span class="session-goal">${g}</span>
        <span class="session-meta">${dt}</span>
      </div>`;
    }).join('');
  }

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
    for (const ev of s.events) {
      applyEvent(ev);
    }
    resetPipeline();
    for (const ev of s.events) {
      markPipelineStep(ev.agent, ev.status === 'error' ? 'error' : 'done');
    }
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
  }

  function showWelcome() {
    welcome.hidden = false;
    feed.hidden    = true;
    errorBanner.hidden = true;
    feed.innerHTML = '';
    resetPipeline();
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.hidden = false;
  }

  // ── Pipeline bar ──────────────────────────────────────────────
  function resetPipeline() {
    pipeline.querySelectorAll('.pip-step').forEach((el) => {
      el.className = 'pip-step';
    });
  }

  function markPipelineStep(agent, state /* 'active'|'done'|'error' */) {
    const el = pipeline.querySelector(`.pip-step[data-agent="${agent}"]`);
    if (el) { el.className = `pip-step ${state}`; }
  }

  // ── Status bar ────────────────────────────────────────────────
  function setStatus(state, text) {
    statusDot.className = `status-dot ${state}`;
    statusLabel.textContent = text;
  }

  async function checkReady() {
    try {
      const r = await fetch('/ready');
      const j = await r.json();
      if (j.provider === 'openai') {
        if (j.api_key_configured) {
          setStatus('ok', `OpenAI — ${j.model || ''}`);
        } else {
          setStatus('warn', 'OpenAI: کلید API تنظیم نشده');
        }
      } else {
        setStatus(j.ollama ? 'ok' : 'bad', j.ollama ? `Ollama — ${j.base_url || ''}` : `Ollama در دسترس نیست`);
      }
    } catch {
      setStatus('bad', 'سرور در دسترس نیست');
    }
  }

  // ── Step card rendering ───────────────────────────────────────
  function getOrCreateCard(agent) {
    let card = feed.querySelector(`.step-card[data-agent="${agent}"]`);
    if (card) return card;

    const meta = AGENTS[agent] || { icon: '🔧', label: agent, color: 'var(--muted)' };
    card = document.createElement('div');
    card.className = 'step-card';
    card.dataset.agent = agent;
    card.dataset.start = Date.now();

    // Build header via DOM API — avoids innerHTML for server-derived agent name/icon
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

  function finalizeCard(card, status, output, error, agent) {
    const elapsed = Math.round((Date.now() - parseInt(card.dataset.start || Date.now(), 10)) / 100) / 10;
    const statusEl = card.querySelector('.step-status');
    const elapsedEl = card.querySelector('.step-elapsed');

    // Use DOM API — avoids innerHTML for status text
    statusEl.textContent = '';
    const badge = document.createElement('span');
    badge.className = status === 'error' ? 'badge-err' : 'badge-ok';
    badge.textContent = status === 'error' ? '✗ خطا' : '✓ انجام شد';
    statusEl.appendChild(badge);

    elapsedEl.textContent = `${elapsed}s`;

    const body = card.querySelector('.step-body');
    body.innerHTML = renderBody(agent, output, error);
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

  function renderBody(agent, output, error) {
    if (error) {
      return `<div class="step-error">خطا: ${esc(error)}</div>`;
    }
    if (!output || Object.keys(output).length === 0) {
      return '<em style="color:var(--muted)">بدون خروجی</em>';
    }

    switch (agent) {
      case 'planner': return renderPlanner(output);
      case 'brain':   return renderBrain(output);
      case 'researcher': return renderResearcher(output);
      case 'coder':   return renderCoder(output);
      case 'tester':  return renderTester(output);
      case 'executor': return renderExecutor(output);
      default:        return `<pre>${esc(JSON.stringify(output, null, 2))}</pre>`;
    }
  }

  function renderPlanner(o) {
    const tasks = o.tasks || [];
    if (!tasks.length) return `<pre>${esc(JSON.stringify(o, null, 2))}</pre>`;
    return '<ol>' + tasks.map((t) => `<li>${esc(typeof t === 'string' ? t : JSON.stringify(t))}</li>`).join('') + '</ol>';
  }

  function renderBrain(o) {
    const plan = o.llm_plan || '';
    if (!plan) return `<pre>${esc(JSON.stringify(o, null, 2))}</pre>`;
    // Render numbered list items if they exist
    const lines = plan.split('\n').filter((l) => l.trim());
    const isNumbered = lines.every((l) => /^\d+[\.\)]\s/.test(l.trim()));
    if (isNumbered) {
      return '<ol>' + lines.map((l) => `<li>${esc(l.replace(/^\d+[\.\)]\s*/, ''))}</li>`).join('') + '</ol>';
    }
    return `<div style="white-space:pre-wrap;color:var(--text)">${esc(plan)}</div>`;
  }

  function renderResearcher(o) {
    const reqs = Array.isArray(o.requirements) ? o.requirements : [];
    if (!reqs.length) return `<pre>${esc(JSON.stringify(o, null, 2))}</pre>`;
    return reqs.map((r) => {
      const text = typeof r === 'string' ? r : (r.text || JSON.stringify(r));
      const pri  = (r.priority || '').toLowerCase();
      const priBadge = pri ? `<span class="req-priority ${pri}">${esc(pri)}</span>` : '';
      return `<div class="req-item">${priBadge}<span>${esc(text)}</span></div>`;
    }).join('');
  }

  function renderCoder(o) {
    const code = o.code || '';
    const lang = o.language || 'python';
    if (!code) return `<pre>${esc(JSON.stringify(o, null, 2))}</pre>`;
    return codeBlock(code, lang);
  }

  function renderTester(o) {
    const tests = o.tests || o.test_cases || [];
    let html = '';
    if (Array.isArray(tests) && tests.length) {
      html += '<ol>' + tests.map((t) => `<li>${esc(typeof t === 'string' ? t : JSON.stringify(t))}</li>`).join('') + '</ol>';
    }
    const code = o.test_code || '';
    if (code) html += codeBlock(code, 'python');
    return html || `<pre>${esc(JSON.stringify(o, null, 2))}</pre>`;
  }

  function renderExecutor(o) {
    const rc = o.returncode ?? o.exit_code;
    const stdout = o.stdout || '';
    const stderr = o.stderr || '';
    const ok = rc === 0 || rc == null;
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
      <pre>${esc(code)}</pre>
    </div>`;
  }

  // ── Apply a single event (used for both live and replay) ──────
  function applyEvent(ev) {
    const card = getOrCreateCard(ev.agent);
    if (ev.status !== 'running') {
      finalizeCard(card, ev.status, ev.output, ev.error, ev.agent);
    }
  }

  // ── Run / SSE streaming ───────────────────────────────────────
  let currentSession = null;

  async function startRun(goal) {
    if (!goal.trim()) return;

    showFeed();
    feed.innerHTML = `<div class="goal-msg">${esc(goal)}</div>`;
    resetPipeline();
    errorBanner.hidden = true;

    sendBtn.disabled = true;
    sendLabel.textContent = 'در حال اجرا…';
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

    // Process SSE stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let evType = 'message';
    let evData = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            evType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            evData = line.slice(6).trim();
          } else if (line === '') {
            if (evData) {
              try {
                const payload = JSON.parse(evData);
                if (evType === 'done') {
                  onDone(payload);
                } else if (evType === 'error') {
                  showError(payload.error || 'خطای نامشخص');
                } else {
                  onAgentEvent(payload);
                }
              } catch {}
              evType = 'message';
              evData = '';
            }
          }
        }
      }
    } catch (err) {
      if (!err.message.includes('aborted')) {
        showError('خطا در دریافت داده: ' + err.message);
      }
    }

    onFinish();
  }

  function onAgentEvent(ev) {
    // Mark pipeline step as active
    markPipelineStep(ev.agent, 'active');

    // Store in session
    if (currentSession) {
      currentSession.events.push(ev);
      saveSessions();
    }

    applyEvent(ev);

    if (ev.status !== 'running') {
      markPipelineStep(ev.agent, ev.status === 'error' ? 'error' : 'done');
    }
  }

  function onDone(payload) {
    if (currentSession && payload.task_id) {
      currentSession.taskId = payload.task_id;
      saveSessions();
    }
    const mode = payload.workflow_mode || '';
    const llm  = payload.llm;
    const tag  = llm ? `${llm.provider}${llm.active ? '' : ' (stub)'}` : '';
    setStatus('ok', mode === 'plan_only' ? 'برنامه‌ریزی انجام شد' : `تکمیل شد${tag ? ' — ' + tag : ''}`);
  }

  function onFinish() {
    sendBtn.disabled = false;
    sendLabel.textContent = 'ارسال';
    checkReady();
  }

  // ── Event wiring ──────────────────────────────────────────────
  sendBtn.addEventListener('click', () => {
    startRun(goalInput.value);
  });

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
  loadSessions();
  renderSidebar();
  checkReady();
  // Poll status only when the tab is visible
  let statusInterval = setInterval(checkReady, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(statusInterval);
    } else {
      checkReady();
      statusInterval = setInterval(checkReady, 30_000);
    }
  });
  goalInput.focus();
})();

