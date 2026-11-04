import {
  BarChart3, BookOpen, Calendar, FileText, Gauge, LayoutDashboard, Library, Settings, Swords, Target, Timer,
} from "lucide-react";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Learning Roadmap", icon: Calendar },
  { href: "/resources", label: "Resource Library", icon: Library },
  { href: "/challenges", label: "CTF Challenges", icon: Swords },
  { href: "/mocks", label: "Mock CTF Arena", icon: Timer },
  { href: "/analytics", label: "Performance Analytics", icon: BarChart3 },
  { href: "/weaknesses", label: "Weakness Analysis", icon: Target },
  { href: "/notes", label: "My Notes", icon: BookOpen },
  { href: "/reports", label: "Report Builder", icon: FileText },
  { href: "/readiness", label: "Readiness Score", icon: Gauge },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
