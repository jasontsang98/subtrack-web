"use client";
import { AppHeader } from "@/app/components/AppHeader";
import { FormEvent, useEffect, useState } from "react";

type Settings = { recipientEmail: string | null; timezone: string; sendHour: number; enabled: boolean };
const defaults: Settings = { recipientEmail: "", timezone: "Australia/Sydney", sendHour: 8, enabled: false };

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaults);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reminders/settings")
      .then((response) => response.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("Saving...");
    const response = await fetch("/api/reminders/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setStatus(response.ok ? "Settings saved" : "Could not save settings");
  }

  async function testEmail() {
    setStatus("Sending test...");
    const response = await fetch("/api/reminders/test", { method: "POST" });
    setStatus(response.ok ? "Test email sent" : (await response.json()).error ?? "Test failed");
  }

  return <><AppHeader active="reminders"/><main className="settings-shell">
    <section className="settings-card">
      <em>EMAIL REMINDERS</em>
      <h1>Monday, handled.</h1>
      <p className="settings-intro">Receive a concise report of subscriptions due in the next seven days.</p>
      {loading ? <p>Loading settings...</p> : <form onSubmit={save}>
        <label>Email address<input type="email" required value={settings.recipientEmail ?? ""} onChange={(event) => setSettings({ ...settings, recipientEmail: event.target.value })} placeholder="you@example.com" /></label>
        <div className="settings-row">
          <label>Timezone<input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></label>
          <label>Monday send time<select value={settings.sendHour} onChange={(event) => setSettings({ ...settings, sendHour: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
        </div>
        <label className="switch-row"><input type="checkbox" aria-label="Enable weekly digest" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /><span><strong>Weekly digest</strong><small>Send every Monday when payments are due.</small></span></label>
        <div className="settings-actions"><button type="button" className="ghost" onClick={testEmail}>Send test email</button><button className="primary">Save settings</button></div>
        {status && <p className="settings-status" role="status">{status}</p>}
      </form>}
    </section>
    <aside className="mailpit-note"><strong>Testing locally?</strong><p>All development email is captured by Mailpit at <a href="http://localhost:8025">localhost:8025</a>.</p></aside>
  </main></>;
}
