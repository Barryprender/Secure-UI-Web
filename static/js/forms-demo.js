/**
 * Forms Demo — live interaction for the /forms showcase page.
 *
 * Intercepts secure-form-submit events from the three demo forms,
 * performs the fetch itself (for inline response display), and
 * populates the live telemetry panel with behavioral data.
 *
 * Security note: all string values injected into innerHTML are
 * passed through escapeHtml() before insertion.
 */

const DEMO_FORM_IDS = new Set([
  'demo-login-form',
  'demo-subscribe-form',
  'demo-payment-form',
]);

const FORM_LABELS = {
  'demo-login-form':     'Login Form',
  'demo-subscribe-form': 'Subscription Form',
  'demo-payment-form':   'Payment Form',
};

document.addEventListener('secure-form-submit', handleDemoSubmit);

async function handleDemoSubmit(event) {
  const form = event.target;
  const formId = form.id;

  if (!DEMO_FORM_IDS.has(formId)) return;

  // Stop the component's own fetch so we control the response display.
  event.preventDefault();

  const { formData, telemetry = {} } = event.detail;
  const action = form.getAttribute('action');
  const csrfToken = form.getAttribute('csrf-token') ?? '';

  // Update telemetry panel immediately — data is captured at submission time.
  updateTelemetryPanel(telemetry, formId);

  const responsePanel = document.getElementById(formId + '-response');
  showLoading(responsePanel);

  // Disable submit button during in-flight request.
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  // Supplement formData with current secure-select values.
  // The component snapshots values at event-dispatch time; reading them again
  // here guards against any edge case where the snapshot was stale.
  form.querySelectorAll('secure-select[name]').forEach(sel => {
    const n = sel.getAttribute('name');
    if (n) formData[n] = sel.value;
  });

  // For the payment form, attach safe card identifiers from the
  // secure-card element. Full PAN and CVC are never present here.
  const payload = { ...formData, _telemetry: telemetry };
  if (formId === 'demo-payment-form') {
    const cardEl = form.querySelector('secure-card');
    if (cardEl) {
      payload.card_last4 = cardEl.last4 ?? '';
      payload.card_type  = cardEl.cardType ?? '';
    }
  }

  try {
    const res = await fetch(action, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'X-CSRF-Token':  csrfToken,
      },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
    });

    const data = await res.json();
    showResponse(responsePanel, data, res.status);

    // CSRF tokens are single-use (ConsumeToken). Refresh immediately so the
    // form can be submitted again without a page reload.
    refreshCSRFToken(form);
  } catch (err) {
    showNetworkError(responsePanel, err.message);
    // Attempt refresh even on network error — the token may have been consumed.
    refreshCSRFToken(form);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * Fetch a fresh CSRF token from the server and update the form's csrf-token
 * attribute and the hidden input value so the next submission succeeds.
 */
async function refreshCSRFToken(form) {
  try {
    const res = await fetch('/api/demo/csrf-token', {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    const newToken = data?.data?.token;
    if (!newToken) return;

    form.setAttribute('csrf-token', newToken);
    const hidden = form.querySelector('input[name="csrf_token"]');
    if (hidden) hidden.value = newToken;
  } catch {
    // Non-critical: next submission will receive a CSRF error and the user
    // can reload the page to get a fresh token.
  }
}

// ── Response panel helpers ─────────────────────────────────────────────────

function showLoading(panel) {
  if (!panel) return;
  const body = panel.querySelector('.demo-response-body');
  if (body) {
    body.innerHTML = '<p class="demo-response-placeholder demo-response-placeholder--loading">Submitting\u2026</p>';
  }
}

function showResponse(panel, data, httpStatus) {
  if (!panel) return;
  const body = panel.querySelector('.demo-response-body');
  if (!body) return;

  const ok = httpStatus >= 200 && httpStatus < 300;
  const statusClass = ok ? 'demo-response-status--ok' : 'demo-response-status--error';

  // Omit _telemetry from display to keep the panel readable.
  const display = { ...data };
  delete display._telemetry;

  body.innerHTML =
    `<div class="demo-response-status ${escH(statusClass)}">` +
      `HTTP ${escH(String(httpStatus))} &mdash; ${escH(ok ? 'OK' : 'Error')}` +
    `</div>` +
    `<pre class="demo-response-json"><code>${escH(JSON.stringify(display, null, 2))}</code></pre>`;
}

function showNetworkError(panel, message) {
  if (!panel) return;
  const body = panel.querySelector('.demo-response-body');
  if (body) {
    body.innerHTML =
      `<p class="demo-response-status demo-response-status--error">Network error: ${escH(message)}</p>`;
  }
}

// ── Telemetry panel ────────────────────────────────────────────────────────

function updateTelemetryPanel(telemetry, formId) {
  const content = document.getElementById('demo-telemetry-content');
  if (!content) return;

  const formLabel  = escH(FORM_LABELS[formId] ?? formId);
  const score      = Math.min(Math.max(telemetry.riskScore ?? 0, 0), 100);
  const riskClass  = score >= 60 ? 'high' : score >= 30 ? 'med' : 'low';
  const riskLabel  = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  const submittedAt = telemetry.submittedAt
    ? new Date(telemetry.submittedAt).toLocaleTimeString()
    : '—';
  const duration = telemetry.sessionDuration != null
    ? (telemetry.sessionDuration / 1000).toFixed(2) + 's'
    : '—';

  const signalsHtml = (telemetry.riskSignals ?? []).length
    ? telemetry.riskSignals.map(s => `<span class="demo-tel-signal">${escH(s)}</span>`).join('')
    : '<span class="demo-tel-none">none</span>';

  const fieldsHtml = (telemetry.fields ?? []).map(f => {
    const paste    = f.pasteDetected    ? '<span class="demo-tel-flag">paste</span>'    : '—';
    const autofill = f.autofillDetected ? '<span class="demo-tel-flag">autofill</span>' : '—';
    const velocity = f.velocity > 0 ? escH(f.velocity.toFixed(1)) + '/s' : '—';
    return (
      `<tr>` +
        `<td>${escH(f.fieldName)}</td>` +
        `<td class="demo-tel-type">${escH(f.fieldType)}</td>` +
        `<td>${escH(String(f.dwell))}ms</td>` +
        `<td>${velocity}</td>` +
        `<td>${escH(String(f.corrections))}</td>` +
        `<td>${paste}</td>` +
        `<td>${autofill}</td>` +
        `<td>${escH(String(f.focusCount))}</td>` +
      `</tr>`
    );
  }).join('');

  const emptyRow = '<tr><td colspan="8" class="demo-tel-empty">No fields recorded</td></tr>';

  content.innerHTML =
    `<div class="demo-tel-meta">` +
      `<span class="demo-tel-form-name">${formLabel}</span>` +
      `<span class="demo-tel-time">${escH(submittedAt)}</span>` +
      `<span class="demo-tel-duration">${escH(duration)} session</span>` +
    `</div>` +

    `<div class="demo-tel-risk">` +
      `<div class="demo-tel-risk-header">` +
        `<span class="demo-tel-risk-label">Risk Score</span>` +
        `<span class="demo-tel-risk-score demo-tel-risk-score--${escH(riskClass)}">${escH(String(score))} / 100 — ${escH(riskLabel)}</span>` +
      `</div>` +
      `<div class="demo-tel-risk-bar" role="progressbar" aria-valuenow="${escH(String(score))}" aria-valuemin="0" aria-valuemax="100">` +
        `<div class="demo-tel-risk-fill demo-tel-risk-fill--${escH(riskClass)}"></div>` +
      `</div>` +
    `</div>` +

    `<div class="demo-tel-signals">` +
      `<span class="demo-tel-signals-label">Signals:</span>` +
      signalsHtml +
    `</div>` +

    `<div class="demo-tel-table-wrap">` +
      `<table class="demo-tel-table">` +
        `<thead><tr>` +
          `<th>Field</th><th>Type</th><th>Dwell</th><th>Velocity</th>` +
          `<th>Corrections</th><th>Paste</th><th>Autofill</th><th>Focus</th>` +
        `</tr></thead>` +
        `<tbody>${fieldsHtml || emptyRow}</tbody>` +
      `</table>` +
    `</div>` +

    `<details class="demo-tel-raw">` +
      `<summary>Raw JSON</summary>` +
      `<pre><code>${escH(JSON.stringify(telemetry, null, 2))}</code></pre>` +
    `</details>`;

  const fill = content.querySelector('.demo-tel-risk-fill');
  if (fill) fill.style.width = score + '%';
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Escape HTML special characters before inserting into innerHTML. */
function escH(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
