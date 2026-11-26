# Video A — Haber: Claude for Manufacturing (~45 sn, İngilizce)

**HeyGen'de okutulacak metin** (`script.txt` ile aynı; 9:16, baş y≈900 civarında, sade koyu fon önerilir):

> Claude just got a job on the factory floor. Anthropic launched Claude for Manufacturing, a plugin with seventeen ready-made skills. Here is what that means. A part fails inspection. Claude writes the nonconformance report, checks past failures, ranks the likely causes, and drafts the 8D. Your quality engineer just reviews and signs. An RFQ comes in. Claude flags what is missing from the drawing and drafts the quote from your cost history. It connects to Autodesk Fusion, Infor, Microsoft 365 and NetSuite. And it never runs your machines. A human signs off on everything. The best part? Skills are just folders. Your team can rewrite them for its own procedures. Want me to show you how to build one? Comment SKILL.

**Hook alternatifleri:** "Your quality engineer just got an AI assistant." / "Anthropic just shipped 17 skills for factories."

**Caption:** Claude for Manufacturing is here: 17 ready-made skills for quality, quoting, operations and supply chain, plus connectors to Autodesk Fusion, Infor, Microsoft 365 and NetSuite. Humans still sign off. Comment SKILL for the build guide. #ClaudeAI #Manufacturing #AIagents

## Kaynaklar ve doğrulama
- Resmi sayfa: https://claude.com/solutions/manufacturing. Plugin + hazır skill'ler, 4 connector, NCR→8D ve RFQ→teklif örnek akışları; "doesn't run production control… or write to your systems of record"; "Skills are a starting point. Your team adapts them…"
- 12 Kasım 2026 tarihi ve **17 skill** sayısı iki sektör kaynağından geliyor (Poka, MachineToolNews); resmi sayfada sayı yok. Script'te tarih kullanılmadı.
- "FDA'ya özel skill" iddiası doğrulanamadı; script'te FDA geçmiyor.
- NCR belgesindeki nedenler (Tool wear…) örnektir; ekranda "NCR · EXAMPLE" yazıyor.

---

# Video B — Teknik: Bir Claude skill'i nasıl yapılır (~55 sn, taslak)

> A Claude skill is just a folder. Let me show you how to build one for a factory. Inside it is one file: SKILL.md. At the top, a name and a one-line description. That is what Claude reads to decide when to use it. Below that, plain instructions. For example: when a part fails inspection, write the NCR in our template, search past NCRs for the same defect, and rank the causes. Next to it, you can drop reference files, like your NCR template and defect codes, and even scripts that pull inspection data. Claude only loads the full skill when the task matches, so you can install many of them. Zip the folder and upload it in Claude's settings, or add it to a plugin for your whole team. Start with one boring task you repeat every week. Comment SKILL and I'll send you the template.

Görsel plan: klasör ağacı animasyonu → SKILL.md üst bilgisi (name/description vurgulu) → talimatlar satır satır yazılır → templates/ ve scripts/ dosyaları klasöre "düşer" → "yükleme" anı (zip → Settings) → CTA. Kaynak: https://claude.com/skills ("skills are just folders with a SKILL.md file…").
