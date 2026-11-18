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
- Kod commit etme, push etme, veritabanında script çalıştırma. Bunlar kullanıcının işi.

## Adım 0 — Hazırlık
1. `.claude/proje/INDEX.md` yoksa kullanıcıya söyle ve sor: "Bu proje henüz öğrenilmemiş. Önce /proje-ogren çalıştırılsın mı? (Önerilen: her task'ta keşif maliyetini önler)".
   Evet derse `proje-kesif` agent'ını `mod: tam` ile çalıştır, sonra devam et.
2. `.claude/proje/_meta.md` içindeki commit ile `git rev-parse HEAD` arasında 30'dan fazla commit varsa, kullanıcıya `/proje-guncelle` önerisini tek satırla bildir (akışı durdurma).
3. Görev ID'sini belirle: task "ABC-123:" gibi bir ön ekle başlıyorsa onu kullan, yoksa `YYYYMMDD-kisa-baslik` üret.
4. `.claude/gorevler/<ID>/` klasörünü oluştur ve task içeriğini **değiştirmeden** `task.md` dosyasına yaz.

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
1. Bulguların sorumlusuna göre çağır: `db` sorumlu bulgular varsa önce db agent, sonra coder ("review.md son tur ve test-raporu.md son turdaki bulguları düzelt; kapsam dışına çıkma").
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
2. Kullanıcıya özeti kısa göster; `ozet.md` yolunu ver.
3. Değişiklik yeni bir proje, yeni bir tablo/trigger/package veya yeni bir endpoint grubu ekliyorsa:
   "Proje haritası güncellensin mi?" diye sor; evet derse `proje-kesif` agent'ını `mod: guncelle` ile çağır
   (commit edilmemiş değişiklikleri de `git diff HEAD` ile hesaba katmasını söyle).
