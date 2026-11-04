import type { RELEVANCE } from "../lib/constants";

type Rel = (typeof RELEVANCE)[number];

export interface SeedDay {
  n: number;
  date: string; // YYYY-MM-DD
  title: string;
  domain: string;
  topics: string[];
  resources: string[]; // resource titles from seed-resources
  practice: string; // learning/practice column from the roadmap document
  relevance: Rel;
  revision?: boolean; // user already has experience: revision / advanced practice
  rest?: boolean;
  ctf: string;
  note?: string;
}

const D = (n: number) => {
  const d = new Date(Date.UTC(2026, 10, 4 + (n - 1)));
  return d.toISOString().slice(0, 10);
};

export const SEED_DAYS: SeedDay[] = [
  { n: 1, date: D(1), title: "Linux navigation, files and shell basics", domain: "Linux", topics: ["Linux navigation", "Files and directories", "Shell basics"], resources: ["Linux Journey"], practice: "Linux Journey; introductory shell exercises", relevance: "supplementary", ctf: "Beginner Linux shell exercises" },
  { n: 2, date: D(2), title: "Permissions, users and processes", domain: "Linux", topics: ["File permissions", "Users and groups", "Processes"], resources: ["Linux Journey"], practice: "Linux Journey", relevance: "supplementary", ctf: "Beginner Linux permissions challenges" },
  { n: 3, date: D(3), title: "SSH, hidden files, grep, find, strings", domain: "Linux", topics: ["SSH", "Hidden files", "grep", "find", "strings"], resources: ["OverTheWire Bandit"], practice: "OverTheWire Bandit", relevance: "supplementary", ctf: "Bandit levels 0-10" },
  { n: 4, date: D(4), title: "Linux CTF problem solving", domain: "Linux", topics: ["Linux CTF problem solving"], resources: ["OverTheWire Bandit"], practice: "OverTheWire Bandit", relevance: "supplementary", ctf: "Bandit levels 10-20" },
  { n: 5, date: D(5), title: "Base64, hex, binary, Caesar", domain: "Cryptography", topics: ["Base64", "Hex", "Binary", "Caesar cipher"], resources: ["OverTheWire Krypton", "CyberChef"], practice: "OverTheWire Krypton; CyberChef", relevance: "official_round1", ctf: "Krypton levels 0-3" },
  { n: 6, date: D(6), title: "Substitution and XOR fundamentals", domain: "Cryptography", topics: ["Substitution ciphers", "XOR fundamentals"], resources: ["OverTheWire Krypton", "CyberChef"], practice: "Krypton; small decoding exercises", relevance: "official_round1", ctf: "Krypton levels 4-6" },
  { n: 7, date: D(7), title: "Beginner Linux + crypto mini mock", domain: "Linux", topics: ["Linux", "Basic cryptography", "Timed practice"], resources: ["CyLab Security Academy / picoCTF"], practice: "CyLab Security Academy / picoCTF", relevance: "supplementary", ctf: "Timed mini mock: 3-4 beginner challenges" },
  { n: 8, date: D(8), title: "SQLi revision, UNION-based SQLi", domain: "Web Security", topics: ["SQL injection", "UNION-based SQLi"], resources: ["PortSwigger Web Security Academy"], practice: "PortSwigger Web Security Academy", relevance: "official_round1", revision: true, ctf: "PortSwigger SQLi labs (UNION)" },
  { n: 9, date: D(9), title: "Blind SQLi and error-based SQLi", domain: "Web Security", topics: ["Blind SQLi", "Error-based SQLi"], resources: ["PortSwigger Web Security Academy"], practice: "PortSwigger", relevance: "official_round1", revision: true, ctf: "PortSwigger blind/error SQLi labs" },
  { n: 10, date: D(10), title: "Reflected, stored and DOM XSS", domain: "Web Security", topics: ["Reflected XSS", "Stored XSS", "DOM XSS"], resources: ["PortSwigger Web Security Academy"], practice: "PortSwigger", relevance: "supplementary", ctf: "PortSwigger XSS labs" },
  { n: 11, date: D(11), title: "File upload vulnerabilities", domain: "Web Security", topics: ["File upload vulnerabilities"], resources: ["PortSwigger Web Security Academy"], practice: "PortSwigger", relevance: "supplementary", ctf: "PortSwigger file upload labs" },
  { n: 12, date: D(12), title: "LFI, path traversal and command injection", domain: "Web Security", topics: ["LFI", "Path traversal", "Command injection"], resources: ["PortSwigger Web Security Academy", "TryHackMe"], practice: "Guided authorised labs", relevance: "supplementary", ctf: "Authorised path traversal / command injection labs" },
  { n: 13, date: D(13), title: "SSRF, IDOR and authentication revision", domain: "Web Security", topics: ["SSRF", "IDOR", "Authentication"], resources: ["PortSwigger Web Security Academy"], practice: "PortSwigger", relevance: "supplementary", revision: true, ctf: "PortSwigger SSRF / access control labs" },
  { n: 14, date: D(14), title: "Web security mini CTF", domain: "Web Security", topics: ["Web application security", "Timed practice"], resources: ["CyLab Security Academy / picoCTF"], practice: "CyLab / authorised practice labs", relevance: "official_round1", ctf: "Timed web mini CTF" },
  { n: 15, date: D(15), title: "TCP/IP, DNS, HTTP and ports", domain: "Networking", topics: ["TCP/IP", "DNS", "HTTP", "Ports"], resources: ["TryHackMe"], practice: "TryHackMe / documentation", relevance: "supplementary", ctf: "TryHackMe networking fundamentals rooms" },
  { n: 16, date: D(16), title: "Nmap and service enumeration", domain: "Networking", topics: ["Nmap", "Service enumeration"], resources: ["Nmap documentation", "TryHackMe"], practice: "TryHackMe / local labs", relevance: "supplementary", ctf: "Nmap room + local lab scan (own systems only)" },
  { n: 17, date: D(17), title: "Wireshark and PCAP analysis", domain: "Networking", topics: ["Wireshark", "PCAP analysis"], resources: ["Wireshark documentation", "CyLab Security Academy / picoCTF"], practice: "CyLab / authorised sample captures", relevance: "supplementary", note: "Network analysis is named for Round 1 Intermediate; Wireshark/PCAP specifics are supplementary.", ctf: "PCAP analysis challenges" },
  { n: 18, date: D(18), title: "File signatures and metadata", domain: "Digital Forensics", topics: ["File signatures", "Metadata", "ExifTool"], resources: ["CyLab Security Academy / picoCTF"], practice: "ExifTool and sample files", relevance: "supplementary", note: "Digital forensics is named in Round 2 rules, not the Round 1 category descriptions. File analysis is supplementary CTF practice.", ctf: "Metadata / file signature challenges" },
  { n: 19, date: D(19), title: "Steganography, Binwalk and strings", domain: "Digital Forensics", topics: ["Steganography", "Binwalk", "strings"], resources: ["CyLab Security Academy / picoCTF"], practice: "CyLab / sample files", relevance: "supplementary", note: "Steganography is supplementary CTF practice, not named for Round 1.", ctf: "Stego challenges" },
  { n: 20, date: D(20), title: "Logs, SIEM and alert analysis", domain: "SOC", topics: ["Log analysis", "SIEM", "Alert triage"], resources: ["TryHackMe"], practice: "TryHackMe SOC learning", relevance: "official_round1", ctf: "SOC rooms / log analysis" },
  { n: 21, date: D(21), title: "Incident response and mixed CTF", domain: "SOC", topics: ["Incident response", "Mixed CTF"], resources: ["CyLab Security Academy / picoCTF", "TryHackMe"], practice: "CyLab / TryHackMe", relevance: "official_round1", ctf: "Mixed CTF set" },
  { n: 22, date: D(22), title: "ELF/PE fundamentals", domain: "Reverse Engineering", topics: ["ELF format", "PE format"], resources: [], practice: "Official documentation and safe sample files", relevance: "official_round1", note: "Reverse engineering is described under Round 1 Expert (stretch).", ctf: "Safe sample binaries (no live malware)" },
  { n: 23, date: D(23), title: "Ghidra, strings and basic disassembly", domain: "Reverse Engineering", topics: ["Ghidra", "strings", "Disassembly"], resources: ["Ghidra"], practice: "Ghidra documentation and beginner exercises", relevance: "official_round1", note: "Reverse engineering is described under Round 1 Expert (stretch). Ghidra itself is a supplementary tool choice.", ctf: "Beginner crackme-style exercises" },
  { n: 24, date: D(24), title: "Python scripting for CTF tasks", domain: "Python Scripts", topics: ["Python scripting", "Automating CTF decoding tasks"], resources: [], practice: "Python practice", relevance: "supplementary", ctf: "Write small decoders / parsers" },
  { n: 25, date: D(25), title: "RSA, AES and XOR revision", domain: "Cryptography", topics: ["RSA", "AES", "XOR"], resources: ["OverTheWire Krypton", "CyLab Security Academy / picoCTF"], practice: "Krypton / CyLab", relevance: "official_round1", note: "Advanced cryptography is described under Round 1 Expert (stretch).", ctf: "RSA / AES basics challenges" },
  { n: 26, date: D(26), title: "AI security fundamentals", domain: "AI Security", topics: ["AI/ML security fundamentals"], resources: [], practice: "Authorised learning resources", relevance: "supplementary", note: "AI/ML is mentioned for Round 1 Intermediate as part of advanced methodologies; specific AI attack types are supplementary unless confirmed by official material.", ctf: "Authorised AI security learning labs" },
  { n: 27, date: D(27), title: "Source-code analysis and mixed vulnerabilities", domain: "Web Security", topics: ["Source-code analysis", "Mixed vulnerabilities"], resources: ["TryHackMe"], practice: "TryHackMe / safe labs", relevance: "later_round", note: "Source-code analysis is listed for Round 2 rules.", ctf: "Code review + mixed vulnerability labs" },
  { n: 28, date: D(28), title: "Mixed CTF practice", domain: "Web Security", topics: ["Mixed CTF practice"], resources: ["CyLab Security Academy / picoCTF"], practice: "CyLab / picoCTF", relevance: "supplementary", ctf: "Mixed timed set across categories" },
  { n: 29, date: D(29), title: "Six-hour mock CTF simulation", domain: "Mock", topics: ["Full mock simulation"], resources: [], practice: "Six-hour mock CTF simulation (Mock CTF Arena)", relevance: "supplementary", ctf: "Run the Dec 2 mock in the Mock CTF Arena", note: "Personal preparation date, not an official contest date." },
  { n: 30, date: D(30), title: "Review failed challenges; repeat without walkthroughs", domain: "Review", topics: ["Failed-challenge review", "Retry without walkthroughs"], resources: [], practice: "Review failed challenges; repeat without walkthroughs", relevance: "supplementary", ctf: "Work the retry queue", revision: true },
  { n: 31, date: D(31), title: "Revise notes, verify tools and reporting template; rest", domain: "Review", topics: ["Note revision", "Tool and connectivity check", "Reporting template check"], resources: [], practice: "Revise notes, verify tools, connectivity and reporting template; rest", relevance: "supplementary", rest: true, ctf: "Light revision only", note: "Check the current official TCS report template and size limit on the contest site. Round 1 date (Dec 5) is configured in Settings." },
];

export const SEED_MOCKS = [
  { title: "Mock CTF 1 (suggested)", date: "2026-11-16" },
  { title: "Mock CTF 2 (suggested)", date: "2026-11-26" },
  { title: "Mock CTF 3 - full simulation (suggested)", date: "2026-12-02" },
];
