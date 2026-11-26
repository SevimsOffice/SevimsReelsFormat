# SevimsReelsFormat — AI Reels Production System: Mimari ve Uygulama Planı

## 0. Bağlam

Kurulacak sistem: GitHub Issue'da bir konu açılıyor (ya da sistem konu öneriyor). Ardından araştırma, hook ve storytelling içeren İngilizce script, storyboard, **onay**, HeyGen avatar videosu, motion graphics ve kurgu, QA adımları çalışıyor. Sonunda Google Drive'a hazır bir Reel ve Content Calendar satırı düşüyor. Instagram'a yayın 2. aşamada (Faz 5) geliyor. Görsel dil @heysirio referanslarından **esinlenecek**, ama birebir kopyalanmayacak.

Mevcut durum:
- Repo tamamen boş, henüz commit yok. Remote'ta da branch yok.
- Konteynerde ffmpeg/ffprobe, Node 22 ve Python 3.13 hazır.
- `instagram.com/heysirio` buradan login sayfasına yönlendiriyor, yani videolar bulut oturumundan doğrudan izlenemiyor.

Kullanıcı kararları:
- Dil **İngilizce**.
- HeyGen avatarı ve API anahtarı **hazır**.
- Başlangıç **Faz 0 + Faz 1 paralel** yürüyecek.
- Referans videolar manuel indirilmeyecek, başka bir yöntem kullanılacak (bkz. Faz 0a).

---

## ★ ÖNCE: Hızlı fizibilite testi (bu oturumda, tüm sistemi kurmadan)

**Amaç:** En riskli zinciri tek bir ~20 saniyelik videoda uçtan uca denemek: senin HeyGen avatarın → kelime zamanlaması → efektler → render. Sonuç MP4'ü burada izleyeceksin. Ancak sonuç iyiyse tam sistem kurulacak.

Bu testte olmayanlar:
- GitHub Actions, issue'lar, Drive, Sheets, Instagram.
- Claude API anahtarı. Script ve storyboard'u bu oturumda ben yazacağım.

**Adımlar:**
- **T1 — HeyGen anahtarı.** Anahtar sohbete yazılmaz; güvenli form (`request_credential`, host `api.heygen.com`, header `X-Api-Key`) ile girilir. Ben değeri görmem, proxy isteklere kendisi ekler. Sonra API'den avatar ve ses listesini çekerim, hangisinin kullanılacağını sen onaylarsın.
- **T2 — Script ve storyboard.** Test konusu önerim: "3 Claude Code tricks that save you hours" (değiştirebilirsin). Hook'lu, ~45–55 kelimelik İngilizce bir script yazarım. Storyboard JSON'u planlanan şemada elle hazırlanır; böylece şema tasarımı da test edilmiş olur.
- **T3 — HeyGen üretimi.** 1080×1920 MP4 üretilir. Avatar matting destekliyorsa ek olarak `webm` (şeffaf arka plan) denenir. Varsa ücretsiz test/watermark modu kullanılır. Ölçülecekler: üretim süresi, kredi tüketimi, çerçeve/boşluk payı, dudak senkronu.
- **T4 — Kelime zamanlaması.** faster-whisper ile `words.json` çıkarılır ve script metniyle hizalanır.
- **T5 — HyperFrames ile kompozisyon.** Denenecek efektler:
  - kelimeye senkron punch-in/out zoom,
  - kelime kelime beliren altyazı (safe-zone içinde),
  - 3 düğümlü animasyonlu akış diyagramı,
  - sayı sayacı veya logo animasyonu,
  - webm varsa yazının konuşmacının arkasından geçmesi,
  - ffmpeg ile üretilen lisanssız whoosh/pop sesleri,
  - hafif kontrast/vinyet ayarı.
- **T6 — Render ve QA.** 30 fps H.264 + AAC, −14 LUFS. Render süresi ölçülür. Kısa QA: ffprobe, blackdetect, ebur128.
- **T7 — (Opsiyonel) Referans erişim testi.** Bana @heysirio'dan 1–2 Reel linki yapıştırırsın, `yt-dlp` ile login olmadan buradan çekmeyi denerim. Çalışırsa Faz 0 çok kolaylaşır: sadece 20 link vermen yeterli olur. Ayrıca 1 video üzerinde örnek ölçüm yapılır (kesmeler, zoom eğrisi, altyazı stili). Çalışmazsa bilgisayar yöntemi kullanılır.
- **T8 — Teslim.** Final MP4, kare ızgarası ve kısa test raporu (ölçülen sayılar, maliyet, sorunlar) sana gönderilir. Test kodu dev branch'te `poc/` klasörüne commit edilir.

**Başarı (go/no-go) kriterleri:**
- Avatar kalitesi kabul edilebilir.
- Efektler kelimeyle 1–2 kare içinde senkron.
- 20 sn'lik render ≤ 5 dk sürüyor.
- Şeffaf arka planın çalışıp çalışmadığı netleşiyor; bu, derinlik efektlerinin olup olmayacağını belirler.
- Toplam test maliyeti biliniyor.

**Maliyet:** Sadece ~20–40 sn'lik HeyGen kredisi; geri kalan her şey ücretsiz.

**Senden gerekenler:** HeyGen anahtar formunu doldurmak, avatarı onaylamak, (opsiyonel) 1–2 Reel linki vermek ve videoyu izleyip yorumlamak.

Test sonucuna göre aşağıdaki tam plan güncellenir, ardından Faz 0 + Faz 1 başlar.

---

## 1. ChatGPT planının değerlendirmesi (kısa)

**Doğru olanlar:**
- HeyGen yalnızca avatarı üretmeli; kurgu ayrı bir motorda yapılmalı.
- JSON edit decision list (EDL) kullanılmalı.
- Pahalı adımdan önce onay alınmalı.
- Fazlı ilerleme, model seçiminin config'ten yönetilmesi ve önce Drive, sonra Instagram sırası doğru.
- 30 FPS yerine örnekleme ile çalışma önerisi de doğru.

**Düzeltilmesi veya eklenmesi gerekenler** (hepsi aşağıdaki plana işlendi):

1. **Claude videoyu "izlemez".** Kare, ses ve transkript üzerinden analiz yapar. Zoom eğrisi, easing, kesme sıklığı ve SFX zamanlaması gibi şeyler **ölçülmeli**: OpenCV ve ffmpeg ile sayısal olarak çıkarılmalı, LLM'e tahmin ettirilmemeli. Her bulgu `[ölçüm] / [gözlem] / [çıkarım]` diye etiketlenecek.
2. **Storyboard saniyeye değil kelimeye bağlanmalı.** Olaylar `sentence/word` ID'lerine bağlanacak. Gerçek zamanlar HeyGen çıktısının kelime zaman damgalarından **deterministik** olarak çözülecek. Böylece avatar yeniden üretilse bile plan bozulmaz.
3. **LLM efekt icat etmemeli.** Storyboard ajanı yalnızca `effect-catalog.json` içindeki efekt ID'lerinden seçecek. Seçim, JSON şeması üzerinden structured output ile zorlanacak. Bu, tutarlılık ve render garantisi sağlar.
4. **GitHub tuzağı:** Workflow'un `GITHUB_TOKEN` ile eklediği label **yeni bir workflow tetiklemez**. Bu yüzden zincirleme label tetikleyicileri yerine **tek bir dispatcher workflow** kullanılacak. Dispatcher state machine'i ilerletir; asenkron beklemeleri (HeyGen render) **cron poller** sürdürür. Ek olarak, issue'larla tetiklenen workflow'lar **default branch'teki** dosyalardan çalışır.
5. **Güvenlik:** `/approve` gibi komutlar yalnızca repo sahibinden (`author_association == OWNER`) kabul edilecek. Aksi halde yabancılar HeyGen kredisi harcatabilir. Repo **private** olmalı.
6. **Google Drive tuzağı:** Kişisel Drive'a service account ile yükleme yapılamaz (kotası 0). Bunun yerine **OAuth refresh token** kullanılacak. OAuth uygulaması "Testing" modunda kalırsa refresh token **7 günde düşer**, bu yüzden "In production" yapılmalı.
7. **HeyGen:** Mevcut API v3 (`/v3/videos`), `output_format: "webm"` ile **şeffaf arka planlı** avatar verebiliyor (avatar matting destekliyorsa). Bu, "yazı konuşmacının arkasında" gibi derinlik efektlerini mümkün kılar. Faz 2 spike'ında doğrulanacak.
8. **GitHub Actions render için yeterli.** 30–75 sn'lik bir Reel birkaç dakikada render olur, ayrı render sunucusu erken bir yatırım olur. Sadece HeyGen beklerken runner tutulmayacak; bunu poller halledecek.
9. **Instagram (Faz 5):** `video_url` herkese açık bir URL olmalı; Drive linkleri güvenilir değil. Bu yüzden Meta'nın resumable upload akışı kullanılacak. Ayrıca kütüphane müziği API ile eklenemez, yani müzik lisanslı olmalı.
10. **Eksik bir use-case:** İlk isteğin, yani *kendi ham konuşma videolarını* aynı stille düzenletmek, son prompt'ta kaybolmuştu. Kurgu motoru **input-agnostic** tasarlanacak: HeyGen çıktısı da kendi kaydın da aynı motordan geçecek.
11. Senin "textfield" dediğin muhtemelen **Higgsfield**: AI görsel/video üretimi. Varsayılan olarak kapalı, opsiyonel bir B-roll sağlayıcısı olarak `models.json`'a eklenebilir. Deterministik animasyonlar önceliklidir.

---

## 2. Mimari

```
GitHub Issue (video-request | topic-suggestion)          ← kontrol merkezi
   │  issues / issue_comment / schedule(*/15) / workflow_dispatch
   ▼
.github/workflows/pipeline.yml  (tek dispatcher, concurrency: job-<issue#>)
   │  `reels advance --issue N`  → state machine bir sonraki adıma geçer
   ▼
[research] → [script] → [critic/fact-check] → [storyboard]  ── Claude API (structured outputs + web_search)
   │                    ⛔ GATE 1: /approve  (script + görsel plan tek yorumda)
   ▼
[avatar] HeyGen v3 submit (callback_id=job_id) → ⟳ poller → download (mp4 veya webm/alpha)
   ▼
[align] faster-whisper kelime zaman damgaları + bilinen script ile hizalama → words.json
   ▼
[edl] deterministik çözücü: storyboard anchor'ları + words.json + style tokens → edl.json
   ▼
[render] engine (HyperFrames | Remotion – Faz 3 bake-off) + FFmpeg (loudnorm, mux)
   ▼
[qa] ffprobe/blackdetect/freezedetect/ebur128/safe-zone/caption diff (+ ops. Claude vision)
   ▼
[deliver] Drive klasörü + Sheets satırı + issue yorumu → ⛔ GATE 2: son inceleme
   │  /revise edit: "..." → sadece edl+render tekrar (avatar yeniden üretilmez)
   ▼
[publish] (Faz 5) Instagram Reels API
```

**Teknoloji kararları:**
- **Pipeline:** TypeScript (Node 22). Paketler: `@anthropic-ai/sdk`, `zod`, `@octokit/rest`, `googleapis`, `vitest`.
- **Faz 0 analiz araçları:** Python, offline çalışır. PySceneDetect, OpenCV, librosa, faster-whisper.
- **LLM rolleri:** `config/models.json` içinde tanımlanır: `research`, `script`, `critic`, `storyboard`, `qa_vision`, `topic_discovery`. Varsayılan model `claude-opus-5-5`, effort role göre ayarlanır, server-side fallback açık olur. Kodda model adı geçmez. Araştırma `web_search_20260209` tool'u ile yapılır. Büyük style guide ve effect catalog **prompt caching** ile önbelleğe alınır.
- **Transkripsiyon:** Runner üzerinde faster-whisper (İngilizce, ücretsiz). Çıktı script metniyle hizalanır. Sağlayıcı config'ten değiştirilebilir.
- **Render motoru:** Faz 3 başında 1 günlük bake-off yapılacak. **Eğilim: HyperFrames.**
  - Gerekçe: Apache-2.0 lisanslı, HTML+GSAP tabanlı, HeyGen ekosisteminde, Claude Code skill'leri var, headless Chrome + FFmpeg ile deterministik render alıyor. Bilgisayarında zaten "Hyperframes Videolari" klasörü var.
  - Remotion yedek seçenek.
  - Three.js yalnızca gerçekten 3D gereken efektlerde, composition içinde canvas olarak kullanılacak.
  - Lottie hazır ikon animasyonları için.
- **Asset'ler:**
  - Logolar: simple-icons (CC0).
  - Ürün UI görüntüleri: araştırma kaynaklarındaki resmi sayfalardan Playwright screenshot.
  - SFX ve müzik: `assets/` altında lisanslı veya CC0 paket.
  - Marka: `config/brand.json`.

**Repo yapısı:**
```
.github/ISSUE_TEMPLATE/{video-request,topic-suggestion,revision}.yml
.github/workflows/{pipeline,topic-discovery,ci}.yml
config/{brand,models,production,heygen,labels}.json
prompts/{research,script,critic,storyboard,revise,topic}.md      # versiyonlu prompt'lar
src/cli.ts                                                       # reels advance|stage|setup-labels|edit
src/orchestrator/{state-machine,gates,github,lock}.ts
src/stages/{research,script,critic,storyboard,avatar,align,edl,render,qa,deliver}.ts
src/integrations/{anthropic,heygen,transcribe,gdrive,gsheets,instagram}.ts
src/schemas/{job,script,storyboard,edl,qa}.ts                    # zod → JSON Schema
engine/effects/<effect-id>/   engine/compositions/   engine/render.ts
analysis/  (Python Faz 0 araçları)        docs/reference-analysis/ (9 rapor)
style/{style-guide.md,tokens.json,effect-catalog.json}
assets/{brand,sfx,music,fonts}/           jobs/YYYY-MM-DD_<slug>/ (yalnızca metin artefaktları)
tests/
```
Binary dosyalar (`*.mp4`, `*.webm`, referanslar, kareler) `.gitignore`'da olacak. Binary depolama Drive'da, ara katmanı `src/storage` üstlenecek.

**State machine** (`jobs/.../job.json` tek doğruluk kaynağı; label'lar bunu görünür kılar):
`requested → researching → script_draft ⇄(/revise) → [GATE1 /approve] → approved → avatar_submitted → avatar_rendering ⟳ → avatar_ready → aligned → edl_ready → rendering → qa → (qa_failed | delivered) → ready_for_review → [Faz5] published`.
Herhangi bir adım `failed{stage, attempt, error}` durumuna düşebilir; `/retry` yalnızca o adımı tekrar çalıştırır.

- **Idempotency:** Her adım, girdi hash'ini ve çıktı yolunu `job.json`'a yazar. Hash değişmediyse adım atlanır. HeyGen `video_id` poll'dan önce kaydedilir, böylece aynı video iki kez gönderilmez. Concurrency group çift çalışmayı engeller.
- **Komutlar** (yalnızca sahibinden): `/approve`, `/revise <talimat>`, `/revise edit: <talimat>`, `/regen script|avatar|edit`, `/retry`, `/cancel`.

---

## 3. Fazlar

### Faz 0 — Referans analizi (Faz 1 ile paralel)

**0a. Toplama.** Manuel indirme yok; videolar geçici olarak işlenip silinecek.
- **Neden "hiç indirmeden" olmaz:** Analiz için video verisi gerekir; tarayıcıda izlemek de veriyi indirir. Yapılacak şey otomatik ve geçici: kareler çıkarılır, video silinir. Repo'ya yalnızca metin raporları girer.
- **Neden şifre paylaşımı yok:** Instagram şifren buluta verilmeyecek. Datacenter IP'sinden giriş checkpoint, 2FA ve hesap kilidi riski taşır, ayrıca şifre loglarda kalır.
- **Yöntem 1 — metadata (resmi):** Instagram Graph API **Business Discovery**. Son 20 Reel'in permalink, tarih, caption ve `view_count` bilgisini verir; performansa göre ağırlıklandırma yapmayı sağlar. Uygun olanlarda `media_url` de döner; lisanslı müzikli Reel'lerde bu alan boş gelir. Aynı Meta uygulaması Faz 5'te tekrar kullanılır.
- **Yöntem 2 — video dosyaları:** Senin Windows bilgisayarında, zaten giriş yapılmış tarayıcı oturumunla `yt-dlp --cookies-from-browser firefox` çalıştırılır. Firefox öneriliyor çünkü Chrome'un Windows'taki cookie şifrelemesi yt-dlp'yi bozabiliyor.
  - Bilgisayarın Remote Control listesinde görünüyor, ancak klasörler bulut oturumuna şu an açık değil. Claude uygulaması güncellendikten sonra tekrar denenecek.
  - Alternatif: bu adım bilgisayarında yerel bir Claude Code oturumunda çalıştırılır.

**0b. Ölçüm araçları** (`analysis/`, taşınabilir Python + ffmpeg):
- **probe:** süre, çözünürlük, fps.
- **scenes:** kesme listesi, ortalama shot süresi.
- **frames:** 2 fps temel örnekleme + olay çevresinde ±0.5 sn tam 30 fps.
- **motion:** ECC/ORB ile frame-to-frame scale/translation eğrileri, ardından easing fit (cubic/expo/spring) ve kare cinsinden süre.
- **audio:** kelime zaman damgaları, onset ile SFX vuruşları, müzik/ses seviye farkı (ducking).
- **color:** luma yüzdelikleri (kontrast), saturasyon, beyaz dengesi tahmini, vinyet oranı, yüz bölgesinden ten tonu.
- **contact sheets:** her video için kare ızgaraları.

**0c.** Video başına Claude görsel analizi yapılır ve `Timestamp | Spoken | Visual | Edit | SFX` tablosu çıkar.

**0d. Sentez:**
- 9 rapor `docs/reference-analysis/` altına.
- `style/tokens.json`: renk, tipografi, easing, süreler.
- `style/effect-catalog.json`: ölçülmüş parametrelerle preset'ler.
- **Özgünlük notu:** creator'a özgü imza öğeler listelenip *kaçınılacaklar* olarak işaretlenir. Palet ve tipografi `brand.json`'dan gelir.

**Ek kabul kriterleri** ("daha hangi soruları sormalıyım" sorusunun cevabı; Faz 0'a dahil edildi):
- İlk 3 saniyenin anatomisi: 0, 15, 30, 45 ve 90. karelerde ne oluyor?
- Bilgi yoğunluğu: kaç saniyede bir yeni görsel geliyor? Ekran süresinin yüzde kaçı avatar ağırlıklı, yüzde kaçı grafik ağırlıklı?
- Altyazı sistemi: caption başına kelime sayısı, konum, vurgu rengi, büyük/küçük harf kullanımı, animasyon.
- Derinlik katmanı: yazı konuşmacının arkasına giriyor mu (matte kullanımı)?
- Pattern-interrupt sıklığı; bitişin başa loop edip etmediği.
- En iyi 5 ve en kötü 5 video (view_count'a göre) arasındaki ölçülebilir farklar.
- Hangi efekt deterministik üretilemez (gen-AI ya da manuel asset gerektirir)?

### Faz 1 — Issue → Script → Onay
- `package.json`, TS iskeleti, zod şemaları, `ci.yml` (lint + test).
- Issue template'leri ve label kurulumu (`reels setup-labels`).
- `pipeline.yml` dispatcher ve concurrency ayarı.
- `research` adımı: web_search kullanır, kaynakları `sources.md`'ye yazar.
- `script` adımı (structured output) şunları üretir:
  - ana hook ve 3 alternatif hook,
  - beat'ler (hook → problem → merak boşluğu → açıklama/örnek → payoff → CTA),
  - konuşma metni, vurgulu kelimeler, duraklamalar, delivery notları,
  - tahmini süre (≈150 wpm; 110–190 kelime → 45–75 sn),
  - Instagram caption.
- `critic` adımı: kaynaklara göre fact-check, yapay ve abartılı dil taraması, uzunluk kontrolü. Gerekirse script'i bir tur düzeltir.
- `storyboard` adımı: catalog'a bağlı çalışır. Faz 0 bitene kadar varsayılan 10 efektlik başlangıç kataloğu kullanılır.
- Issue yorumu tek mesajda okunur halde gelir: hook'lar, script, sahne tablosu, kaynaklar, komut yardımı. Ardından `/approve` ve `/revise` döngüsü.
- `topic-discovery.yml` (haftalık cron): puanlı konu önerilerini `topic-suggestion` issue'ları olarak açar. Önceki job'lara bakarak tekrarı engeller.
- `--dry-run` modu: kayıtlı fixture'larla API çağrısı yapmadan uçtan uca çalışır.
- Faz sonunda kod **main**'e PR ile alınır, çünkü issue tetikleyicileri default branch'ten çalışır.

### Faz 2 — Onaylı script → HeyGen avatar
- **Spike (10 sn'lik test):**
  - `avatar_id` ve `voice_id` listelenir, config'e yazılır.
  - 1080×1920 çerçeve ve punch-in için boşluk payı kontrol edilir.
  - `webm`/matting desteği test edilir.
  - Dakika başı kredi maliyeti ölçülür.
- **Entegrasyon:** submit (`callback_id = job_id`) → cron poller → presigned URL hemen indirilir → storage'a (Drive `_work/`) yüklenir.
- **align adımı:** words.json üretilir; kabul eşiği ≤50 ms sapma (örnek kontrollerde).
- Webhook (ayrı bir endpoint → `repository_dispatch`) sonradan opsiyonel olarak eklenebilir.

### Faz 3 — Kurgu motoru
- **Bake-off:** Aynı 10 sn'lik segmentte punch-in zoom, kelime vurgulu caption ve animasyonlu diyagram kartı yapılır. Kriterler: runner'daki render süresi, kalite, yazım kolaylığı, determinizm. Motor seçilir.
- **Efekt kütüphanesi:** `engine/effects/<id>/` altında her efekt için param şeması, varsayılan preset (Faz 0 ölçümlerinden) ve demo bulunur.
  - Örnek efektler: `zoom.punch_in`, `caption.word_pop`, `text.kinetic_headline`, `graphic.logo_float`, `graphic.number_counter`, `diagram.flow_nodes`, `layout.split_compare`, `ui.screenshot_tilt`, `fx.light_sweep`, `transition.whip`.
- **EDL çözücü** (deterministik):
  - anchor → kare dönüşümü,
  - çakışma kuralları (aynı anda en fazla 1 büyük grafik, minimum aralık),
  - Instagram safe zone'ları,
  - SFX eşlemesi.
- **Render:** 1080×1920, 30 fps, H.264 + AAC, −14 LUFS. Varsa matte katmanıyla birlikte.
- **Kendi videon için mod:** `reels edit --video raw.mp4` avatar adımlarını atlar. Sessizlik ve dolgu kelimeleri kesilerek jump cut yapılır.
- **Revizyon:** `/revise edit: "..."` → Claude EDL'i düzenler → yeniden render.

### Faz 4 — QA → Drive → Takvim
- **QA:**
  - ffprobe spesifikasyon kontrolü,
  - blackdetect / freezedetect / silencedetect,
  - ebur128 (−14 LUFS, TP ≤ −1 dBTP),
  - A/V offset ≤ 1 kare,
  - caption ile transkript karşılaştırması,
  - safe-zone ve eksik asset kontrolü,
  - opsiyonel olarak 1 fps karelerde Claude vision ile okunabilirlik ve yüz üstüne binme kontrolü.
  - Zorunlu kontroller geçmeden READY olmaz.
- **Drive:** OAuth, `drive.file` scope'u, resumable upload.
  - Klasör: `AI Content Production/2026-11-27_<slug>/`.
  - İçerik: final.mp4, avatar, script, storyboard, edl, caption, thumbnail, sources, qa-report.
- **Sheets "Content Calendar":** `video_id` üzerinden upsert. Issue'ya linkler yazılır ve `ready-for-review` label'ı eklenir.
- **Geri bildirim döngüsü:** Onay ve revizyonlar `jobs/*/feedback.json`'a kaydedilir. 10 videodan sonra `style/learnings.md` prompt'lara eklenir.

### Faz 5 — Instagram yayını (sonra)
- Meta uygulaması + Instagram Graph API.
- `/publish` (veya zamanlama) → REELS container (resumable upload, `cover_url`, caption) → `status_code` beklenir → `media_publish`.
- `content_publishing_limit` kontrolü; durum issue'ya ve Sheets'e yazılır; metrikler toplanır.

---

## 4. Secret'lar ve config
- **GitHub Secrets:** `ANTHROPIC_API_KEY`, `HEYGEN_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN`. Faz 5'te: `META_APP_ID/SECRET`, `IG_USER_ID`, `IG_ACCESS_TOKEN`.
- **GitHub Variables:** `GDRIVE_ROOT_FOLDER_ID`, `CALENDAR_SHEET_ID`.
- `avatar_id`, `voice_id` ve marka bilgileri secret değildir, `config/*.json`'da tutulur.
- Secret'lar sohbete yapıştırılmaz; GitHub → Settings → Secrets üzerinden girilir.

## 5. Tahmini işletim maliyeti (video başı; Faz 1–2'de gerçek kullanımla ölçülecek)
- **Claude API** (research + script + critic + storyboard, ~10 web araması, caching ile): ≈ $0.5–1.5. Günde 1 video ≈ $15–45/ay. Haftalık konu keşfi ≈ $0.5–1.
- **HeyGen:** en büyük kalem. API planındaki dakika başı krediye bağlı, Faz 2 spike'ında ölçülecek.
- **Transkripsiyon** (faster-whisper) ve **Google API'leri:** $0.
- **GitHub Actions:** video başı ~15–25 dk. Private repo Free planda aylık 2.000 dk içinde kalır.
- **Faz 0 (tek seferlik):** 20 video için Claude görsel analizi ≈ $10–30.

## 6. Senden gerekenler (ilgili faz başlamadan)
1. Repo'nun **private** olduğunu teyit et. `ANTHROPIC_API_KEY` ve `HEYGEN_API_KEY`'i GitHub Secrets'a ekle (Faz 1–2).
2. **Faz 0 için:** Windows'ta Claude uygulamasını güncelle (Remote Control klasörlerinin buluta açılması için) ya da o adımı yerel bir Claude Code oturumunda çalıştır. Firefox'ta Instagram'a giriş yapmış ol. Business Discovery için Instagram hesabın Professional olmalı ve bir Facebook sayfasına bağlı olmalı (opsiyonel, metadata için).
3. **Faz 4 için:** Google Cloud projesi ve OAuth client. Adım adım rehberi ve refresh token alma script'ini ben hazırlayacağım.
4. Marka bilgileri: handle, renkler, font tercihi, logo. SFX ve müzik kaynağı tercihi (lisanslı/CC0).

## 7. Doğrulama
- **Faz 1:**
  - `npm test`: şema testleri ve state machine birim testleri.
  - `reels advance --issue N --dry-run` fixture'larla çalışmalı.
  - Canlı test: template ile test issue'su aç → ~3 dk içinde script yorumu gelmeli → `/approve` → `approved`.
  - Hızlı art arda iki komut sadece tek çalıştırma üretmeli.
  - Sahibi olmayan birinin `/approve` yorumu reddedilmeli.
- **Faz 0:**
  - Önce 1 video üzerinde araçlar çalıştırılır; ölçülen 3 zoom olayı karelerle elle karşılaştırılır.
  - Sonra 20 videonun hepsi işlenir.
  - Her bulgunun etiketi ve video+timestamp referansı olmalı.
- **Faz 2:** 10 sn'lik test → `webm`/alpha, süre, poll → indirme kontrol edilir; kelime hizalama örnek kontrollerinde ≤50 ms sapma.
- **Faz 3–4:**
  - Test job'u render edilir ve QA raporu "pass" olmalı.
  - Drive klasörü, Sheets satırı ve issue yorumundaki linkler kontrol edilir.
  - Görsel inceleme sende.
