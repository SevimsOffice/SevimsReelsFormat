# @heysirio: ilk 2 referans videodan gözlemler (2026-11-26)

Kaynak: kullanıcının yüklediği 2 video (720×1280, 30 fps; 78.2 sn ve 62.3 sn). Videolar repo'ya eklenmedi.
Etiketler: [ölçüm] araçla ölçüldü · [gözlem] karelerden görüldü · [çıkarım] yorum.

## R1: "Yearly plans are a trap" (editoryal / "gizli belge" stili)
- [gözlem] **Hook:** 0. karede yüzün üzerinde büyük beyaz serif başlık ("Yearly plans are a trap") ve etrafında uçuşan uygulama ikonları var.
- [gözlem] **Mekân:** Sıcak, loş bir oda; tungsten lambalar, kitaplık ve yumuşak sıcak key light. Yüz parlak, arka plan karanlık.
- [ölçüm] **Sahne değişimleri:** 7.7, 12.0, 24.0, 29.3, 34.1, 42.5, 48.9, 58.2, 65.0 ve 76.6 sn'de büyük sahne değişimi var. Ortalama 6–8 sn'de bir yeni "dünya" açılıyor; aralarda sürekli grafik hareketi var.
- [gözlem] **Belge araları:** Ekranı kaplayan krem/beyaz "INTERNAL · DO NOT FORWARD / CONFIDENTIAL" belgeleri kullanılıyor.
  - Serif başlık ve "§2 · SECTION 2 OF 4" künyesi var.
  - Siyah sansür barları, kırmızı el yazısı/italik notlar ve sarı fosforlu vurgulama (konuşulan cümle) görülüyor.
  - Belgeye yakınlaşıp bulanıklaşarak geçiş yapılıyor.
- [gözlem] **Altyazı:** Küçük beyaz serif. Söylenen kelimeler siyah kutu içinde parlıyor, gelecek kelimeler soluk. Alt-orta bölümde, 2–4 kelimelik gruplar halinde.
- [gözlem] **Konuşmacı üstü grafikler:**
  - İnce beyaz çizgi grafikler ve oklar (fiyat/kredi eğrisi).
  - İtalik serif etiketler ve yuvarlak çerçeveli "pill" etiketler.
  - Sağ üstte numaralı listeler (1. a slow queue / 2. a cheaper model / 3. their margin).
  - Küçük 3B nesneler (kum saati).
  - Before/after için dikey wipe.
- [gözlem] **Kapanış:** Merkezde italik serif "create without limits" ve ardından CTA ("comment API").

## R2: "Fable 5.2 generates AI video" (teknik / siyah fon stili)
- [gözlem] **Kadraj ve zemin:** Siyah zemin; konuşmacı alt yarıda (baş ~%45 yükseklikte). Üst yarı tamamen grafik alanı.
- [gözlem] **Başlık ve notlar:** Başlık sarı el yazısı fontuyla yazılmış ("Fable 5.2 Generates AI video!!"). Notlar el yazısı ve oklarla eklenmiş ("1 dot = 1 blob", "side view").
- [gözlem] **Görsel kanıtlar:** Gerçek çıktılar kullanılıyor (görsel ızgaraları, öncesi/sonrası). Teknik etiketler mono fontla; ilerleme çubuğu "STEP 1,116 · 54,289 BLOBS" şeklinde.
- [gözlem] **Marka kartı:** "Built with Claude" kartı (Claude yıldızı + iki renkli metin).
- [gözlem] **Altyazı:** Beyaz sans; göğüs hizasında, 2 satır.
- [ölçüm] **Kesmeler:** Büyük sahne kesmesi yok. Kamera sabit, değişim üst yarıdaki grafiklerden geliyor.

## Ortak "Style DNA" (2 videodan; 20 videoyla doğrulanacak)
1. **Hook:** 0. karede okunabilir başlık + yüz.
2. **İçerik akışı:** Her 2–4 sn'de yeni bir görsel bilgi geliyor; görseller konuşulan ifadeyle aynı anda giriyor.
3. **Grafik yeri:** Grafikler konuşmacının üstünde (üst yarı) ya da tam ekran belge arası olarak geliyor; yüz kapatılmıyor.
4. **Tipografi:** İki tür çiftleniyor: serif/editoryal + mono/teknik. El yazısı notlar "insan" dokunuşu katıyor.
5. **Kanıt:** Soyut ikon yerine gerçek nesne gösteriliyor (belge, görsel, ekran).
6. **CTA:** "Comment X" kalıbı.

## Bizim uyarlamamız (birebir kopya değil)
- **Renk:** Noir palet (`style/palette-noir.json`). Sarı fosforlu yerine Crimson Rouge kullanıyoruz; zemin beyaz kâğıt yerine Vintage Cream.
- **Belgeler:** Kendi belge tasarımımız: NCR ve SKILL.md kâğıtları, mühür ("stamp") dili.
- **Fontlar:** Playfair Display (başlık), EB Garamond (altyazı/not), IBM Plex Mono (etiket).
