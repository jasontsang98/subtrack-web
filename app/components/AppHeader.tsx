import Link from "next/link";
import Image from "next/image";

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
    <Link className="brand" href="/"><Image src="/icon-192.png" width={34} height={34} alt="" priority />Subtrack</Link>
    <nav className="page-tabs" aria-label="Primary navigation">
      {links.map(([section, href, label]) =>
        <Link className={active === section ? "current" : ""} href={href} key={section}>{label}</Link>
      )}
      <form action="/api/auth/logout" method="post"><button className="logout-button">Sign out</button></form>
    </nav>
  </header>;
}
