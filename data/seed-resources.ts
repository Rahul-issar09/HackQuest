import type { COST_STATUS, DIFFICULTIES, RELEVANCE, RESOURCE_TYPES } from "../lib/constants";

export interface SeedResource {
  title: string;
  url: string;
  category: string;
  description: string;
  resourceType: (typeof RESOURCE_TYPES)[number];
  difficulty: (typeof DIFFICULTIES)[number];
  costStatus: (typeof COST_STATUS)[number];
  relevanceClassification: (typeof RELEVANCE)[number];
  tags: string[];
}

// Pricing and account requirements change; all fields are editable in the UI.
export const SEED_RESOURCES: SeedResource[] = [
  { title: "Linux Journey", url: "https://linuxjourney.com/", category: "Linux", description: "Beginner-friendly Linux lessons covering the command line, permissions, processes and more.", resourceType: "course", difficulty: "beginner", costStatus: "unknown", relevanceClassification: "supplementary", tags: ["linux", "shell"] },
  { title: "OverTheWire Bandit", url: "https://overthewire.org/wargames/bandit/", category: "Linux", description: "Wargame for learning Linux command-line and basic CTF skills over SSH.", resourceType: "lab", difficulty: "beginner", costStatus: "unknown", relevanceClassification: "supplementary", tags: ["wargame", "ssh", "linux"] },
  { title: "OverTheWire Krypton", url: "https://overthewire.org/wargames/krypton/", category: "Cryptography", description: "Wargame teaching classical cryptography: Caesar, substitution, Vigenere and more.", resourceType: "lab", difficulty: "beginner", costStatus: "unknown", relevanceClassification: "official_round1", tags: ["crypto", "wargame"] },
  { title: "TryHackMe", url: "https://tryhackme.com/", category: "Guided learning", description: "Guided rooms and learning paths for networking, web and SOC topics. Some content may need an account or subscription.", resourceType: "course", difficulty: "beginner", costStatus: "mixed", relevanceClassification: "supplementary", tags: ["rooms", "soc", "networking"] },
  { title: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security", category: "Web security", description: "Free web security training with interactive labs: SQLi, XSS, SSRF, access control and more.", resourceType: "lab", difficulty: "intermediate", costStatus: "unknown", relevanceClassification: "official_round1", tags: ["web", "sqli", "labs"] },
  { title: "CyLab Security Academy / picoCTF", url: "https://picoctf.org/", category: "CTF practice", description: "Beginner-to-intermediate CTF challenges across categories, with a practice gym.", resourceType: "lab", difficulty: "beginner", costStatus: "unknown", relevanceClassification: "supplementary", tags: ["ctf", "practice"] },
  { title: "CyberChef", url: "https://gchq.github.io/CyberChef/", category: "Encoding/cryptography", description: "Browser tool for encoding, decoding and data transformation recipes.", resourceType: "tool", difficulty: "beginner", costStatus: "free", relevanceClassification: "supplementary", tags: ["encoding", "decoder"] },
  { title: "Nmap documentation", url: "https://nmap.org/book/man.html", category: "Networking", description: "Official Nmap reference manual. Only scan systems you own or are authorised to test.", resourceType: "documentation", difficulty: "intermediate", costStatus: "free", relevanceClassification: "supplementary", tags: ["nmap", "scanning"] },
  { title: "Wireshark documentation", url: "https://www.wireshark.org/docs/", category: "Network analysis", description: "Official Wireshark user guide for packet capture and PCAP analysis.", resourceType: "documentation", difficulty: "intermediate", costStatus: "free", relevanceClassification: "supplementary", tags: ["wireshark", "pcap"] },
  { title: "Ghidra", url: "https://ghidra-sre.org/", category: "Reverse engineering", description: "Open-source software reverse engineering framework.", resourceType: "tool", difficulty: "expert", costStatus: "free", relevanceClassification: "supplementary", tags: ["reverse-engineering", "disassembler"] },
  { title: "CTFtime", url: "https://ctftime.org/", category: "CTF events", description: "Calendar and archive of CTF events and writeups. Use for finding practice material.", resourceType: "article", difficulty: "beginner", costStatus: "free", relevanceClassification: "unverified", tags: ["events", "writeups"] },
];
