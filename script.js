/* ---------------------------------------------------------------------- *
 * Live background: layered growth curves, like an academic progress
 * chart streaming slowly from right to left — each layer trending
 * gently upward, echoing skills and performance building over time.
 * Respects prefers-reduced-motion by drawing one still frame instead of
 * animating.
 * ---------------------------------------------------------------------- */
(function initLiveBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  // Back-to-front: furthest layer is faintest and slowest, nearest is
  // boldest and fastest, giving the scene a little depth.
  const LAYERS = [
    { color: [227, 162, 58], alpha: 0.09, speed: 0.0009, amp: 0.05, slope: 0.16, baseline: 0.78, seed: 1.3 },
    { color: [226, 83, 46], alpha: 0.12, speed: 0.0014, amp: 0.07, slope: 0.24, baseline: 0.66, seed: 4.1 },
    { color: [226, 83, 46], alpha: 0.20, speed: 0.0020, amp: 0.06, slope: 0.30, baseline: 0.54, seed: 8.7 },
  ];
  const MARKER_GAP = 140; // px between data-point markers along a curve

  let width, height, dpr, rafId, t = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Height of a curve at horizontal position x (px), for a given layer
  // and time offset — a gentle upward trend with soft noise on top.
  function curveY(layer, x, time) {
    const progress = x / width; // 0 → 1 across the viewport
    const wobble =
      Math.sin(progress * 6 + time + layer.seed) * layer.amp +
      Math.sin(progress * 2.3 - time * 0.6 + layer.seed * 1.7) * layer.amp * 0.6;
    const trend = layer.baseline - progress * layer.slope + wobble;
    return trend * height;
  }

  function drawLayer(layer, time) {
    const step = 8;
    ctx.beginPath();
    ctx.moveTo(0, curveY(layer, 0, time));
    for (let x = step; x <= width; x += step) {
      ctx.lineTo(x, curveY(layer, x, time));
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const [r, g, b] = layer.color;
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${layer.alpha})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, curveY(layer, 0, time));
    for (let x = step; x <= width; x += step) {
      ctx.lineTo(x, curveY(layer, x, time));
    }
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.6, layer.alpha + 0.28)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Sparse data-point markers along the line, like readings on a chart.
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.7, layer.alpha + 0.4)})`;
    for (let x = MARKER_GAP / 2; x < width; x += MARKER_GAP) {
      const y = curveY(layer, x, time);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    LAYERS.forEach((layer) => drawLayer(layer, t * layer.speed));
  }

  function loop() {
    t += 1;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(rafId);
    resize();
    if (reduceMotion) {
      draw();
    } else {
      loop();
    }
  });

  resize();
  if (reduceMotion) {
    draw();
  } else {
    loop();
  }
})();

// Custom number-input steppers (replacing the native, unstyleable
// up/down spinner) so the controls follow the app's theme.
document.querySelectorAll(".number-field__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const step = parseFloat(input.step) || 1;
    const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
    const max = input.max !== "" ? parseFloat(input.max) : Infinity;
    const decimals = (input.step.split(".")[1] || "").length;
    const current = parseFloat(input.value);
    const base = Number.isNaN(current) ? min : current;
    const delta = btn.classList.contains("number-field__btn--up") ? step : -step;
    const next = Math.min(max, Math.max(min, base + delta));
    input.value = decimals ? next.toFixed(decimals) : String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

// Replace native <select> dropdowns with a custom-built listbox so the
// hovered-option color is fully theme-controlled (the browser's own
// native highlight — that light-blue row — can't be recolored via CSS).
// The original <select> is kept, just visually hidden, so form
// submission and the existing validate()/readFormData() code don't need
// to change at all.
function enhanceSelect(select) {
  const wrapper = document.createElement("div");
  wrapper.className = "select-custom";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  select.classList.add("visually-hidden");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "select-custom__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const labelSpan = document.createElement("span");
  trigger.appendChild(labelSpan);

  const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  chevron.setAttribute("class", "select-custom__chevron");
  chevron.setAttribute("viewBox", "0 0 12 8");
  chevron.innerHTML =
    '<path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  trigger.appendChild(chevron);
  wrapper.appendChild(trigger);

  const list = document.createElement("div");
  list.className = "select-custom__list";
  list.setAttribute("role", "listbox");
  wrapper.appendChild(list);

  const rows = [];
  Array.from(select.options).forEach((opt) => {
    if (opt.disabled) return; // skip the "Choose…" placeholder
    const row = document.createElement("div");
    row.className = "select-custom__option";
    row.setAttribute("role", "option");
    row.dataset.value = opt.value;
    row.textContent = opt.textContent;
    row.tabIndex = -1;
    row.addEventListener("click", () => {
      select.value = opt.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
      close();
      trigger.focus();
    });
    row.addEventListener("keydown", (e) => onOptionKeydown(e, row));
    list.appendChild(row);
    rows.push(row);
  });

  function sync() {
    const current = select.options[select.selectedIndex];
    const isPlaceholder = !current || current.disabled || current.value === "";
    labelSpan.textContent = current ? current.textContent : "Select";
    trigger.dataset.placeholder = isPlaceholder ? "true" : "false";
    rows.forEach((row) => {
      row.setAttribute("aria-selected", row.dataset.value === select.value ? "true" : "false");
    });
  }

  function open() {
    wrapper.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function close() {
    wrapper.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function onOptionKeydown(e, row) {
    const i = rows.indexOf(row);
    if (e.key === "ArrowDown") { e.preventDefault(); (rows[i + 1] || rows[0]).focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (rows[i - 1] || rows[rows.length - 1]).focus(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); row.click(); }
    else if (e.key === "Escape") { close(); trigger.focus(); }
  }

  trigger.addEventListener("click", () => {
    wrapper.classList.contains("is-open") ? close() : open();
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
      const activeIndex = rows.findIndex((r) => r.getAttribute("aria-selected") === "true");
      (rows[activeIndex + 1] || rows[0])?.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) close();
  });

  sync();
}

document.querySelectorAll("#predict-form select").forEach(enhanceSelect);

const API_URL = "https://student-employability-score-prediction.onrender.com/predict";

const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const resultError = document.getElementById("result-error");
const resultNote = document.getElementById("result-note");
const scoreValue = document.getElementById("score-value");
const scoreBand = document.getElementById("score-band");
const gaugeFill = document.getElementById("gauge-fill");
const gaugeNeedle = document.getElementById("gauge-needle");
const gaugeSvg = document.querySelector(".gauge");
const improvementPanel = document.getElementById("improvement-panel");
const improvementList = document.getElementById("improvement-list");
const improvementTitle = document.getElementById("improvement-title");

const GAUGE_ARC_LENGTH = 298; // path length of the semicircle drawn in the SVG
let displayedScore = 0; // last value shown, used as the count-up start point
let countRafId = null;

// Live-update the slider value readouts and fill color as they're dragged.
const sliders = [
  { id: "programming_skill", min: 1, max: 10 },
  { id: "communication_skills", min: 3, max: 10 },
  { id: "problem_solving", min: 1, max: 10 },
  { id: "resume_score", min: 44, max: 100 },
];

sliders.forEach(({ id, min, max }) => {
  const input = document.getElementById(id);
  const output = document.getElementById(`${id}_out`);
  const paint = () => {
    output.textContent = input.value;
    const pct = ((input.value - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(90deg, var(--coral) ${pct}%, var(--line) ${pct}%)`;
  };
  input.addEventListener("input", paint);
  paint();
});

// Field-level constraints mirrored from the Student pydantic model,
// used only to give instant, specific feedback before hitting the API.
const numericRules = {
  cgpa: { min: 2, max: 4, label: "CGPA" },
  internships: { min: 0, max: 5, label: "Internships" },
  resume_score: { min: 44, max: 100, label: "Resume score" },
  interview_score: { min: 17, max: 100, label: "Interview score" },
  programming_skill: { min: 1, max: 10, label: "Programming skill" },
  communication_skills: { min: 3, max: 10, label: "Communication skills" },
  problem_solving: { min: 1, max: 10, label: "Problem solving" },
};

// Real-time, per-field feedback for the freely-typed number inputs.
// Sliders and dropdowns are structurally impossible to push out of
// range, so only CGPA, internships, and interview score need this —
// someone can still type "9.9" into a field that only accepts 2–4.
const inlineValidatedFields = ["cgpa", "internships", "interview_score"];

inlineValidatedFields.forEach((id) => {
  const input = document.getElementById(id);
  const errorEl = document.getElementById(`${id}-error`);
  const rule = numericRules[id];
  if (!input || !errorEl || !rule) return;

  function check() {
    if (input.value === "") {
      clear();
      return;
    }
    const value = parseFloat(input.value);
    if (Number.isNaN(value) || value < rule.min || value > rule.max) {
      input.classList.add("is-invalid");
      errorEl.textContent = `${rule.label} must be between ${rule.min} and ${rule.max}.`;
      errorEl.hidden = false;
    } else {
      clear();
    }
  }

  function clear() {
    input.classList.remove("is-invalid");
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  input.addEventListener("blur", check);
  // While the person is actively typing, only re-check (to clear the
  // message the moment it's fixed) if an error is already showing —
  // flagging it on every keystroke before they've finished would nag.
  input.addEventListener("input", () => {
    if (!errorEl.hidden) check();
  });
});

function readFormData() {
  const fd = new FormData(form);
  const raw = Object.fromEntries(fd.entries());

  return {
    major: raw.major,
    cgpa: parseFloat(raw.cgpa),
    academic_performance: raw.academic_performance,
    programming_skill: parseInt(raw.programming_skill, 10),
    gitHub_profile: raw.gitHub_profile,
    internships: parseInt(raw.internships, 10),
    resume_score: parseInt(raw.resume_score, 10),
    communication_skills: parseInt(raw.communication_skills, 10),
    problem_solving: parseInt(raw.problem_solving, 10),
    english_proficiency: raw.english_proficiency,
    interview_score: parseInt(raw.interview_score, 10),
  };
}

function validate(payload) {
  // Report the *first* missing field specifically rather than a generic
  // "fill everything in" — this also guards the case where a field ends
  // up undefined (e.g. a control temporarily missing from the form)
  // rather than an empty string, which a strict `=== ""` check would miss.
  for (const [key, value] of Object.entries(payload)) {
    if (value === "" || value === null || value === undefined || Number.isNaN(value)) {
      const label = FIELD_LABELS[key] || key;
      return `${label} is required — please fill it in.`;
    }
  }

  for (const [key, rule] of Object.entries(numericRules)) {
    const value = payload[key];
    if (value < rule.min || value > rule.max) {
      return `${rule.label} must be between ${rule.min} and ${rule.max}.`;
    }
  }
  return null;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("is-loading", isLoading);
}

function showFormError(message) {
  if (!message) {
    formError.hidden = true;
    formError.textContent = "";
    return;
  }
  formError.hidden = false;
  formError.textContent = message;
}

function showResultError(message) {
  if (!message) {
    resultError.hidden = true;
    resultError.textContent = "";
    return;
  }
  resultError.hidden = false;
  resultError.textContent = message;
  resultNote.hidden = true;
  improvementPanel.hidden = true;
}

function bandFor(score) {
  if (score < 40) return { label: "Needs development", color: "var(--red)" };
  if (score < 70) return { label: "On the right track", color: "var(--amber)" };
  return { label: "Strong hiring readiness", color: "var(--success)" };
}

// Normalizes every submitted field onto a common 0–100 scale (using the
// same bounds as the Student model) so weak areas can be compared and
// ranked against each other, regardless of each field's own units.
const FACTOR_DEFINITIONS = [
  {
    key: "cgpa",
    normalize: (v) => ((v - 2) / (4 - 2)) * 100,
    tip: "Raise your CGPA — every step above roughly 3.3 tends to help.",
  },
  {
    key: "programming_skill",
    normalize: (v) => ((v - 1) / (10 - 1)) * 100,
    tip: "Sharpen programming skills with more hands-on coding projects.",
  },
  {
    key: "resume_score",
    normalize: (v) => ((v - 44) / (100 - 44)) * 100,
    tip: "Polish your resume — clearer structure and stronger project write-ups lift this score.",
  },
  {
    key: "communication_skills",
    normalize: (v) => ((v - 3) / (10 - 3)) * 100,
    tip: "Practice communication — mock interviews or presentations both help.",
  },
  {
    key: "problem_solving",
    normalize: (v) => ((v - 1) / (10 - 1)) * 100,
    tip: "Build problem-solving skill through more structured practice (DSA, case studies).",
  },
  {
    key: "interview_score",
    normalize: (v) => ((v - 17) / (100 - 17)) * 100,
    tip: "Prepare more thoroughly for interviews — this is one of the highest-leverage areas.",
  },
  {
    key: "internships",
    normalize: (v) => (v / 5) * 100,
    tip: "Seek out an internship — real-world experience is a strong differentiator.",
  },
  {
    key: "gitHub_profile",
    normalize: (v) => (v === "Yes" ? 100 : 0),
    tip: "Start a public GitHub profile to showcase your project work.",
  },
  {
    key: "english_proficiency",
    normalize: (v) => ({ Basic: 25, Intermediate: 65, Advanced: 100 }[v] ?? 50),
    tip: "Work on English proficiency — it factors directly into hiring readiness.",
  },
  {
    key: "academic_performance",
    normalize: (v) => ({ Poor: 15, Average: 45, Good: 75, Excellent: 100 }[v] ?? 50),
    tip: "Focus on overall academic performance, not just CGPA alone.",
  },
];

const IMPROVEMENT_THRESHOLD = 65; // below this normalized score, a factor is flagged
const MAX_TIPS = 3;

function buildImprovementTips(payload) {
  if (!payload) return [];
  const weak = FACTOR_DEFINITIONS.map((factor) => ({
    ...factor,
    score: factor.normalize(payload[factor.key]),
  }))
    .filter((f) => Number.isFinite(f.score) && f.score < IMPROVEMENT_THRESHOLD)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_TIPS);

  return weak.map((f) => f.tip);
}

function renderImprovementPanel(payload) {
  const tips = buildImprovementTips(payload);
  improvementList.innerHTML = "";

  if (tips.length === 0) {
    const li = document.createElement("li");
    li.className = "is-positive";
    li.textContent = "Your profile is strong across the board — keep it up.";
    improvementList.appendChild(li);
    improvementTitle.textContent = "How you're doing";
  } else {
    improvementTitle.textContent = "Where to focus next";
    tips.forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      improvementList.appendChild(li);
    });
  }
  improvementPanel.hidden = false;
}

function retriggerAnimation(el, className) {
  // Removing then re-adding a class in the same frame doesn't restart a
  // CSS animation, so force a reflow in between — this makes the pulse
  // fire every time, even if the predicted score repeats exactly.
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function animateCountUp(from, to, durationMs = 900) {
  if (countRafId) cancelAnimationFrame(countRafId);
  const start = performance.now();
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

  function tick(now) {
    const progress = Math.min(1, (now - start) / durationMs);
    const eased = easeOutCubic(progress);
    const value = from + (to - from) * eased;
    scoreValue.textContent = value.toFixed(2);
    if (progress < 1) {
      countRafId = requestAnimationFrame(tick);
    } else {
      scoreValue.textContent = to.toFixed(2);
      displayedScore = to;
    }
  }
  countRafId = requestAnimationFrame(tick);
}

function renderScore(score, payload) {
  const clamped = Math.max(0, Math.min(100, score));
  const { label, color } = bandFor(clamped);

  animateCountUp(displayedScore, score);
  scoreBand.textContent = label;
  scoreBand.style.color = color;

  const offset = GAUGE_ARC_LENGTH - (clamped / 100) * GAUGE_ARC_LENGTH;
  gaugeFill.style.stroke = color;
  gaugeFill.style.strokeDashoffset = offset;

  const angle = (clamped / 100) * 180 - 90;
  gaugeNeedle.style.transform = `rotate(${angle}deg)`;

  retriggerAnimation(scoreValue, "is-updating");
  retriggerAnimation(gaugeSvg, "is-updating");

  renderImprovementPanel(payload);

  resultNote.hidden = true;
  resultError.hidden = true;
}

function resetGauge() {
  displayedScore = 0;
  scoreValue.textContent = "—";
  scoreBand.textContent = "Awaiting your details";
  scoreBand.style.color = "var(--text-soft)";
  gaugeFill.style.strokeDashoffset = GAUGE_ARC_LENGTH;
  gaugeNeedle.style.transform = "rotate(-90deg)";
  improvementPanel.hidden = true;
}

// Human-readable labels for every field, matching what's shown on the
// form itself — used to translate FastAPI's raw Pydantic error text
// (e.g. "Field required", "Input should be greater than or equal to 2")
// into something a non-technical user can act on.
const FIELD_LABELS = {
  major: "Major",
  cgpa: "CGPA",
  academic_performance: "Academic performance",
  programming_skill: "Programming skill",
  gitHub_profile: "GitHub profile",
  internships: "Internships",
  resume_score: "Resume score",
  communication_skills: "Communication skills",
  problem_solving: "Problem solving",
  english_proficiency: "English proficiency",
  interview_score: "Interview score",
};

function humanizeFieldError(field, rawMsg) {
  const label = FIELD_LABELS[field] || field;
  const msg = (rawMsg || "").toLowerCase();

  if (msg.includes("field required") || msg.includes("missing")) {
    return `${label} is required — please fill it in.`;
  }
  if (numericRules[field] && (msg.includes("greater than") || msg.includes("less than"))) {
    const { min, max } = numericRules[field];
    return `${label} must be between ${min} and ${max}.`;
  }
  if (msg.includes("enumeration") || msg.includes("not a valid") || msg.includes("literal")) {
    return `${label} must be one of the listed options.`;
  }
  return `${label}: please check this value and try again.`;
}

function extractApiErrorMessage(status, body) {
  if (status === 422 && body && Array.isArray(body.detail)) {
    const first = body.detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null;
    return field
      ? humanizeFieldError(field, first.msg)
      : "Some of the submitted values were invalid. Please check the form and try again.";
  }
  if (body && typeof body.detail === "string") {
    return body.detail;
  }
  return `The server responded with an error (status ${status}).`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showFormError(null);
  showResultError(null);

  const payload = readFormData();
  const validationMessage = validate(payload);
  if (validationMessage) {
    showFormError(validationMessage);
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      showResultError(extractApiErrorMessage(response.status, body));
      return;
    }

    renderScore(body.predicted_employability_score, payload);
  } catch (err) {
    showResultError(
      "Couldn't reach the prediction service. Make sure the FastAPI server is running at https://student-employability-score-prediction.onrender.com."
    );
  } finally {
    setLoading(false);
  }
});

resetGauge();
