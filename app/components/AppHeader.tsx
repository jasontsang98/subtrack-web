import Link from "next/link";

type Section = "subscriptions" | "insights" | "history" | "reminders" | "system";

export function AppHeader({ active }: { active: Section }) {
  const links: Array<[Section, string, string]> = [
    ["subscriptions", "/", "Subscriptions"],
    ["insights", "/insights", "Insights"],
    ["history", "/history", "History"],
    ["reminders", "/settings", "Reminders"],
    ["system", "/system", "System"],
  ];
  return <header>
    <Link className="brand" href="/"><b>S</b>Subtrack</Link>
    <nav className="page-tabs" aria-label="Primary navigation">
      {links.map(([section, href, label]) =>
        <Link className={active === section ? "current" : ""} href={href} key={section}>{label}</Link>
      )}
    </nav>
  </header>;
}
