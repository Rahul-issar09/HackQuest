import type { DIFFICULTIES, RELEVANCE } from "../lib/constants";

export interface SeedChallenge {
  title: string;
  platform: string;
  url: string;
  category: string;
  difficulty: (typeof DIFFICULTIES)[number];
  description: string;
  relevanceClassification: (typeof RELEVANCE)[number];
  tags: string[];
  day: number; // suggested roadmap day
}

/** Catalogue entries only (practice targets). They contain no attempts: all analytics start empty. */
export const SEED_CHALLENGES: SeedChallenge[] = [
  { title: "Bandit: levels 0-10", platform: "OverTheWire", url: "https://overthewire.org/wargames/bandit/", category: "Linux", difficulty: "beginner", description: "First ten Bandit levels: SSH, hidden files, find/grep.", relevanceClassification: "supplementary", tags: ["ssh", "linux"], day: 3 },
  { title: "Krypton: levels 0-6", platform: "OverTheWire", url: "https://overthewire.org/wargames/krypton/", category: "Cryptography", difficulty: "beginner", description: "Classical ciphers: Caesar, substitution, Vigenere.", relevanceClassification: "official_round1", tags: ["classical-crypto"], day: 5 },
  { title: "PortSwigger: SQL injection labs", platform: "PortSwigger", url: "https://portswigger.net/web-security/sql-injection", category: "Web Security", difficulty: "intermediate", description: "UNION, blind and error-based SQL injection labs.", relevanceClassification: "official_round1", tags: ["sqli"], day: 8 },
  { title: "PortSwigger: XSS labs", platform: "PortSwigger", url: "https://portswigger.net/web-security/cross-site-scripting", category: "Web Security", difficulty: "intermediate", description: "Reflected, stored and DOM XSS labs.", relevanceClassification: "supplementary", tags: ["xss"], day: 10 },
  { title: "PortSwigger: File upload labs", platform: "PortSwigger", url: "https://portswigger.net/web-security/file-upload", category: "Web Security", difficulty: "intermediate", description: "File upload vulnerability labs.", relevanceClassification: "supplementary", tags: ["file-upload"], day: 11 },
  { title: "PortSwigger: SSRF labs", platform: "PortSwigger", url: "https://portswigger.net/web-security/ssrf", category: "Web Security", difficulty: "intermediate", description: "Server-side request forgery labs.", relevanceClassification: "supplementary", tags: ["ssrf"], day: 13 },
  { title: "PortSwigger: Access control labs", platform: "PortSwigger", url: "https://portswigger.net/web-security/access-control", category: "Web Security", difficulty: "intermediate", description: "IDOR and access control labs.", relevanceClassification: "supplementary", tags: ["idor", "access-control"], day: 13 },
  { title: "picoGym: beginner mixed set", platform: "picoCTF", url: "https://picoctf.org/", category: "Linux", difficulty: "beginner", description: "A timed set of beginner picoGym challenges for the Day 7 mini mock.", relevanceClassification: "supplementary", tags: ["mini-mock"], day: 7 },
  { title: "Wireshark / PCAP analysis set", platform: "picoCTF", url: "https://picoctf.org/", category: "Networking", difficulty: "intermediate", description: "Packet-capture challenges using authorised sample captures.", relevanceClassification: "supplementary", tags: ["pcap", "wireshark"], day: 17 },
  { title: "Metadata and stego set", platform: "picoCTF", url: "https://picoctf.org/", category: "Digital Forensics", difficulty: "intermediate", description: "ExifTool, strings and Binwalk challenges on sample files.", relevanceClassification: "supplementary", tags: ["stego", "exif"], day: 19 },
  { title: "SOC log analysis rooms", platform: "TryHackMe", url: "https://tryhackme.com/", category: "SOC", difficulty: "intermediate", description: "SOC and SIEM log-analysis rooms.", relevanceClassification: "official_round1", tags: ["siem", "logs"], day: 20 },
  { title: "Beginner reverse engineering set", platform: "picoCTF", url: "https://picoctf.org/", category: "Reverse Engineering", difficulty: "expert", description: "Stretch: beginner crackme-style reverse engineering.", relevanceClassification: "official_round1", tags: ["ghidra", "stretch"], day: 23 },
  { title: "RSA / AES basics set", platform: "picoCTF", url: "https://picoctf.org/", category: "Cryptography", difficulty: "expert", description: "Stretch: RSA and AES basics challenges.", relevanceClassification: "official_round1", tags: ["rsa", "aes", "stretch"], day: 25 },
];
