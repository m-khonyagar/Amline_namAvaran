(function () {
  const $ = (id) => document.getElementById(id);

  const statusEl = $("status");
  const form = $("form");
  const goalEl = $("goal");
  const planOnlyEl = $("planOnly");
  const skipBrainEl = $("skipBrain");
  const tokenEl = $("token");
  const submitBtn = $("submit");
  const outEl = $("output");
  const errEl = $("err");

  function authHeaders() {
    const t = (tokenEl.value || "").trim();
    const h = { "Content-Type": "application/json" };
    if (t) h.Authorization = "Bearer " + t;
    return h;
  }

  async function refreshStatus() {
    statusEl.textContent = "در حال بررسی اتصال…";
    statusEl.className = "status";
    try {
      const r = await fetch("/ready");
      const j = await r.json();
      if (j.provider === "openai") {
        if (j.api_key_configured) {
          statusEl.classList.add("ok");
          statusEl.textContent =
            "وضعیت: OpenAI آماده است — مدل " + (j.model || "") + " — می‌توانید درخواست بزنید.";
        } else {
          statusEl.classList.add("bad");
          statusEl.textContent =
            "هشدار: کلید OPENAI_API_KEY روی سرور تنظیم نشده؛ خروجی‌ها فقط حالت آفلاین/استاب خواهد بود.";
        }
      } else {
        if (j.ollama) {
          statusEl.classList.add("ok");
          statusEl.textContent = "وضعیت: Ollama در دسترس است — " + (j.base_url || "");
        } else {
          statusEl.classList.add("bad");
          statusEl.textContent =
            "Ollama در دسترس نیست: " + (j.error || j.base_url || "خطا");
        }
      }
    } catch (e) {
      statusEl.classList.add("bad");
      statusEl.textContent = "نتوانست به /ready وصل شود. آیا سرور روشن است؟";
    }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderMessage(m) {
    const agent = esc(m.agent || "");
    const action = esc(String(m.action || ""));
    const st = esc(m.status || "");
    let body = "";
    if (m.error) {
      body += '<pre class="err">' + esc(m.error) + "</pre>";
    }
    const o = m.output || {};
    if (m.agent === "brain" && o.llm_plan) {
      body += "<pre>" + esc(o.llm_plan) + "</pre>";
    } else if (m.agent === "researcher" && o.requirements) {
      const items = Array.isArray(o.requirements) ? o.requirements : [];
      body +=
        "<ul>" +
        items.map((x) => "<li>" + esc(x.text || JSON.stringify(x)) + "</li>").join("") +
        "</ul>";
    } else if (m.agent === "coder" && o.code) {
      body += "<pre>" + esc(o.code) + "</pre>";
    } else if (m.agent === "tester") {
      body += "<pre>" + esc(JSON.stringify(o, null, 2)) + "</pre>";
    } else if (m.agent === "executor") {
      body += "<pre>" + esc(JSON.stringify(o, null, 2)) + "</pre>";
    } else if (m.agent === "planner") {
      body += "<pre>" + esc(JSON.stringify(o, null, 2)) + "</pre>";
    } else {
      body += "<pre>" + esc(JSON.stringify(m, null, 2)) + "</pre>";
    }
    return (
      '<div class="card"><h3>' +
      agent +
      ' <span class="badge">' +
      action +
      "</span> <span class=\"badge\">" +
      st +
      '</span></h3><div class="card-body">' +
      body +
      "</div></div>"
    );
  }

  function renderSummary(data) {
    const msgs = data.messages || [];
    let plan = "";
    let code = "";
    for (const m of msgs) {
      if (m.agent === "brain" && m.output && m.output.llm_plan) plan = m.output.llm_plan;
      if (m.agent === "coder" && m.output && m.output.code) code = m.output.code;
    }
    if (!plan && !code) return "";
    let h = '<div class="card"><h3>خلاصهٔ سریع</h3>';
    if (plan) h += "<p><strong>برنامه</strong></p><pre>" + esc(plan) + "</pre>";
    if (code) h += "<p><strong>نمونه کد</strong></p><pre>" + esc(code) + "</pre>";
    h += "</div>";
    return h;
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errEl.textContent = "";
    outEl.innerHTML = "";
    const goal = goalEl.value.trim();
    if (!goal) {
      errEl.textContent = "لطفاً درخواست خود را بنویسید.";
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "در حال پردازش…";
    try {
      const body = {
        goal: goal,
        skip_brain: skipBrainEl.checked,
        workflow_mode: planOnlyEl.checked ? "plan_only" : null,
      };
      const r = await fetch("/v1/run", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("پاسخ نامعتبر از سرور");
      }
      if (!r.ok) {
        throw new Error(data.detail || data.error || "خطا " + r.status);
      }
      const meta = data.task_id
        ? '<p class="hint">شناسهٔ کار: <code>' +
          esc(data.task_id) +
          '</code> — ردیابی: <a href="/v1/tasks/' +
          esc(data.task_id) +
          '/trace">/v1/tasks/…/trace</a></p>'
        : "";
      const llm = data.llm
        ? '<p class="hint">LLM: ' +
          esc(String(data.llm.provider)) +
          (data.llm.active ? " (فعال)" : " (غیرفعال — استاب)") +
          "</p>"
        : "";
      let html = "<h2>نتیجه</h2>" + llm + meta + renderSummary(data);
      for (const m of data.messages || []) {
        html += renderMessage(m);
      }
      outEl.innerHTML = html;
    } catch (e) {
      errEl.textContent = e.message || String(e);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "اجرا و دریافت خروجی";
    }
  });

  refreshStatus();
})();
