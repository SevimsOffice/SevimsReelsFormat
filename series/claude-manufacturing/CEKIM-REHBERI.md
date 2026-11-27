# Çekim rehberi — Claude for Manufacturing serisi

Her bölüm 4 parçadan oluşur. Sadece **1** ve **4** her bölümde yeniden çekilir; **2** ve **3** bir kez çekilir, her bölümde tekrar kullanılır.

| # | Parça | Kim/ne | Ne zaman |
|---|---|---|---|
| 1 | Hook sorusu (3–4 sn) | HeyGen, "Sevim -- 12" (siyah kazak, dikey) | Her bölüm |
| 2 | Intro (≈7 sn) | HeyGen, aynı görünüm | **Bir kez** (TR + EN) |
| 3 | "Nereden başlanır" (≈15 sn) | HeyGen konuşma + **ekran kaydı** | **Bir kez** (TR + EN) |
| 4 | Bölüm gövdesi + CTA (≈35–45 sn) | HeyGen + **o bölümün ekran kaydı** | Her bölüm |

**Pratik:** Her bölüm için HeyGen'de *tek video* üretebilirsin: hook + gövde + CTA'yı script'teki sırayla oku. `[INTRO]` işaretini okumadan geç — araya hazır intro ve "nereden başlanır" klibini ben eklerim (hook'un son kelimesinden keserim).

## HeyGen ayarları
- Görünüm: **Sevim -- 12** (siyah kazak, dikey 720×1280). Çıktı **9:16, 1080p**. Arka plan sade/düz (yeşil bitki yerine düz duvar daha temiz ayrılır). Mümkünse "Transparent / WebM" seç; yoksa normal MP4 yeterli, arka planı ben ayırırım.
- Her bölüm için TR ve EN ayrı video.

## Ekran kaydı (Claude'da skill kullanımı)
Influencer tarzı "prompt yapıştır → cevap aksın" görüntüsü için:
1. **Hesap:** Claude (Pro/Max/Team/Enterprise — plugin'ler ücretli planlarda). Claude for Manufacturing plugin'i ekli olsun (bkz. `00-standard/nereden-baslanir`).
2. **Ekran:** Tarayıcıda claude.ai **ya da** Claude Desktop, **açık tema**, zoom **%125–150**, pencere ~1200 px genişlikte, sohbet ortada. Bildirimleri kapat, sekme/yer imi çubuğunu gizle.
3. **Kayıt:** 30 fps, 1080p veya üstü (Windows: Xbox Game Bar `Win+Alt+R` ya da OBS; Mac: `Cmd+Shift+5`). İmleci büyüt (Erişilebilirlik → imleç boyutu).
4. **Akış:** Boş yeni sohbet → (varsa) örnek dosyayı sürükle-bırak → bölümün `PROMPT`unu **yapıştır** (yazma; yapıştırmak daha akıcı görünür) → Enter → cevabın tamamı akana kadar kaydı kesme → 2 sn bekle, dur.
5. **Veri:** Sadece `sample-data/` içindeki kurgusal dosyaları kullan. Gerçek müşteri/tedarikçi adı, fiyat, kişisel veri olmasın.
6. Kaydı bölüm klasörüne değil, bana yükle; ben `NN-slug/refs/` altına koyarım. Dosya adı: `NN-tr-ekran.mp4` / `NN-en-ekran.mp4`.

Kayıt yapamazsan: aynı prompt ve cevabı kendi noir tasarımımızda "prompt kartı + akan cevap" olarak canlandırırım (ekranda "temsili" yazar). Gerçek kayıt her zaman daha inandırıcıdır.

## Ek görseller
Her bölümün `NEEDED.md` dosyası o bölüme özel ek görselleri listeler (ör. bakım kaydı ekranı, Fusion ekranı). Yoksa fabrika fotoğraf havuzundan ve kendi grafiklerimizden kullanırım.
