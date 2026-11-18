---
name: hata-ayiklama
description: .NET + Oracle projelerinde hata ayıklama yöntemi — hatanın türüne göre ilk bakılacak yerler (build, test, exception, ORA hatası, yanlış sonuç, yavaşlık), sık görülen Oracle kaynaklı nedenler, kök neden bulunmadan düzeltme yapmama ve deneme sınırı. Build hatası, başarısız test, exception veya tester/reviewer'ın bildirdiği bir hatayı düzeltmeden önce HER ZAMAN kullan.
---

# Hata ayıklama

Bir hatayı düzeltmek, hatanın **neden** oluştuğunu açıklayabildikten sonra başlar.
"Şu satırı değiştirince geçti" bir açıklama değildir. Açıklama şöyle olur: "Repository'de `BindByName` yoktu; parametreler sıraya göre bağlandığı için `:status` değeri `ID` kolonuna gitti."

---

## 1. Hata nereden geliyor? İlk bakılacak yerler

| Hata türü | İlk bak | Sonra |
|---|---|---|
| **Build hatası** | Listedeki **ilk** hata. Sonrakiler çoğu zaman onun yan etkisidir. | Bu görevde değişen dosyalar (`git diff --stat`) |
| **Test başarısız** | Testin beklediği ile aldığı değer; test mi yanlış kod mu? | Test bu görevde mi yazıldı, yoksa önceden var olup şimdi mi bozuldu? (`git diff` ile testin değişip değişmediğine bak) |
| **Exception** | Stack trace'in tamamı ve `InnerException` zinciri | Exception'ın fırlatıldığı katman: Controller, Servis, Repository, Oracle |
| **ORA-xxxxx** | `OracleException.Number` ve mesajdaki nesne adı | Bölüm 2'deki tablo |
| **Yanlış sonuç** | Hangi girdiyle yanlış? Doğru sonuç ne olmalıydı? | Değeri katman katman izle (bölüm 3) |
| **Yavaşlık** | Döngü içinde sorgu var mı (N+1), sorgu kaç satır getiriyor? | Sorgunun execution plan'ı, eksik index |

---

## 2. Oracle kaynaklı sık nedenler

Bir Oracle veya veri erişimi hatasında önce bu listeyi kontrol et:

| Belirti | Muhtemel neden | Bakılacak yer |
|---|---|---|
| Değerler yanlış kolonlara gidiyor, tip hatası | `OracleCommand.BindByName = true` eksik | ADO.NET kullanan repository |
| ORA-01400 (NULL eklenemez) ama C#'ta değer `""` | Oracle'da boş string NULL'dur | Validasyon ve kolonun NULL kuralı |
| ORA-12899 (değer çok büyük), Türkçe karakterli metinde | Kolon `VARCHAR2(n BYTE)` | DDL: `VARCHAR2(n CHAR)` olmalı |
| ORA-04091 (tablo değişiyor) | Satır seviyesi trigger aynı tabloyu okuyor | Trigger → compound trigger'a çevir |
| ORA-00942 / ORA-00904 (tablo/kolon yok) | İsim büyük/küçük harf farkı, eksik şema öneki veya script çalıştırılmamış | EF Core eşlemesi, `db-degisiklikleri.md` çalıştırma sırası |
| `InvalidCastException` okurken | `NUMBER` hassasiyeti ile C# tipi uyuşmuyor | `dotnet-veri-erisimi` tip eşleme tablosu |
| ORA-00001 testte rastgele çıkıyor | Testler aynı veriyi paylaşıyor veya temizlemiyor | Test verisi oluşturma/temizleme |
| ORA-01795 | `IN` listesinde 1000'den fazla eleman | Listeyi parçala |

---

## 3. Değeri katman katman izle

Yanlış sonuç veya beklenmeyen exception için hatanın **hangi katmanda** başladığını bul:

```
İstek (DTO) ──► Controller ──► Servis ──► Repository ──► SQL / Oracle ──► sonuç ──► mapping ──► yanıt
```

- Her ok bir sınırdır. Değerin bir sınırdan doğru girip yanlış çıktığı ilk yeri bul; sorun oradadır.
- Kontrol için geçici log veya test içi ara assertion kullanabilirsin; düzeltmeden sonra geçici logları kaldır.
- Hatalı değeri bulduğunda "bu değer buraya nereden geldi?" diye geriye git. Düzeltmeyi değerin bozulduğu yerde yap;
  bozuk değerin sonradan kullanıldığı yerde yama yapma.
- Bu görevin öncesinde çalışan benzer bir akış varsa (başka bir endpoint, başka bir repository metodu) onu bozuk olanla yan yana koy;
  aradaki her farkı yaz.

---

## 4. Düzeltme kuralları

1. **Neden yazılı olmadan kod değişmez.** Kök nedeni bir cümleyle `degisiklikler.md` → "Kök neden" bölümüne yaz.
2. **Önce hatayı yakalayan test.** Test projesi varsa hatayı gösteren testi yaz (veya tester'ın yazdığını kullan) ve kırmızı olduğunu gör.
   Test projesi yoksa hatayı tekrar üretme adımlarını yaz.
3. **Tek seferde tek değişiklik.** Birden fazla şeyi aynı anda değiştirirsen hangisinin işe yaradığını bilemezsin.
4. **İşe yaramayan değişikliği geri al**, sonra yeni bir neden düşün. Başarısız denemelerin üstüne yenisini ekleme.
5. **Belirtiyi bastırmak düzeltme değildir:** exception'ı yakalayıp yutmak, `?? default` ile geçiştirmek, testi gevşetmek, `[Skip]` eklemek yasak.
6. **Doğrula:** Kırmızı test yeşil oldu mu, diğer testler hâlâ geçiyor mu, `dotnet build` temiz mi? (bkz. `calisma-ilkeleri` C)

### Deneme sınırı
Aynı hata için yaptığın düzeltme denemelerini say.
- **1-2. deneme tutmadıysa:** Bölüm 1'e dön; elindeki yeni bilgiyle nedeni yeniden düşün.
- **3. deneme de tutmadıysa: dur.** Her düzeltmenin başka bir yerde yeni sorun çıkarması genelde tasarımın kendisinde bir sorun olduğunu gösterir.
  Daha fazla deneme yapma. Ana oturuma şunları dön: hata, denediğin üç neden ve sonuçları, tasarımla ilgili şüphen. Kullanıcı karar verir.

---

## Kontrol listesi
Zorunlu:
- [ ] Kök neden `degisiklikler.md`'de bir cümleyle yazılı
- [ ] Hata yutularak, `catch` ile bastırılarak, test gevşetilerek veya atlanarak "çözülmedi"
- [ ] Test projesi varsa hatayı gösteren test önce kırmızı, sonra yeşil
- [ ] Üç başarısız denemeden sonra durulup ana oturuma dönüldü

Tavsiye:
- [ ] Düzeltme, değerin bozulduğu katmanda yapılmış
- [ ] Geçici log ve debug kodu temizlenmiş
- [ ] Aynı hatanın tekrarını önleyecek validasyon gerekiyorsa eklenmiş
