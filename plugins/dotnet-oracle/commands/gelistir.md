---
description: Bir task'ı uçtan uca geliştirir — analiz ve karar soruları → DB → kod → test → review, bulgu varsa düzeltme döngüsü.
argument-hint: "[GÖREV-ID:] <task içeriği>"
---

# /gelistir — geliştirme akışı

Sen bu akışın **orkestratörüsün**. İşi kendin yapmazsın; sırayla agent'ları çağırır, sonuçlarını kontrol eder ve kullanıcıya yalnızca karar gereken yerlerde sorarsın.

Task içeriği:

<task>
$ARGUMENTS
</task>

## Altın kurallar
- **Token tasarrufu:** Agent'ların yazdığı dosyaların tamamını okuma. Agent'lar sana kısa bir özet döner; yalnızca karar vermen gereken bölümü oku
  (örn. `analiz.md` içinde sadece "Sorular" ve "DB işleri", `review.md` içinde sadece son turun ENGELLEYİCİ tablosu).
- Agent'lar birbirinin konuşmasını görmez; **ortak hafıza görev klasörüdür.** Her agent'a mutlaka görev klasörünün yolunu ver.
- Her agent çağrısında şunu da hatırlat: "Önce `.claude/proje/INDEX.md`'yi oku, projeyi baştan tarama; standart skill'lerini yükle ve uy."
- Kullanıcıya her adımda tek satırlık durum bildir ("Analiz bitti, 4 soru var", "Kod yazıldı, build başarılı, testlere geçiyorum").
- **Agent raporuna körü körüne güvenme.** coder veya db "tamamlandı" dediğinde `git status --short` ile gerçekten dosya değiştiğini kontrol et.
  Kullanıcıya "build başarılı / testler geçti" derken bunu agent'ın gerçek komut çıktısına dayandır.
- Kod commit etme, push etme, veritabanında script çalıştırma. Bunlar kullanıcının işi.

## Agent çağırma: model seçimi
Ekibin varsayılan modeli her agent dosyasında yazılıdır. Kullanıcı kendi makinesinde bunu değiştirebilir (`/ajan-ayarlari`).
**Her agent çağrısından hemen önce** şu iki dosyayı oku (yoksa yok say; küçük dosyalardır):
1. `.claude/dotnet-oracle-ayarlar.local.json` (proje ayarı — önceliklidir)
2. `~/.claude/dotnet-oracle-ayarlar.json` (kullanıcı ayarı)

Çağıracağın agent için `agentlar.<agent>.model` ve `agentlar.<agent>.effort` değerlerine bak; alan bazında önce proje, sonra kullanıcı dosyası geçerlidir.
- Bir değer bulduysan agent aracını çağırırken onu parametre olarak ver: `model` her zaman; `effort` ise araç bu parametreyi kabul ediyorsa.
- Değer yoksa parametre verme; agent dosyasındaki ekip varsayılanı geçerli olur.

Dosyalar her çağrıdan önce okunduğu için kullanıcının akış sırasında yaptığı değişiklik bir sonraki agent çağrısında geçerli olur.
Adım 0'ın sonunda, yerel ayarla değiştirilmiş agent'ları kullanıcıya tek satırla bildir (örn. "Yerel ayar: coder → sonnet").

## Durum kaydı
Akışın hangi adımda olduğu dosyalara yazılır; bir panel veya `/durum` komutu bunları okur. Agent'ların başlama/bitiş zamanı, modeli ve token kullanımı
plugin'in hook'u tarafından otomatik kaydedilir (`agentlar.json`); sen yalnızca **adım** bilgisini yazarsın:

- Adım 0'da `.claude/gorevler/aktif.json` dosyasını yaz: `{"gorev": "<ID>", "baslik": "<task'ın ilk satırı, en fazla 80 karakter>", "baslangic": "<ISO zaman>", "durum": "calisiyor"}`
- Her adıma girerken ve kullanıcıdan cevap beklemeye başlarken görev klasöründeki `adim.json` dosyasının **tamamını** yeniden yaz:
  ```json
  {"adim": 3, "ad": "Kod", "tur": 1, "bekleyen": null, "guncelleme": "<ISO zaman>"}
  ```
  | adim | ad |
  |---|---|
  | 0 | Hazırlık |
  | 1 | Analiz / Kararlar bekleniyor |
  | 2 | Veritabanı |
  | 3 | Kod |
  | 4 | Test |
  | 5 | Review |
  | 6 | Düzeltme |
  | 7 | Kapanış / Tamamlandı |

  `adim` ve `ad` bu tablodan gelir (adım numaraları bu dosyadaki "Adım N" başlıklarıyla aynıdır).
  `bekleyen`: kullanıcıdan cevap beklerken `"kullanici"`, aksi halde `null`. `tur`: düzeltme döngüsündeki tur numarası (ilk geliştirme = 1).
- Agent'lara görev klasörünü her zaman `.claude/gorevler/<ID>/` biçiminde yaz; hook görevi bu yoldan tanır.
- Bu dosyaları yazmak kısa tut: içeriği tek satır JSON olarak yaz, dosyayı geri okuma.

## Adım 0 — Hazırlık
1. `.claude/proje/INDEX.md` yoksa kullanıcıya söyle ve sor: "Bu proje henüz öğrenilmemiş. Önce /proje-ogren çalıştırılsın mı? (Önerilen: her task'ta keşif maliyetini önler)".
   Evet derse `proje-kesif` agent'ını `mod: tam` ile çalıştır, sonra devam et.
2. `.claude/proje/_meta.md` içindeki commit ile `git rev-parse HEAD` arasında 30'dan fazla commit varsa, kullanıcıya `/proje-guncelle` önerisini tek satırla bildir (akışı durdurma).
3. Görev ID'sini belirle: task "ABC-123:" gibi bir ön ekle başlıyorsa onu kullan, yoksa `YYYYMMDD-kisa-baslik` üret.
4. `.claude/gorevler/<ID>/` klasörünü oluştur ve task içeriğini **değiştirmeden** `task.md` dosyasına yaz.
5. `aktif.json` ve `adim.json` (adim 0) dosyalarını yaz (bkz. "Durum kaydı").
6. Model ayarlarını oku ve yerel ayar varsa kullanıcıya tek satırla bildir (bkz. "Agent çağırma: model seçimi").

## Adım 1 — Analiz ve kararlar
1. `analyst` agent'ını (dotnet-oracle:analyst) görev klasörü yoluyla çağır.
2. `analiz.md` içinden yalnızca "Sorular", "Varsayımlar" ve "DB işleri" bölümlerini oku.
3. Soruları kullanıcıya **AskUserQuestion** aracıyla sor: bir seferde en fazla 4 soru, her soruda analizdeki seçenekler, önerilen seçenek ilk sırada.
   4'ten fazla soru varsa birden fazla turda sor.
4. Projede test projesi yoksa ve bu konuda daha önce karar verilmemişse (önceki görevlerin `kararlar.md`'lerinde veya INDEX.md'de) şu soruyu da ekle:
   "Bu projede test projesi yok. tester agent bir xUnit test projesi oluştursun mu?" — seçenekler: "Evet, oluştur (Önerilen)" / "Hayır, sadece manuel test planı".
5. Varsayımları kullanıcıya kısa bir liste olarak göster ve itirazı olup olmadığını sor (ayrı bir soru olarak, "Varsayımlar uygun" seçeneği ilk sırada).
6. Cevapları `kararlar.md` dosyasına yaz:
   ```markdown
   # Kararlar
   | # | Soru | Karar | Not |
   |---|---|---|---|
   ## Varsayımlar
   - <onaylanan veya kullanıcının düzelttiği varsayımlar>
   ## Test
   - Test projesi: oluşturulsun / oluşturulmasın / mevcut
   ```

## Adım 2 — Veritabanı (gerekirse)
`analiz.md`'deki "DB işleri" bölümü "Yok" değilse `db` agent'ını (dotnet-oracle:db) çağır.

## Adım 3 — Kod
1. `coder` agent'ını (dotnet-oracle:coder) çağır.
2. coder "DB işi gerekiyor" diye dönerse: talebi görev klasöründe `db-talepleri.md` dosyasına ekle, `db` agent'ını bu dosyayı da okumasını söyleyerek çağır, sonra coder'ı "DB işi tamamlandı, devam et" diye yeniden çağır.
3. coder bir soru dönerse: AskUserQuestion ile kullanıcıya sor, cevabı `kararlar.md`'ye ekle, coder'ı yeniden çağır.
4. coder build'in başarısız olduğunu söylüyorsa bir kez daha "build'i düzelt" diye çağır; yine başarısızsa dur ve kullanıcıya durumu bildir.

## Adım 4 — Test
`tester` agent'ını (dotnet-oracle:tester) çağır.
- Sonuç KALDI ve **KRİTİK** hata varsa review'a geçme; doğrudan Adım 6'daki düzeltme döngüsüne git (coder hataları `test-raporu.md`'den okur).

## Adım 5 — Review
`reviewer` agent'ını (dotnet-oracle:reviewer) çağır.
- ONAY → Adım 7.
- DÜZELTME GEREKLİ → Adım 6.

## Adım 6 — Düzeltme döngüsü
Tur sayacı tut (ilk geliştirme = tur 1).
1. Bulguların sorumlusuna göre çağır: `db` sorumlu bulgular varsa önce db agent, sonra coder ("review.md son tur ve test-raporu.md son turdaki bulguları düzelt; önce her bulguyu koda karşı doğrula, yanlış bulguya gerekçeyle itiraz et; hata düzeltirken hata-ayiklama sürecini izle; kapsam dışına çıkma").
   - coder bir bulgu için **Kullanıcıya sor** derse (bulgu bir kullanıcı kararıyla çelişiyorsa): AskUserQuestion ile sor, cevabı `kararlar.md`'ye ekle ve coder'a ilet.
   - reviewer bir bulguyu **Anlaşmazlık** olarak işaretlerse (coder itiraz etti, reviewer itirazı kabul etmedi): iki tarafın gerekçesini tek cümleyle özetleyip AskUserQuestion ile kullanıcıya sor
     ("coder haklı, bulguyu kapat" / "reviewer haklı, düzeltilsin"). Kararı `kararlar.md`'ye yaz. Aynı anlaşmazlık için tur harcama.
2. Ardından Adım 4 (test) ve Adım 5 (review) tekrar.
3. **En fazla 3 tur.** 3. turun sonunda hâlâ ENGELLEYİCİ varsa dur; kalan bulguları kullanıcıya listele ve AskUserQuestion ile sor:
   "Bir tur daha dene" / "Kalanları ben düzelteceğim, akışı bitir" / "Bulguyu kabul et ve bitir (gerekçeyi kararlara yaz)".

## Adım 7 — Kapanış
1. Görev klasörüne `ozet.md` yaz:
   - Ne yapıldı (3-5 madde), değişen dosyalar
   - DB script'leri ve **çalıştırma sırası** (varsa)
   - Manuel test adımları (test-raporu.md'den)
   - Açık kalan ÖNERİ'ler
   - Önerilen commit mesajı (Türkçe, tek satır başlık + kısa gövde)
2. `adim.json`'u `{"adim": 7, "ad": "Tamamlandı", ...}` olarak, `aktif.json`'u `"durum": "tamamlandi"` olarak güncelle.
   Akış kullanıcı kararıyla erken biterse `"ad": "Durduruldu"` ve `"durum": "durduruldu"` yaz.
3. Kullanıcıya özeti kısa göster; `ozet.md` yolunu ver.
4. Değişiklik yeni bir proje, yeni bir tablo/trigger/package veya yeni bir endpoint grubu ekliyorsa:
   "Proje haritası güncellensin mi?" diye sor; evet derse `proje-kesif` agent'ını `mod: guncelle` ile çağır
   (commit edilmemiş değişiklikleri de `git diff HEAD` ile hesaba katmasını söyle).
