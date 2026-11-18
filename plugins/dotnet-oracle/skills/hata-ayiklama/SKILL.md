---
name: hata-ayiklama
description: Sistematik hata ayıklama — önce kök neden, sonra düzeltme. Build hatası, başarısız test, exception, ORA hatası, yanlış sonuç veya performans sorunu ile karşılaşıldığında ve tester/reviewer bulgularını düzeltirken, düzeltme önermeden ÖNCE HER ZAMAN kullan.
---

# Hata ayıklama

> Kaynak: Superpowers `systematic-debugging` ve `test-driven-development` skill'lerinden .NET + Oracle için uyarlanmıştır.
> Lisans: depo kökündeki `KAYNAKLAR.md`.

## Demir kural
```
KÖK NEDEN BULUNMADAN DÜZELTME YOK
```
Belirtiyi bastıran düzeltme (null kontrolü ekleyip geçmek, exception'ı yakalayıp yutmak, testi gevşetmek) düzeltme değildir.

## 1. Aşama — Kök nedeni araştır
1. **Hata mesajını tamamen oku.** Stack trace'i sonuna kadar oku; dosya, satır, ORA kodu, inner exception.
   - `OracleException.Number` → ORA kodu (bkz. `dotnet-hata-ve-loglama` tablosu).
   - EF Core hatalarında `InnerException` çoğu zaman asıl Oracle hatasıdır.
   - Build hatasında **ilk** hatadan başla; sonrakiler genelde onun sonucudur.
2. **Tekrar üret.** Hata her seferinde oluşuyor mu? Hangi girdiyle? Tekrar üretemiyorsan tahmin etme, veri topla.
3. **Son değişikliklere bak.** `git diff`, `git log -5`. Bu görevde ne değişti? Hata ondan önce var mıydı?
4. **Katmanlar arasında kanıt topla.** Controller → Servis → Repository → Oracle zincirinde değerin nerede bozulduğunu bul:
   her sınırda giren ve çıkan değeri kontrol et (debug log, test içinde ara assert). Önce **hangi katmanın** bozuk olduğunu bul, sonra o katmanı incele.
5. **Veriyi geriye doğru izle.** Hatalı değer nereden geldi? Onu kim çağırdı? Kaynağa kadar git; düzeltmeyi belirtide değil kaynakta yap.

## 2. Aşama — Desen karşılaştır
- Aynı projede **çalışan** benzer bir kod bul (benzer endpoint, benzer repository sorgusu, benzer trigger).
- Çalışan ile bozuk arasındaki tüm farkları listele; "bu önemli olamaz" deme.
- Oracle'a özgü sık nedenleri kontrol et:
  - `BindByName` eksik → parametreler sıraya göre bağlanıp yanlış kolona gidiyor
  - Boş string NULL'a dönüşüyor → `NOT NULL` ihlali (ORA-01400) veya eşleşmeyen `WHERE`
  - `VARCHAR2(n)` byte semantiği → Türkçe karakterle ORA-12899
  - Satır seviyesi trigger'da aynı tabloyu okumak → ORA-04091 (mutating)
  - `NUMBER` ↔ C# tip uyuşmazlığı → `InvalidCastException`
  - Büyük/küçük harf: tırnaklı tanımlayıcı veya EF Core'un ürettiği isim ile tablodaki isim farkı → ORA-00942 / ORA-00904

## 3. Aşama — Tek hipotez, en küçük deneme
- Hipotezi yaz: "Kök neden X, çünkü Y."
- Hipotezi test eden **en küçük** değişikliği yap; aynı anda tek değişken.
- Tutmadıysa yeni hipotez kur; başarısız denemenin üstüne yeni düzeltme ekleme, önce geri al.
- Bilmiyorsan "X'i anlamıyorum" de; uydurma.

## 4. Aşama — Düzelt ve kanıtla
1. **Önce başarısız test.** Hatayı tekrar üreten en küçük testi yaz ve **başarısız olduğunu gör** (kırmızı).
   Test projesi yoksa, tekrar üretme adımlarını `degisiklikler.md`'ye yaz.
   tester agent hatayı zaten başarısız bir testle raporladıysa o testi kullan.
2. **Tek düzeltme.** Kök nedeni düzelt. "Hazır buradayken" iyileştirme yok.
3. **Doğrula.** Başarısız test artık geçiyor mu (yeşil)? Diğer testler hâlâ geçiyor mu? `dotnet build` temiz mi?
4. **Tutmadıysa dur ve say.** Kaçıncı düzeltme denemesi?
   - 3'ten az: 1. aşamaya dön, yeni bilgiyle yeniden analiz et.
   - **3 veya daha fazla:** Dur. Bu çoğu zaman yanlış bir tasarımın işaretidir (her düzeltme başka yerde yeni sorun çıkarıyorsa).
     Daha fazla deneme yapma; durumu ve denenenleri ana oturuma dön, kullanıcıyla tasarım konuşulsun.

## Kırmızı bayraklar — bunları düşünüyorsan 1. aşamaya dön
- "Şimdilik hızlı bir düzeltme, sonra incelerim"
- "Şunu değiştirip bakayım"
- "Birkaç değişikliği birden yapıp testi çalıştırayım"
- "Testi atlayayım, elle kontrol ederim"
- "Muhtemelen X'tir, düzelteyim"
- "Bir deneme daha" (2 denemeden sonra)

## Kontrol listesi
Zorunlu:
- [ ] Düzeltme, belirtiyi değil yazılı bir kök nedeni hedefliyor
- [ ] Hata yutularak, test gevşetilerek veya `catch` ile bastırılarak "düzeltilmedi"
- [ ] Hatayı tekrar üreten test önce kırmızı, düzeltmeden sonra yeşil (test projesi varsa)
- [ ] 3 başarısız denemeden sonra durulup kullanıcıya dönüldü

Tavsiye:
- [ ] Kök neden ve denenen hipotezler `degisiklikler.md`'ye yazıldı
- [ ] Aynı hatanın tekrarını önlemek için gereken yerde validasyon eklendi
