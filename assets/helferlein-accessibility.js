/* Settings-dialog keyboard support. Does not read or write account/tool data. */
(() => {
  'use strict';
  function init() {
    const dialog = document.getElementById('settingsModal') || document.getElementById('settings-modal');
    if (!dialog) return; // Nachlass settings are an ordinary page section.
    const title = dialog.querySelector('h2, h3');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (title) {
      if (!title.id) title.id = 'helferlein-settings-title';
      dialog.setAttribute('aria-labelledby', title.id);
    } else dialog.setAttribute('aria-label', 'Einstellungen');
    dialog.tabIndex = -1;
    // Several legacy login forms use placeholders without associated labels.
    // Keep existing labels and ARIA names authoritative.
    for (const input of dialog.querySelectorAll('input[type="email"], input[type="password"]')) {
      if (!input.labels.length && !input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby')) {
        input.setAttribute('aria-label', input.type === 'email' ? 'E-Mail-Adresse' : 'Passwort');
      }
    }
    for (const button of dialog.querySelectorAll('button')) {
      if (/^[×✕✖]$/.test(button.textContent.trim()) && !button.hasAttribute('aria-label')) {
        button.setAttribute('aria-label', 'Einstellungen schließen');
      }
    }
    const visible = node => !node.hidden && getComputedStyle(node).visibility !== 'hidden' && node.getClientRects().length > 0;
    const controls = () => Array.from(dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]'))
      .filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest('[inert]') && visible(node));
    let open = false, previousFocus = null;
    function sync() {
      const next = visible(dialog);
      if (next === open) return;
      open = next;
      if (open) {
        previousFocus = document.activeElement;
        (controls()[0] || dialog).focus();
      } else if (previousFocus?.isConnected && visible(previousFocus) &&
                 (dialog.contains(document.activeElement) || document.activeElement === document.body)) {
        previousFocus.focus();
      }
    }
    new MutationObserver(sync).observe(dialog, {attributes: true, attributeFilter: ['class', 'hidden', 'style']});
    document.addEventListener('keydown', event => {
      if (!open || !visible(dialog)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof window.closeSettings === 'function') window.closeSettings();
        else if (typeof window.toggleSettingsModal === 'function') window.toggleSettingsModal();
        sync();
      } else if (event.key === 'Tab') {
        const items = controls();
        const first = items[0] || dialog, last = items[items.length - 1] || dialog;
        if (!items.length || !dialog.contains(document.activeElement) ||
            (event.shiftKey && document.activeElement === first) ||
            (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }, true);
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
