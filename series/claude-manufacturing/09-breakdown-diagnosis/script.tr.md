# Bölüm 09/17 · Breakdown Diagnosis (Türkçe)

Departman: Üretim ve bakım · Skill: `breakdown-diagnosis`

## Thumbnail yazısı (başın üstünde)
**Makine durdu. Nedenini kim bulacak?**

## HeyGen için okunacak metin
> Makine durdu, hat bekliyor. Nedenini ne kadar hızlı bulabilirsiniz?
>
> [INTRO]  ← okuma; buraya hazır intro + "nereden başlanır" eklenecek
>
> Breakdown Diagnosis skill'i arızanın belirtilerini bakım kayıtları ve varsa sensör verileriyle karşılaştırır. Geçmişte benzer belirtilerde ne bulunduğunu ve hangi parçanın değiştiğini getirir, olası nedenleri sırayla verir. Makineye dokunmaz; bakım teknisyenine nereden başlayacağını söyler.
>
> Bu skill sizin fabrikanızda nerede işe yarar? Yorumlara yazın; serinin devamı için takip edin.

## Ekran kaydı (Claude)
- Yeni sohbet aç · ekle: `sample-data/bakim-kayitlari.csv`
- **PROMPT** (yapıştır):
```
CNC-3'te spindle titreşimi ve ölçü kayması var. Ekteki bakım kayıtlarına göre olası nedenleri sırala ve kontrol adımlarını öner.
```
- Cevap tamamen akana kadar kaydet. Ayrıntılar: CEKIM-REHBERI.md

## Caption
Makine durdu. Nedenini kim bulacak? Claude for Manufacturing serisi, bölüm 9/17: Breakdown Diagnosis. #ClaudeAI #Uretim #EndustriMuhendisligi #AI

## Kaynak notu
Skill adı ve işlevi: Anthropic claude-plugins-official/claude-for-manufacturing (skills/breakdown-diagnosis) + claude.com/plugins/claude-for-manufacturing. Abartılı iddia yok; insan onayı vurgulanır.
