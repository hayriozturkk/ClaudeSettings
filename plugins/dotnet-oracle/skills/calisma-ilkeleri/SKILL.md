---
name: calisma-ilkeleri
description: Ekipteki tüm agent'ların ortak çalışma ilkeleri — işe başlamadan belirsizliği netleştirmek, önce mevcut olanı kullanmak, yalnızca görevin gerektirdiği yere dokunmak, korunması zorunlu kurallar ve teslimden önce komut çıktısıyla doğrulamak. Analiz, kod, DB script'i, test veya review yaparken HER ZAMAN kullan.
---

# Çalışma ilkeleri

Bu skill, diğer standart skill'lerin **nasıl** uygulanacağını belirler. Standartlar "ne yazılır" der; bu dosya "nasıl çalışılır" der.
İkisi çatışırsa standart skill'lerdeki **Zorunlu** maddeler kazanır.

---

## A. Göreve başlamadan

**Görevi kendi cümlelerinle yeniden yaz.** `task.md`, `analiz.md` ve `kararlar.md`'yi okuduktan sonra yapacağın işi 2-3 cümleyle özetle.
Özetleyemiyorsan görevi henüz anlamamışsın demektir.

**Belirsizliği tahminle kapatma.** Şu durumlarda dur:
- Task iki farklı şekilde okunabiliyor (örn. "siparişi iptal et" → durum mu değişecek, kayıt mı silinecek?)
- Bir karar `kararlar.md`'de yok ve kodun şeklini değiştiriyor (yeni tablo mu, mevcut tabloya kolon mu?)
- Mevcut kod, verilen kararla çelişiyor

Agent isen soruyu ana oturuma dön; ana oturum kullanıcıya sorar. Küçük ve kolay geri alınabilir bir detaysa en basit seçeneği uygula
ve `degisiklikler.md` → "Verilen küçük kararlar" bölümüne yaz.

**Daha basit bir yol görüyorsan söyle.** Task bir ekran, bir tablo ve bir trigger istiyor ama mevcut bir kolon ve tek bir sorgu işi görüyorsa
bunu analiz veya not olarak yaz. Sessizce istenenden farklısını yapma; sessizce gereksiz olanı da yapma.

---

## B. Kod yazarken

### B1. Yeniden kullanım sırası
Yeni kod yazmadan önce bu sırayla ara ve bulduğun ilk uygun şeyi kullan:

| Sıra | Nereye bak | Örnek |
|---|---|---|
| 1 | **Projenin kendi kodu** | `PagedResult<T>`, ortak `BaseRepository`, `OracleErrorMapper`, mevcut extension method'lar |
| 2 | **.NET / ASP.NET Core** | `ArgumentException.ThrowIfNullOrWhiteSpace`, LINQ, `IOptions<T>`, `ProblemDetails`, `TimeProvider` |
| 3 | **Oracle'ın kendisi** | Constraint (CHECK, UNIQUE, FK), `IDENTITY`, `MERGE`, analitik fonksiyonlar |
| 4 | **Projede kurulu paketler** | Dapper, FluentValidation, AutoMapper — proje hangisini kullanıyorsa |
| 5 | **Yeni kod** | Yalnızca yukarıdakiler işi görmüyorsa |

Yeni NuGet paketi eklemek bir karardır: `kararlar.md`'de yoksa ana oturuma sor.

### B2. Kapsam: neye dokunulur, neye dokunulmaz
- Dokunduğun her satırı tek cümleyle task'a veya bir karara bağlayabilmelisin. Bağlayamıyorsan o satırı geri al.
- Aynı dosyada gözüne çarpan ilgisiz sorunları **düzeltme**; `degisiklikler.md` → "Kapsam dışı notlar"a yaz.
- Dosyanın mevcut düzenine uy: isimlendirme, satır yapısı, yorum dili. Kendi tarzını dayatma.
- Kendi değişikliğinin geride bıraktığı artıkları temizle (kullanılmayan `using`, metot, DI kaydı). Önceden var olan ölü kodu silme.
- Bir metodun davranışını veya imzasını değiştirdiysen, onu kullanan **her yeri** bul ve güncelle: çağıranlar, DI kayıtları, mapping'ler, testler.
  İş yalnızca senin açtığın dosyada bitmez.

### B3. Gereğinden fazlasını yazma
- İstenmeyen parametre, ayar, "ileride lazım olur" metodu, kullanılmayan overload ekleme.
- Tek bir yerde kullanılacak kod için ayrı katman, generic yapı veya factory açma.
  **İstisna:** Projede her servisin bir interface'i ve DI kaydı varsa, sen de öyle yap. Projenin mimarisi bu kuralın üstündedir.
- Gerçekleşemeyecek durumlar için savunma kodu yazma (örn. DI'dan gelen bir bağımlılığın null kontrolü).
- Yazdığın kod beklenenden uzunsa dur ve bir kez daha B1'e bak.

Bilerek sınırlı bir çözüm seçtiysen sınırı koda yaz ki reviewer bunu hata sanmasın:
```csharp
// BILINCLI-SINIR: rapor tüm kayıtları belleğe alıyor; günlük kayıt 50.000'i geçerse sayfalı okumaya geçilmeli.
```

### B4. Dokunulmazlar
Aşağıdakiler "sade olsun" veya "kapsam dışı" gerekçesiyle **asla** atlanmaz veya kısaltılmaz:
- Dışarıdan gelen girdinin doğrulanması (API isteği, dosya, kuyruk mesajı, başka sistemden gelen veri)
- Transaction sınırları ve veri tutarlılığını koruyan hata yönetimi
- Parametreli SQL, yetki kontrolü, hassas verinin loglanmaması
- Kullanıcının task'ta veya kararlarda açıkça istediği her şey
- Standart skill'lerdeki **Zorunlu** kontrol listesi maddeleri

---

## C. Teslim etmeden önce

**"Oldu" demek için kanıt gerekir.** Bir sonucu raporlamadan önce o sonucu gösteren komutu bu turda çalıştır ve çıktısını oku.

| Raporlayacağın şey | Kanıtı | Kanıt sayılmaz |
|---|---|---|
| Kod derleniyor | `dotnet build` → çıkış kodu 0, hata sayısı 0 | "Değişiklik küçüktü" |
| Yeni uyarı yok | Build çıktısındaki uyarı sayısı öncekiyle aynı | Çıktının yalnızca sonunu okumak |
| Testler geçiyor | `dotnet test` → başarısız: 0 | Önceki turdaki sonuç |
| Hata düzeldi | Hatayı gösteren test önce kırmızıydı, şimdi yeşil | "Kodu düzelttim" |
| Kabul kriterleri tamam | `analiz.md`'deki her kriter için tek tek işaretlenmiş liste | "Testler geçiyor" |
| DB script'i hazır | Script dosyası ve rollback eşi diskte var | "Script'i yazdım" |

Raporunda "sanırım", "muhtemelen", "olması lazım" geçiyorsa doğrulamayı yapmamışsın demektir. Komutu çalıştır, sonra yaz.
Doğrulayamadığın bir şey varsa (örn. Oracle'a bağlanamadığın için trigger'ı çalıştıramadın) bunu açıkça "doğrulanmadı" olarak yaz.

## Kontrol listesi
Zorunlu:
- [ ] B4'teki dokunulmazlardan hiçbiri atlanmamış veya kısaltılmamış
- [ ] Değişen her satır task'a veya bir karara bağlanabiliyor; ilgisiz refactor yok
- [ ] Değişen metotların tüm kullanım yerleri güncellenmiş
- [ ] Raporlanan her sonuç (build, test, düzeltme) bu turda çalıştırılan komutun çıktısına dayanıyor

Tavsiye:
- [ ] B1 sırası izlenmiş; projede veya .NET'te hazır olan şey yeniden yazılmamış
- [ ] İstenmeyen parametre, ayar veya tek kullanımlık soyutlama yok
- [ ] Bilinçli sınırlar `// BILINCLI-SINIR:` yorumuyla işaretli
- [ ] Verilen küçük kararlar ve kapsam dışı notlar `degisiklikler.md`'de
