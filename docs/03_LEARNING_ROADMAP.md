# 3. Learning Roadmap and Seed Content

## 3.1 Schedule configuration

- Start date default: 4 November 2026.
- Preparation days: 4 November through 4 December 2026 inclusive (31 calendar days).
- Round 1 date default: 5 December 2026.
- All dates must be editable in Settings.
- The app must calculate remaining days dynamically from configured dates. Do not hard-code a static countdown.
- The roadmap is a recommendation, not an official TCS syllabus.

## 3.2 Difficulty strategy

Primary target: Intermediate.
- Beginner: complete efficiently to secure fundamentals and confidence.
- Intermediate: main learning and practice allocation.
- Expert: selected stretch challenges; do not let one hard challenge consume excessive time.

## 3.3 Daily plan

### Week 1 — Linux, fundamentals and basic cryptography

| Day | Date | Topics | Learning/practice |
|---|---|---|---|
| 1 | Nov 4 | Linux navigation, files and shell basics | Linux Journey; introductory shell exercises |
| 2 | Nov 5 | Permissions, users, processes | Linux Journey |
| 3 | Nov 6 | SSH, hidden files, grep, find, strings | OverTheWire Bandit |
| 4 | Nov 7 | Linux CTF problem solving | OverTheWire Bandit |
| 5 | Nov 8 | Base64, hex, binary, Caesar | OverTheWire Krypton; CyberChef |
| 6 | Nov 9 | Substitution and XOR fundamentals | Krypton; small decoding exercises |
| 7 | Nov 10 | Beginner Linux + crypto mini mock | CyLab Security Academy / picoCTF |

### Week 2 — Web application security

| Day | Date | Topics | Learning/practice |
|---|---|---|---|
| 8 | Nov 11 | SQLi revision, UNION-based SQLi | PortSwigger Web Security Academy |
| 9 | Nov 12 | Blind SQLi and error-based SQLi | PortSwigger |
| 10 | Nov 13 | Reflected, stored and DOM XSS | PortSwigger |
| 11 | Nov 14 | File upload vulnerabilities | PortSwigger |
| 12 | Nov 15 | LFI, path traversal and command injection | Guided authorised labs |
| 13 | Nov 16 | SSRF, IDOR and authentication revision | PortSwigger |
| 14 | Nov 17 | Web security mini CTF | CyLab / authorised practice labs |

The user already has experience with SQLi, SSRF, authentication and access control. The app should label these as revision/advanced practice and avoid forcing basic lessons as new content.

### Week 3 — Networking, file analysis and SOC

| Day | Date | Topics | Learning/practice |
|---|---|---|---|
| 15 | Nov 18 | TCP/IP, DNS, HTTP and ports | TryHackMe / documentation |
| 16 | Nov 19 | Nmap and service enumeration | TryHackMe / local labs |
| 17 | Nov 20 | Wireshark and PCAP analysis | CyLab / authorised sample captures |
| 18 | Nov 21 | File signatures and metadata | ExifTool and sample files |
| 19 | Nov 22 | Steganography, Binwalk and strings | CyLab / sample files |
| 20 | Nov 23 | Logs, SIEM and alert analysis | TryHackMe SOC learning |
| 21 | Nov 24 | Incident response and mixed CTF | CyLab / TryHackMe |

Important label: digital forensics is named in Round 2 rules, not the Round 1 category descriptions. File analysis and steganography are supplementary CTF practice.

### Week 4 — Reverse engineering, Python, AI security and mixed practice

| Day | Date | Topics | Learning/practice |
|---|---|---|---|
| 22 | Nov 25 | ELF/PE fundamentals | Official documentation and safe sample files |
| 23 | Nov 26 | Ghidra, strings and basic disassembly | Ghidra documentation and beginner exercises |
| 24 | Nov 27 | Python scripting for CTF tasks | Python practice |
| 25 | Nov 28 | RSA, AES and XOR revision | Krypton / CyLab |
| 26 | Nov 29 | AI security fundamentals | Authorised learning resources |
| 27 | Nov 30 | Source-code analysis and mixed vulnerabilities | TryHackMe / safe labs |
| 28 | Dec 1 | Mixed CTF practice | CyLab / picoCTF |

Reverse engineering and advanced cryptography are explicitly described under Round 1 Expert. AI/ML is mentioned in Round 1 Intermediate as part of advanced methodologies, but specific AI attack types are supplementary unless confirmed by official material.

### Final preparation

| Date | Activity |
|---|---|
| Dec 2 | Six-hour mock CTF simulation |
| Dec 3 | Review failed challenges; repeat without walkthroughs |
| Dec 4 | Revise notes, verify tools, connectivity and reporting template; rest |
| Dec 5 | Round 1 date configured in app |

## 3.4 Resource catalogue seed data

Seed these resources with editable titles, descriptions, categories and URLs:

| Resource | URL | Category |
|---|---|---|
| Linux Journey | https://linuxjourney.com/ | Linux |
| OverTheWire Bandit | https://overthewire.org/wargames/bandit/ | Linux |
| OverTheWire Krypton | https://overthewire.org/wargames/krypton/ | Cryptography |
| TryHackMe | https://tryhackme.com/ | Guided learning |
| PortSwigger Web Security Academy | https://portswigger.net/web-security | Web security |
| CyLab Security Academy / picoCTF | https://picoctf.org/ | CTF practice |
| CyberChef | https://gchq.github.io/CyberChef/ | Encoding/cryptography |
| Nmap documentation | https://nmap.org/book/man.html | Networking |
| Wireshark documentation | https://www.wireshark.org/docs/ | Network analysis |
| Ghidra | https://ghidra-sre.org/ | Reverse engineering |
| CTFtime | https://ctftime.org/ | CTF events |

Do not imply all resources are free or all content is accessible without an account. Resource availability and pricing can change; allow the user to edit these details.

## 3.5 Daily task template

Each day should contain:
- Day number and date.
- Main domain and topic.
- Classification: official Round 1 topic / supplementary / later-round topic / unverified relevance.
- Learning objectives.
- Theory tasks.
- Resource links.
- Practical lab tasks.
- CTF challenge targets.
- Expected outcome.
- Estimated time.
- Completion status.
- Notes linked to this day.

Suggested default daily study time: 4 hours, configurable.
