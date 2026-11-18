---
description: Agent'ların hangi model ve effort ile çalışacağını gösterir veya değiştirir. Değişiklik yalnızca senin makinende (veya bu projede) geçerlidir; ekibin varsayılanı değişmez.
argument-hint: "[agent model|effort <değer>] [--proje] | sifirla [agent] [--proje]"
---

# /ajan-ayarlari — agent model seçimi

Argümanlar:

<argumanlar>
$ARGUMENTS
</argumanlar>

## Ayar katmanları
Bir agent çağrılırken geçerli ayar, aşağıdaki sırayla ilk bulunan değerdir:

| Öncelik | Kaynak | Dosya | Kim için |
|---|---|---|---|
| 1 | Proje ayarı | `<proje>/.claude/dotnet-oracle-ayarlar.local.json` | Bu projede, yalnızca sen (repoya girmez) |
| 2 | Kullanıcı ayarı | `~/.claude/dotnet-oracle-ayarlar.json` | Tüm projelerinde, yalnızca sen |
| 3 | Ekip varsayılanı | Plugin'deki agent dosyasının `model:` / `effort:` satırları | Herkes |

Dosya biçimi:
```json
{
  "agentlar": {
    "coder":    { "model": "sonnet", "effort": "medium" },
    "reviewer": { "model": "opus" }
  }
}
```
- Agent adları: `analyst`, `db`, `coder`, `tester`, `reviewer`, `proje-kesif`
- `model`: `haiku`, `sonnet`, `opus`, `fable`
- `effort`: `low`, `medium`, `high`, `xhigh`, `max`
- Bir alan yazılmamışsa o alan için bir alt katmana bakılır.

## Argüman yoksa: tabloyu göster
1. İki ayar dosyasını oku (yoksa boş kabul et). Ekip varsayılanları:
   analyst opus/high, db sonnet/high, coder opus/medium, tester sonnet/medium, reviewer opus/high, proje-kesif sonnet/medium.
2. Şu tabloyu göster:
   | Agent | Model | Effort | Kaynak |
   Kaynak sütununda değerin hangi katmandan geldiğini yaz (proje / kullanıcı / varsayılan).
3. Altına tek satır: "Değiştirmek için: `/ajan-ayarlari coder sonnet` veya `/ajan-ayarlari reviewer effort max`".

## Değiştirme
- `/ajan-ayarlari <agent> <model>` → model
- `/ajan-ayarlari <agent> effort <değer>` → effort
- Sonuna `--proje` eklenmişse proje dosyasına, yoksa kullanıcı dosyasına yazılır.

Adımlar:
1. Agent adını ve değeri yukarıdaki listelere göre doğrula; geçersizse geçerli değerleri göster ve dur.
2. Hedef dosyayı oku (yoksa `{"agentlar": {}}` ile başla), yalnızca ilgili alanı değiştir, diğer her şeyi koru, dosyayı yaz.
3. `--proje` ile yazdıysan projenin `.gitignore` dosyasında `.claude/dotnet-oracle-ayarlar.local.json` satırı yoksa ekle.
4. Güncel tabloyu göster. Değişikliğin bir sonraki agent çağrısından itibaren geçerli olduğunu tek satırla belirt.

## Sıfırlama
- `/ajan-ayarlari sifirla <agent>` → o agent'ın kaydını hedef dosyadan sil.
- `/ajan-ayarlari sifirla` → hedef dosyadaki tüm agent kayıtlarını sil (önce onay iste).
- `--proje` kuralı burada da geçerlidir.
