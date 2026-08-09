"use client";

import { AppHeader } from "@/app/components/AppHeader";
import "./system.css";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

type Backup = {
  id: string;
  trigger: "scheduled" | "manual";
  status: "pending" | "running" | "completed" | "failed";
  filename: string | null;
  sizeBytes: number | null;
  error: string | null;
  requestedAt: string;
  completedAt: string | null;
};

type BackupData = {
  schedule: {
    hour: number;
    timezone: string;
    dailyRetentionDays: number;
    manualRetentionDays: number;
  };
  backups: Backup[];
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "--";

const formatSize = (bytes: number | null) => {
  if (!bytes) return "--";
  return `${(bytes / 1024).toFixed(bytes < 1024 * 1024 ? 0 : 1)} ${bytes < 1024 * 1024 ? "KB" : "MB"}`;
};

export default function SystemPage() {
  const [data, setData] = useState<BackupData | null>(null);
  const [message, setMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/system/backups", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/system/backups", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: BackupData) => {
        if (active) setData(result);
      });
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [load]);

  async function createBackup() {
    setMessage("Backup queued...");
    const response = await fetch("/api/system/backups", { method: "POST" });
    setMessage(response.ok ? "Backup queued. It should complete within one minute." : "Could not queue backup.");
    await load();
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Replace current subscriptions, payment history, reminder settings, and delivery history with this file?")) return;

    setMessage("Validating and importing data...");
    try {
      const payload = JSON.parse(await file.text());
      const response = await fetch("/api/system/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import failed");
      setMessage("Import complete: " + result.imported.subscriptions + " subscriptions and " + result.imported.payments + " payments restored.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed. No data was changed.");
    }
  }

  const latest = data?.backups.find((backup) => backup.status === "completed");

  return <><AppHeader active="system" /><main className="system-shell">
    <section className="system-intro">
      <div><em>SYSTEM & RECOVERY</em><h1>Your safety net.</h1><p>Automatic, verified PostgreSQL backups stored on this machine.</p></div>
      <button className="primary" onClick={createBackup}>Back up now</button>
    </section>

    <section className="system-kpis">
      <article><span>LAST SUCCESSFUL</span><strong>{formatDate(latest?.completedAt ?? null)}</strong><p>{latest?.filename ?? "No backup yet"}</p></article>
      <article><span>SCHEDULE</span><strong>{String(data?.schedule.hour ?? 2).padStart(2, "0")}:00 daily</strong><p>{data?.schedule.timezone ?? "Australia/Sydney"}</p></article>
      <article><span>RETENTION</span><strong>{data?.schedule.dailyRetentionDays ?? 7} days</strong><p>Manual backups: {data?.schedule.manualRetentionDays ?? 30} days</p></article>
    </section>

    {message && <p className="system-message" role="status">{message}</p>}

    <section className="backup-panel">
      <div className="panel-heading"><div><h2>Backup archive</h2><p>Completed files have passed a PostgreSQL archive validation check.</p></div></div>
      {!data ? <p className="history-empty">Loading backups...</p> :
        data.backups.length === 0 ? <p className="history-empty">No backups yet. Create the first one now.</p> :
        <div className="backup-list">{data.backups.map((backup) =>
          <article key={backup.id}>
            <span className={`backup-status ${backup.status}`}>{backup.status}</span>
            <div><strong>{backup.filename ?? "Preparing backup..."}</strong><small>{backup.trigger} / requested {formatDate(backup.requestedAt)}</small>{backup.error && <small className="backup-error">{backup.error}</small>}</div>
            <span>{formatSize(backup.sizeBytes)}</span>
            {backup.status === "completed" ? <a className="ghost backup-download" href={`/api/system/backups/${backup.id}/download`}>Download</a> : <span />}
          </article>
        )}</div>}
    </section>

    <section className="portable-panel">
      <div>
        <em>MOVE YOUR DATA</em>
        <h2>Portable export and import.</h2>
        <p>Export subscriptions, payment history, reminder settings, and email delivery history as one versioned JSON file.</p>
      </div>
      <div className="portable-actions">
        <a className="ghost" href="/api/system/data" download>Export all data</a>
        <button className="primary" type="button" onClick={()=>importInput.current?.click()}>Import data</button>
        <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importData}/>
      </div>
      <p className="portable-warning">Import replaces current user data in one transaction. Create or download a PostgreSQL backup first if you may need to roll back.</p>
    </section>
    <section className="restore-panel">
      <div><em>GUIDED RESTORE</em><h2>Recovery stays outside the app.</h2><p>Download or select a verified backup, then run the recovery command from the project folder. This remains available even if Subtrack cannot start.</p></div>
      <code>./scripts/restore.sh backups/your-backup.dump</code>
      <p className="restore-warning">Restore creates a maintenance window and replaces all current data. The script requires typing RESTORE before it proceeds.</p>
    </section>
  </main></>;
}
