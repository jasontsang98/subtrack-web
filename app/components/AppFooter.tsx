export function AppFooter() {
  return <footer className="admin-footer">
    <div><strong>Subtrack</strong><span>Self-hosted · PostgreSQL</span></div>
    <p>Forecasts and reminders are informational only. Confirm charges with each provider.</p>
    <nav aria-label="Administrative links">
      <a href="https://github.com/jasontsang98/subscription-manager" target="_blank" rel="noreferrer">Documentation</a>
      <a href="https://github.com/jasontsang98/subscription-manager/issues" target="_blank" rel="noreferrer">Contact support</a>
    </nav>
  </footer>;
}
