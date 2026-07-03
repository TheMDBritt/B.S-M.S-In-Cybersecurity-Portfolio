# 🏈 Cybersecurity Measures in Sports Betting Platforms  
### MFA • IDS • Fraud Monitoring • NIST CSF • MITRE ATT&CK  
**By Malcolm D. Britt**

---

## 📌 Project Overview  
This project analyzes how **multi-factor authentication (MFA)**, **intrusion detection systems (IDS)**, and **fraud monitoring** improve the security of online sports betting platforms. These platforms process millions of daily financial transactions and face threats including credential stuffing, account takeover, network intrusion, and fraudulent betting activity.  

Using a fully simulated sportsbook environment, attacks were executed against both a **baseline configuration** and an **enhanced, multi-layered security configuration**.  
The results show dramatic improvements in:

- detection accuracy  
- mean time to detect (MTTD)  
- fraud detection accuracy  
- reduction of successful cyberattacks  
- overall system resilience  

---

## 🎯 Objectives  
- Evaluate real-world threats targeting sports betting platforms  
- Measure the defensive impact of MFA, IDS, and fraud monitoring  
- Build a realistic simulation of sportsbook login, betting, and transaction flows  
- Quantify improvements across security metrics  
- Map findings to **NIST CSF** and **MITRE ATT&CK**  

---

## 🧪 Simulation Environment  
A complete sportsbook environment was built using isolated virtual machines:

| Component | OS | Specs | Purpose |
|----------|-----|--------|---------|
| User Access VM | Windows 10 | 2 vCPU / 4GB RAM | Login + user interface |
| Application Server | Ubuntu 22 | 4 vCPU / 8GB RAM | Authentication + betting engine |
| Database Server | Ubuntu 22 | 4 vCPU / 8GB RAM | Encrypted credentials + transactions |
| Security Monitoring VM | Kali Linux | 4 vCPU / 8GB RAM | IDS, SIEM, attack execution |
| Logging Server | Ubuntu 20 | 2 vCPU / 4GB RAM | Centralized log storage |

**Tools Used:**  
Hydra, Python 3.11, OpenSSL, Snort, Suricata, Elastic SIEM  
(Full details documented in the full paper)

---

## 🚨 Threat Scenarios Tested  
### **1. Credential Stuffing / Account Takeover**  
- 10,000 automated login attempts per trial  
- MFA vs no-MFA comparison  

### **2. Network Intrusion Attempts**  
- reconnaissance  
- probing  
- exploitation  
- IDS + SIEM monitoring  

### **3. Fraudulent Transactions**  
- payout manipulation  
- duplicate withdrawals  
- anomaly detection scoring  

---

## 📊 Key Experimental Results

### **MFA Effectiveness**  
| Metric | Baseline | Enhanced |
|--------|----------|----------|
| Successful Account Compromises | 30% | 2% |
| Improvement | — | **93% reduction** |

---

### **IDS (Intrusion Detection System)**  
| Metric | Baseline | Enhanced |
|--------|----------|----------|
| Detection Rate | 54% | 89% |
| MTTD (Mean Time to Detect) | 14 min | 3 min |

---

### **Fraud Detection System**  
| Metric | Baseline | Enhanced |
|--------|----------|------
| Accuracy | 68% | 92% |
| Detection Time | 6 min | 2 min |
| False Positives | 3% | 5% |

---

## 🔐 Risk Heat Map  
| Threat Type | Baseline Risk | Enhanced Risk |
|-------------|----------------|----------------|
| Account Takeover | HIGH | LOW |
| Network Intrusion | HIGH | MED-LOW |
| Fraudulent Transactions | MED-HIGH | LOW |

---

## 📚 Framework Alignment  
### **NIST CSF**
- **PROTECT:** MFA  
- **DETECT:** IDS + SIEM  
- **RESPOND:** Fraud blocking  
- **RECOVER:** Transaction logging + rollback

### **MITRE ATT&CK**
Mapped techniques included:
- Valid Accounts (T1078)  
- Brute Force (T1110)  
- Active Scanning (T1595)  
- Session Hijacking (T1539)  
- Data Manipulation (T1565)

---

## 🧠 Lessons Learned  
Through this project, key insights included:

- MFA drastically reduces account takeover  
- IDS + SIEM dramatically reduce attacker dwell time  
- Fraud monitoring is essential for high-risk financial platforms  
- Layered defenses outperform single-layer controls  
- Regulatory compliance (NIST, gaming commissions) requires multi-layer security  

---

## 📬 Contact  
**Email:** malcolmbritt12@gmail.com  
**LinkedIn:** www.linkedin.com/in/malcolm-b-b7157026a  

---

