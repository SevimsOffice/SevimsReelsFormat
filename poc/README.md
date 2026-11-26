# Fizibilite testi (PoC): konuşma videosu → otomatik efektli Reel

Tarih: 2026-11-26. Amaç: Tüm sistemi kurmadan önce en riskli zinciri uçtan uca denemek. Zincir şöyle: kelime zamanlaması → kelimeye bağlı storyboard → deterministik EDL → HyperFrames render → QA.

Kaynak video olarak HeyGen hesabındaki **"Sevim -- 8" (dikey) avatar görünümünün ücretsiz önizleme klibi** kullanıldı. API cüzdan bakiyesi $0 olduğu için yeni avatar videosu üretilmedi. Klibin İngilizce bölümü (11.2–20.6 sn, 9.4 sn) alındı.

## Akış

```
look2_preview.mp4 ──► scripts/transcribe.py (faster-whisper, kelime zaman damgaları) ──► work/words.json
                                                                                     │
storyboard.json  (efektler KELİME ID'lerine bağlı, saniye yok) ──────────────────────┤
                                                                                     ▼
                                           scripts/resolve_edl.mjs ──► work/edl.json (saniye + kare)
                                                                                     ▼
                                     scripts/build_composition.mjs ──► reel-test/index.html + compositions/*.html
                                                                                     ▼
                                          scripts/render_and_qa.sh ──► out/reel-test-final.mp4 + out/qa-report.md
```

Medya hazırlığı `scripts/prepare_media.sh` ile yapılır: kırpma, 1080×1920'ye ölçekleme, AI arka plan ayırma, hibrit matte, son kare ve ses. Ses efektleri `scripts/make_sfx.sh` ile ffmpeg'den lisanssız olarak üretilir.

## Videoda denenen efektler (hepsi konuşulan kelimeye senkron)

| Zaman | Söylenen | Efekt |
|---|---|---|
| 0.42 s | "Sevim" | Sert punch-in (1.00 → 1.14) + pop |
| 1.31 s | "Eight" | "LOOK #08" kartı, slot-makinesi sayacı + click |
| 2.00 s | "your…" | Kamera geri çekilir (power2.inOut 0.6 sn), arka plan %35 parallax + whoosh |
| 2.26 / 2.66 s | "digital" / "twin" | **Konuşmacının arkasında** DIGITAL / TWIN yazısı; bu sırada altyazı kapalı |
| 3.08 s | "ready" | READY rozeti, çizilen onay işareti + ding |
| 3.60 / 3.82 / 4.20 s | "Try / creating / videos" | 3 düğümlü akış (Script → Avatar → Reel), her düğüm kendi kelimesinde |
| 5.30 s | "Also" | Punch-in 1.12 + pop; arayüz kartı girer |
| 6.60 s | "button" | İmleç butona gider ve tıklar (basma animasyonu + click) |
| 7.28 s | "share" | Buton metin alanına dönüşür, "Love it!" yazılır, SENT |
| 8.25–8.40 s | "Hope you enjoy" | Kamera geri çekilir; kapanış satırı, ışık süpürmesi + shimmer |
| 9.4–10.8 s | — | Son karede bekleme (kapanış satırı ~2 sn okunsun diye) |

Altyazılar 2–3 kelimelik gruplar halinde. Kelimeler söylendikçe parlaklaşır; vurgulu kelimeler yeşil.

## Sonuçlar: go/no-go kriterleri

| Kriter | Sonuç |
|---|---|
| Efektler kelimeyle senkron | ✅ Tüm efekt zamanları transkriptten otomatik hesaplandı; elle zamanlama yok. Ses-görüntü kayması 0.0 ms (çapraz korelasyonla ölçüldü). |
| Render süresi | ✅ 10.8 sn video, 4 vCPU yazılım GL ile **44–53 sn** (≈4–5× gerçek zaman). 60 sn'lik bir Reel ≈ 4–5 dk sürer, GitHub Actions'a uygun. |
| Şeffaf arka plan / derinlik | ✅ Yerel AI matte + siyah-fon key'i ile çalışıyor ("TWIN" yazısı başın arkasından geçiyor). HeyGen'in kendi `webm` çıktısı ile ayrıca test edilecek. |
| Format | ✅ H.264 High, 1080×1920, 30 fps, AAC 48 kHz, −14.0 LUFS, tepe −1.5 dBFS, siyah kare yok. |
| HyperFrames check | ✅ 0 hata. Uyarılar bilinçli: TWIN Reels kenar payını biraz aşıyor, altyazı dosyasında 9 grup var. |
| Avatar kalitesi (yeni üretim) | ⏳ Test edilmedi: API cüzdanı $0. Yeni bir üretim için cüzdana bakiye yüklenmeli ya da HeyGen MCP bağlanmalı. |
| Maliyet | **$0** (yerel araçlar + mevcut önizleme klibi). |

## Öğrenilenler (tam sisteme taşınacak kurallar)

1. **HeyGen faturalama:** API anahtarı API cüzdanından ödeme yapar ve bakiye şu an $0. HeyGen MCP (`https://mcp.heygen.com/mcp/v1/`, bağlanan HyperFrames MCP'den farklı) abonelik kredisi kullanır. Otomatik sistem API anahtarı ister, yani cüzdana bakiye gerekecek.
2. **HyperFrames MCP yeterli değil:** Hosted `compose` aracı kendi avatar videonu sesiyle birlikte kullanamıyor, yalnızca sessiz klip ve kendi TTS'ini kullanıyor. Doğru motor **yerel HyperFrames CLI**: ücretsiz, deterministik ve GitHub Actions'ta çalışır.
3. **Sesler:** Hesaptaki 3 ses klonu Türkçe (`tr`) kayıttan üretilmiş. İngilizce script'te aksan ve kalite ayrıca denenmeli.
4. **Arka plan ayırma kurulumu:** `onnxruntime-node` CUDA paketini indiremeyince kurulum düşüyor. Çözüm: `--onnxruntime-node-install-cuda=skip`. CI kurulumuna eklenmeli.
5. **Matte:** AI matte gömlekte, elin altında bir delik açtı. Kaynak fon saf siyah olduğu için `max(luma key, aşındırılmış AI alfa)` bunu düzeltti. HeyGen `webm` çıktısında bu adım muhtemelen gerekmez.
6. **GSAP kuralı:** `back.out` gibi taşan ease'ler `filter: blur` ile birlikte kullanılmamalı. Negatif blur geçersiz sayılıyor ve eleman bulanık kalıyor. Ölçek ve filtre ayrı tween'lerde olmalı.
7. **Altyazı:** Ölçeklenen inline-block kelimeler boşlukları yutuyor. Kelimeler arasına margin konmalı.
8. **faster-whisper:** Kurulu PyAV sürümü uyumsuz. Ses ffmpeg ile PCM'e çevrilip modele verilerek çözüldü.
9. **Yerleşim:** Reels güvenli bandı y 288–1248. Avatar'ın başı y≈910'dan başlıyor; bu düzen ideal. Bölgeler: grafik y 300–640, altyazı y 690–850, yüz y 880 ve aşağısı. HeyGen'den 9:16 üretimde aynı kadraj istenmeli.
10. **Ses seviyesi:** Render çıktısı −28.6 LUFS çıktı. QA öncesi iki geçişli loudnorm (−14 LUFS) zorunlu.

## Tekrar üretmek

```bash
cd poc
npm install                      # hyperframes@0.9.99
./scripts/prepare_media.sh <look2_preview.mp4> 11.2 20.6
./scripts/make_sfx.sh
python3 -I scripts/transcribe.py reel-test/assets/avatar.mp4 work/words.json   # kelime id'leri değişirse storyboard'u güncelle
./scripts/render_and_qa.sh
```

Not: Video, webm ve wav dosyaları repo'ya girmez (`.gitignore`). Önizleme klibi HeyGen hesabından indirilir.
