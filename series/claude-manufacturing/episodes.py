#!/usr/bin/env python3
"""Generates NN-slug/script.tr.md, script.en.md and NEEDED.md for the 12 atomic skills.
Source of truth for the series scripts; edit here, then run: python3 episodes.py"""
import json, os

EP = [
 dict(no=1, slug="onboarding", name="Onboarding", dept_tr="IT ve veri", dept_en="IT & data",
  thumb_tr="Claude fabrikanızı hiç tanımıyorsa?", thumb_en="What if Claude doesn't know your plant?",
  hook_tr="Claude sizin fabrikanızı hiç tanımıyorsa, ona nasıl güveneceksiniz?",
  hook_en="If Claude knows nothing about your plant, why would you trust it?",
  body_tr="Onboarding skill'i işte bu yüzden var. Kurulumdan sonra 'set us up' dediğinizde Claude size sorular sorar: hangi ERP'yi, hangi CAD'i, hangi bakım sistemini kullanıyorsunuz, vardiyalarınız nasıl, hangi terimleri kullanıyorsunuz. Bağlantıları tek tek dener. Sonuç: diğer on altı skill sizin fabrikanızın diliyle çalışır. Ve bu bilgiyi siz verirsiniz; Claude tahmin etmez.",
  body_en="That's why the Onboarding skill exists. After install, you say 'set us up' and Claude asks you questions: which ERP, which CAD, which maintenance system, how your shifts run, what your terms mean. It tests each connection. The result: the other sixteen skills work in your plant's language. And you provide that context; Claude doesn't guess.",
  prompt_tr="set us up", prompt_en="set us up",
  files=[], needed=["Claude'un 'set us up' sonrası sorduğu ilk sorular (ekran kaydı)"]),
 dict(no=2, slug="data-consolidate", name="Data Consolidate", dept_tr="IT ve veri", dept_en="IT & data",
  thumb_tr="Veriniz beş ayrı sistemde mi?", thumb_en="Is your data stuck in five systems?",
  hook_tr="Üretim verisi bir yerde, kalite başka yerde, bakım bambaşka yerde mi?",
  hook_en="Production data here, quality data there, maintenance somewhere else?",
  body_tr="Data Consolidate skill'i bu dağınıklığı toplar. ERP'den, üretimden, kaliteden ve bakımdan aldığınız dışa aktarımları tek bir veri setinde birleştirir: aynı makine, aynı lot, aynı tarih yan yana gelir. Bir hattın neden geride kaldığını görmek için artık beş tabloyu elle eşleştirmezsiniz. Claude birleştirir, siz yorumlarsınız.",
  body_en="The Data Consolidate skill pulls that mess together. It joins your exports from ERP, production, quality and maintenance into one dataset: same machine, same lot, same date, side by side. To see why a line fell behind, you no longer match five spreadsheets by hand. Claude joins them; you interpret.",
  prompt_tr="Ekteki üretim, NCR ve bakım dosyalarını makine ve tarihe göre tek tabloda birleştir, CNC-3 için neler oldu özetle.",
  prompt_en="Join the attached production, NCR and maintenance files into one table by machine and date, then summarize what happened on CNC-3.",
  files=["uretim-vardiya.csv","ncr-olcum.csv","bakim-kayitlari.csv"], needed=["(opsiyonel) kendi ERP/Excel dışa aktarım ekranının görüntüsü"]),
 dict(no=3, slug="custom-connector", name="Custom Connector", dept_tr="IT ve veri", dept_en="IT & data",
  thumb_tr="Eski sisteminizin bağlantısı yok mu?", thumb_en="No connector for your old system?",
  hook_tr="Fabrikanızdaki sistemin hazır bir bağlantısı yoksa ne olacak?",
  hook_en="What if the system your plant runs on has no ready-made connector?",
  body_tr="Custom Connector skill'i tam bu durum için. Hazır bağlantısı olmayan bir sisteme nasıl erişileceğini sizinle birlikte çıkarır: dışa aktarım mı, API mi, veritabanı görünümü mü. Gerekli adımları ve ayarları hazırlar. Bağlantıyı açmak yine sizin ve IT ekibinizin onayıyla olur; Claude yolu gösterir.",
  body_en="The Custom Connector skill is for exactly this. It works out with you how to reach a system that has no connector: an export, an API, a database view. It drafts the steps and settings. Turning the connection on still happens with you and your IT team's approval; Claude maps the route.",
  prompt_tr="Bakım sistemimizin hazır bağlantısı yok, sadece gece CSV dışa aktarımı var. Claude'un bu veriyi okuyabilmesi için bir yöntem öner.",
  prompt_en="Our maintenance system has no connector, only a nightly CSV export. Suggest a way for Claude to read this data.",
  files=["bakim-kayitlari.csv"], needed=[]),
 dict(no=4, slug="customer-inquiry-intake", name="Customer Inquiry Intake", dept_tr="Satış ve teklif", dept_en="Sales & quoting",
  thumb_tr="Teklif talebindeki eksikleri kim yakalıyor?", thumb_en="Who catches what's missing in an RFQ?",
  hook_tr="Müşterinin teklif talebinde eksik bilgi varsa, bunu ne zaman fark ediyorsunuz?",
  hook_en="When an RFQ is missing information, when do you actually notice?",
  body_tr="Customer Inquiry Intake skill'i talebi ilk geldiği anda okur. Çizimi ve maili inceler, eksikleri listeler: tolerans mı yok, yüzey işlemi mi belirtilmemiş. Bu işi sizin tezgâhlarınızla yapıp yapamayacağınızı değerlendirir ve müşteriye sorulacak soruları hazırlar. Siz de teklife eksik bilgiyle değil, netleşmiş bir taleple başlarsınız.",
  body_en="The Customer Inquiry Intake skill reads the request the moment it lands. It checks the drawing and the email and lists what's missing: no tolerance, no finish specified. It assesses whether your machines can make it, and drafts the questions for the customer. So you start the quote from a clear request, not a gap.",
  prompt_tr="Ekteki müşteri mailini incele: eksik bilgileri listele, üretilebilirliği değerlendir ve müşteriye gönderilecek soruları yaz.",
  prompt_en="Review the attached customer email: list missing information, assess manufacturability, and draft questions for the customer.",
  files=["rfq-musteri-maili.md|rfq-customer-email.md"], needed=["(opsiyonel) gerçekçi bir teknik resim PDF görüntüsü (kurgusal)"]),
 dict(no=5, slug="quote-build", name="Quote Build", dept_tr="Satış ve teklif", dept_en="Sales & quoting",
  thumb_tr="Bir teklif neden üç gün sürüyor?", thumb_en="Why does one quote take three days?",
  hook_tr="Bir teklifi hazırlamak neden hâlâ günler sürüyor?",
  hook_en="Why does a single quote still take days?",
  body_tr="Quote Build skill'i geçmiş işlerinize bakar. Benzer parçaların malzeme maliyetini, işleme süresini ve gerçekleşen toplam maliyetini bulur, yeni iş için bir teklif taslağı çıkarır ve hangi geçmiş işe dayandığını gösterir. Fiyatı belirleyen yine sizsiniz; ama sıfırdan değil, kanıtla başlarsınız.",
  body_en="The Quote Build skill looks at your past jobs. It finds similar parts' material cost, machining time and actual total cost, drafts a quote for the new job, and shows which past jobs it's based on. You still set the price; you just start from evidence, not from zero.",
  prompt_tr="Ekteki geçmiş işlere göre BRK-210 braket, 500 adet için teklif taslağı hazırla; hangi işleri referans aldığını göster.",
  prompt_en="Using the attached past jobs, draft a quote for 500 pcs of bracket BRK-210 and show which jobs you used as reference.",
  files=["gecmis-isler.csv"], needed=[]),
 dict(no=6, slug="ncr-writeup", name="NCR Write-up", dept_tr="Kalite", dept_en="Quality",
  thumb_tr="NCR yazmak saatinizi mi alıyor?", thumb_en="Is writing NCRs eating your day?",
  hook_tr="Parça kalite kontrolden geçmedi. Raporu yazmak kaç saatinizi alıyor?",
  hook_en="A part just failed inspection. How long will the report take you?",
  body_tr="NCR Write-up skill'i ölçüm sonuçlarından uygunsuzluk raporunu taslak olarak yazar: hangi özellik, hangi gereksinim, ne ölçüldü, hangi lot ve makine. Geçmişte aynı hatanın olup olmadığını da kontrol eder. Kalite mühendisi okur, düzeltir ve imzalar. Rapor yazmak yerine sorunu çözmeye vakit kalır.",
  body_en="The NCR Write-up skill drafts the nonconformance report from your measurements: which feature, which requirement, what was measured, which lot and machine. It also checks whether the same defect happened before. Your quality engineer reviews, edits and signs. Less time writing, more time fixing.",
  prompt_tr="Ekteki ölçümlere göre reddedilen parçalar için NCR taslağı yaz ve benzer geçmiş hataları kontrol et.",
  prompt_en="Draft an NCR for the rejected parts in the attached measurements and check for similar past defects.",
  files=["ncr-olcum.csv"], needed=[]),
 dict(no=7, slug="root-cause-capa", name="Root Cause & CAPA", dept_tr="Kalite", dept_en="Quality",
  thumb_tr="Aynı hata neden hep geri dönüyor?", thumb_en="Why does the same defect keep coming back?",
  hook_tr="Aynı hatayı düzeltiyorsunuz, ama hata neden hep geri dönüyor?",
  hook_en="You fixed the defect. So why does it keep coming back?",
  body_tr="Root Cause & CAPA skill'i NCR'den bir adım öteye geçer. Ölçümleri, makine ve vardiya bilgisini, bakım kayıtlarını birlikte okuyarak olası kök nedenleri kanıtıyla sıralar. Sonra düzeltici ve önleyici faaliyet önerir. Kararı ekip verir; ama tartışma tahminle değil, verilerle başlar.",
  body_en="The Root Cause & CAPA skill goes one step past the NCR. It reads measurements, machine and shift data and maintenance logs together, and ranks likely root causes with the evidence. Then it proposes corrective and preventive actions. The team decides; but the discussion starts from data, not guesses.",
  prompt_tr="Ekteki NCR ölçümleri ve bakım kayıtlarına göre delik çapı hatasının olası kök nedenlerini sırala ve CAPA öner.",
  prompt_en="Using the attached NCR measurements and maintenance log, rank likely root causes of the hole-diameter defect and propose CAPA.",
  files=["ncr-olcum.csv","bakim-kayitlari.csv"], needed=[]),
 dict(no=8, slug="supplier-quote-request", name="Supplier Quote Request", dept_tr="Satın alma", dept_en="Purchasing",
  thumb_tr="Tedarikçilere aynı maili kaç kez yazıyorsunuz?", thumb_en="How many times do you write the same RFQ?",
  hook_tr="Tedarikçilere aynı fiyat talebini her seferinde baştan mı yazıyorsunuz?",
  hook_en="Do you rewrite the same supplier RFQ from scratch every time?",
  body_tr="Supplier Quote Request skill'i ihtiyacınızdan tedarikçiye gidecek teklif talebini hazırlar: malzeme, miktar, teslim tarihi, sertifika ve kalite şartları. Hangi tedarikçilere gönderilebileceğini listeden önerir. Göndermeden önce siz kontrol edersiniz; Claude sizin yerinize mail atmaz.",
  body_en="The Supplier Quote Request skill turns your need into a ready RFQ: material, quantity, delivery date, certificates and quality terms. It suggests which suppliers from your list to send it to. You review before anything goes out; Claude doesn't email on your behalf.",
  prompt_tr="2 ton AL6061 levha için tedarikçi teklif talebi hazırla; ekteki listeden uygun tedarikçileri öner.",
  prompt_en="Draft a supplier RFQ for 2 tons of AL6061 sheet and suggest suitable suppliers from the attached list.",
  files=["tedarikci-listesi.csv"], needed=[]),
 dict(no=9, slug="breakdown-diagnosis", name="Breakdown Diagnosis", dept_tr="Üretim ve bakım", dept_en="Production & maintenance",
  thumb_tr="Makine durdu. Nedenini kim bulacak?", thumb_en="The machine stopped. Who finds out why?",
  hook_tr="Makine durdu, hat bekliyor. Nedenini ne kadar hızlı bulabilirsiniz?",
  hook_en="The machine is down and the line is waiting. How fast can you find out why?",
  body_tr="Breakdown Diagnosis skill'i arızanın belirtilerini bakım kayıtları ve varsa sensör verileriyle karşılaştırır. Geçmişte benzer belirtilerde ne bulunduğunu ve hangi parçanın değiştiğini getirir, olası nedenleri sırayla verir. Makineye dokunmaz; bakım teknisyenine nereden başlayacağını söyler.",
  body_en="The Breakdown Diagnosis skill compares the symptoms with your maintenance history and sensor data where you have it. It brings back what was found last time with similar symptoms and which part was replaced, and ranks likely causes. It never touches the machine; it tells your technician where to start.",
  prompt_tr="CNC-3'te spindle titreşimi ve ölçü kayması var. Ekteki bakım kayıtlarına göre olası nedenleri sırala ve kontrol adımlarını öner.",
  prompt_en="CNC-3 has spindle vibration and dimensional drift. Using the attached maintenance log, rank likely causes and suggest checks.",
  files=["bakim-kayitlari.csv"], needed=["(opsiyonel) gerçek bir CNC tezgâhı fotoğrafı/videosu"]),
 dict(no=10, slug="daily-production-report", name="Daily Production Report", dept_tr="Üretim ve bakım", dept_en="Production & maintenance",
  thumb_tr="Sabah raporu bir saatinizi mi alıyor?", thumb_en="Does the morning report take an hour?",
  hook_tr="Her sabah üretim raporunu toplamak için kaç dakika harcıyorsunuz?",
  hook_en="How many minutes do you spend pulling the production report every morning?",
  body_tr="Daily Production Report skill'i vardiya verilerinden günlük raporu çıkarır: hedef ve gerçekleşen, fire, duruş süreleri ve nedenleri, OEE kayıpları önem sırasıyla. Toplantıya rakam toplayarak değil, hangi hatta ne yapılacağını konuşarak girersiniz.",
  body_en="The Daily Production Report skill builds the day's report from shift data: target versus actual, scrap, downtime and its causes, OEE losses ranked. You walk into the meeting talking about what to fix, not collecting numbers.",
  prompt_tr="Ekteki vardiya verilerinden dünkü üretim raporunu hazırla: hedef/gerçekleşen, fire, duruşlar ve en büyük kayıp.",
  prompt_en="Build yesterday's production report from the attached shift data: target vs actual, scrap, downtime and the biggest loss.",
  files=["uretim-vardiya.csv"], needed=[]),
 dict(no=11, slug="design-space-explore", name="Design Space Explore", dept_tr="Mühendislik", dept_en="Engineering",
  thumb_tr="Tek tasarım yerine on alternatif?", thumb_en="Ten design options instead of one?",
  hook_tr="Bir parçayı tasarlarken kaç alternatife gerçekten bakabiliyorsunuz?",
  hook_en="When you design a part, how many alternatives do you really explore?",
  body_tr="Design Space Explore skill'i Autodesk Fusion ile çalışır. Sizin verdiğiniz kısıtlar içinde farklı tasarım alternatifleri üretir: farklı ölçüler, malzemeler, geometriler. Mühendis en umut verici olanları seçer ve devam eder. Bunun için masaüstü Fusion'da MCP sunucusunun açık olması gerekiyor.",
  body_en="The Design Space Explore skill works with Autodesk Fusion. Within the constraints you set, it generates design alternatives: different dimensions, materials, geometries. The engineer picks the promising ones and moves on. It needs the Fusion MCP Server turned on in desktop Fusion.",
  prompt_tr="Fusion'daki braket modeli için ağırlığı azaltan üç tasarım alternatifi üret; delik konumları ve et kalınlığı korunsun.",
  prompt_en="For the bracket model in Fusion, generate three lighter design alternatives; keep hole positions and wall thickness.",
  files=[], needed=["Autodesk Fusion ekran kaydı (Fusion MCP Server açık, modelde alternatiflerin oluşması)"]),
 dict(no=12, slug="trade-study-report", name="Trade Study Report", dept_tr="Mühendislik", dept_en="Engineering",
  thumb_tr="Hangi tasarım gerçekten daha iyi?", thumb_en="Which design is actually better?",
  hook_tr="Üç tasarım alternatifiniz var. Hangisi gerçekten daha iyi?",
  hook_en="You have three design options. Which one is actually better?",
  body_tr="Trade Study Report skill'i alternatifleri yan yana koyar: maliyet, ağırlık, üretilebilirlik ve teknik kriterler. Her kriteri neden o şekilde puanladığını yazar ve bir karşılaştırma raporu çıkarır. Kararı mühendislik ekibi verir; ama bir toplantıda savunulabilecek bir belgeyle.",
  body_en="The Trade Study Report skill puts the alternatives side by side: cost, weight, manufacturability and technical criteria. It explains how it scored each one and writes a comparison report. Engineering still decides; now with a document you can defend in the meeting.",
  prompt_tr="Üç braket alternatifini maliyet, ağırlık ve üretilebilirliğe göre karşılaştıran bir trade study raporu yaz.",
  prompt_en="Write a trade study comparing the three bracket alternatives on cost, weight and manufacturability.",
  files=[], needed=["(opsiyonel) Design Space Explore bölümündeki Fusion alternatiflerinin görüntüsü"]),
]

CTA_TR = "Bu skill sizin fabrikanızda nerede işe yarar? Yorumlara yazın; serinin devamı için takip edin."
CTA_EN = "Where would this skill help in your plant? Tell me in the comments, and follow for the next one."

def files_for(ep, lang):
    out = []
    for f in ep["files"]:
        if "|" in f: f = f.split("|")[0 if lang == "tr" else 1]
        out.append(f"sample-data/{f}")
    return out

for ep in EP:
    d = f"{ep['no']:02d}-{ep['slug']}"
    os.makedirs(f"{d}/refs", exist_ok=True)
    for lang in ("tr", "en"):
        L = lambda k: ep[f"{k}_{lang}"]
        files = files_for(ep, lang)
        tr = lang == "tr"
        md = f"""# {'Bölüm' if tr else 'Episode'} {ep['no']:02d}/17 · {ep['name']} ({'Türkçe' if tr else 'English'})

{'Departman' if tr else 'Department'}: {L('dept')} · Skill: `{ep['slug']}`

## {'Thumbnail yazısı (başın üstünde)' if tr else 'Thumbnail text (above the head)'}
**{L('thumb')}**

## {'HeyGen için okunacak metin' if tr else 'Text to read in HeyGen'}
> {L('hook')}
>
> [INTRO]  ← {'okuma; buraya hazır intro + "nereden başlanır" eklenecek' if tr else "don't read; the standard intro + 'where to start' go here"}
>
> {L('body')}
>
> {CTA_TR if tr else CTA_EN}

## {'Ekran kaydı (Claude)' if tr else 'Screen recording (Claude)'}
- {'Yeni sohbet aç' if tr else 'Open a new chat'}{(' · ' + ('ekle: ' if tr else 'attach: ') + ', '.join(f'`{f}`' for f in files)) if files else ''}
- **PROMPT** ({'yapıştır' if tr else 'paste'}):
```
{L('prompt')}
```
- {'Cevap tamamen akana kadar kaydet. Ayrıntılar: CEKIM-REHBERI.md' if tr else 'Record until the answer finishes. Details: CEKIM-REHBERI.md'}

## Caption
{L('thumb')} {('Claude for Manufacturing serisi, bölüm ' if tr else 'Claude for Manufacturing series, episode ')}{ep['no']}/17: {ep['name']}. #ClaudeAI #{'Uretim' if tr else 'Manufacturing'} #{'EndustriMuhendisligi' if tr else 'IndustrialEngineering'} #AI

## {'Kaynak notu' if tr else 'Source note'}
{'Skill adı ve işlevi: Anthropic claude-plugins-official/claude-for-manufacturing (skills/' if tr else 'Skill name and purpose: Anthropic claude-plugins-official/claude-for-manufacturing (skills/'}{ep['slug']}) + claude.com/plugins/claude-for-manufacturing. {'Abartılı iddia yok; insan onayı vurgulanır.' if tr else 'No overclaiming; human sign-off is stated.'}
"""
        open(f"{d}/script.{lang}.md", "w").write(md)
    need = "\n".join(f"- {n}" for n in ep["needed"]) or "- Ek görsel gerekmiyor; sadece ekran kaydı + HeyGen videoları."
    open(f"{d}/refs/NEEDED.md", "w").write(f"""# {ep['no']:02d} · {ep['name']} — benden istenenler

1. HeyGen videosu TR: `script.tr.md` metni (hook + gövde + CTA, [INTRO] okunmaz) → `{ep['no']:02d}-tr-heygen.mp4`
2. HeyGen videosu EN: `script.en.md` → `{ep['no']:02d}-en-heygen.mp4`
3. Ekran kaydı TR ve EN (Claude'da PROMPT yapıştırma) → `{ep['no']:02d}-tr-ekran.mp4`, `{ep['no']:02d}-en-ekran.mp4`
4. Bu bölüme özel ek görseller:
{need}
""")

json.dump({"series": "claude-for-manufacturing", "total": 17, "avatar_look": {"name": "Sevim -- 12", "id": "2299a2b6fe7d460f92ebe1bd0e6acb0f"},
           "order": "12 atomic skills first, then 5 chains",
           "episodes": [{k: ep[k] for k in ("no", "slug", "name", "dept_tr", "dept_en", "thumb_tr", "thumb_en")} for ep in EP],
           "chains_next": ["rfq-to-quote", "inspection-to-capa", "morning-plant-pulse", "breakdown-to-next-report", "supplier-escape-to-alternate-source"]},
          open("series.json", "w"), indent=2, ensure_ascii=False)
# Word counts (for 45-60 s target incl. hook+cta, excluding standard segments)
for ep in EP:
    for lang in ("tr", "en"):
        n = len((ep[f"hook_{lang}"] + " " + ep[f"body_{lang}"] + " " + (CTA_TR if lang == "tr" else CTA_EN)).split())
        print(f"{ep['no']:02d} {lang} {n} words ~{n/ (2.2 if lang=='tr' else 2.5):.0f}s")
