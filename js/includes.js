// js/includes.js
document.addEventListener('DOMContentLoaded', async () => {
  // helper to inject include
  async function injectInclude(selector, url) {
    const container = document.querySelector(selector);
    if (!container) return;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load ' + url);
      const html = await res.text();
      container.innerHTML = html;
      // after injecting, do page-specific setup
      postInjectSetup();
    } catch (err) {
      console.error('Include load error:', err);
      // fallback: keep existing content or show minimal markup
      container.innerHTML = '';
    }
  }

  // inject header and footer
  await injectInclude('[data-include="header"]', '/includes/header.html');
  await injectInclude('[data-include="footer"]', '/includes/footer.html');

  // Make active nav link highlight
  function highlightActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.endsWith(path)) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }
  highlightActiveNav();

  // Wire assistant open link (if present)
  const assistantLink = document.getElementById('open-assistant-link');
  if (assistantLink) {
    assistantLink.addEventListener('click', (e) => {
      e.preventDefault();
      toggleAssistant();
    });
  }

  // show/hide user menu (make accessible)
  window.toggleUserMenu = function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    const btn = document.getElementById('user-btn');
    if (!dropdown || !btn) return;
    const isShown = dropdown.classList.toggle('show');
    btn.setAttribute('aria-expanded', isShown ? 'true' : 'false');
    dropdown.setAttribute('aria-hidden', isShown ? 'false' : 'true');
  };

  // assistant toggle / placeholder
  window.toggleAssistant = function toggleAssistant() {
    const root = document.getElementById('assistant-root');
    if (!root) return;
    if (root.getAttribute('data-open') === '1') {
      closeAssistant();
    } else {
      openAssistant();
    }
  };

  window.openAssistant = function openAssistant() {
    const root = document.getElementById('assistant-root');
    if (!root) return;
    root.setAttribute('data-open', '1');
    root.setAttribute('aria-hidden', 'false');
    // simple UI: a small panel (we will replace with full assistant later)
    root.innerHTML = `
      <div id="assistant-panel" class="assistant-panel" role="dialog" aria-label="Voice Assistant">
        <div class="assistant-header">
          <strong>Assistant</strong>
          <button id="assistant-close" aria-label="Close assistant">✕</button>
        </div>
        <div id="assistant-body" class="assistant-body">
          <p>Hi — I can help collect your profile (qualification, skills, CGPA, experience, location). Click the microphone to speak.</p>
          <div class="assistant-controls">
            <button id="assistant-mic" class="btn btn-primary">🎤 Speak</button>
            <button id="assistant-typing" class="btn btn-outline">Type</button>
          </div>
        </div>
      </div>`;
    document.getElementById('assistant-close').addEventListener('click', closeAssistant);
    document.getElementById('assistant-mic').addEventListener('click', () => {
      // placeholder: actual STT/TTS integration will be added later
      alert('Microphone flow will start (integration step next).');
    });
    // focus management
    document.getElementById('assistant-panel').focus();
  };

  window.closeAssistant = function closeAssistant() {
    const root = document.getElementById('assistant-root');
    if (!root) return;
    root.setAttribute('data-open', '0');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '';
  };

  // called after include injection — useful to re-run some page scripts
  function postInjectSetup() {
    // wire language buttons to existing toggleLanguage if present
    if (typeof toggleLanguage === 'function') {
      const en = document.getElementById('lang-en');
      const hi = document.getElementById('lang-hi');
      if (en) en.classList.toggle('active', (window.currentLanguage || 'en') === 'en');
      if (hi) hi.classList.toggle('active', (window.currentLanguage || 'en') === 'hi');
    }
  }
});
