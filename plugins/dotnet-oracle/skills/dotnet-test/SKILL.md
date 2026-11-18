---
name: dotnet-test
description: .NET test standardı — xUnit test projesi yapısı, test isimlendirme, Arrange-Act-Assert, mock kullanımı, neyin birim neyin entegrasyon testi olacağı ve Oracle'a bağlı kodun test edilmesi. Test projesi oluşturulurken, test yazılırken veya test incelenirken HER ZAMAN kullan.
---

# Test standardı (xUnit)

> Başlangıç standardıdır. Projede zaten bir test projesi varsa onun framework'üne, mock kütüphanesine ve klasör düzenine uy.

## Test projesi yapısı
- Test framework'ü: **xUnit**. Mock: **NSubstitute** (projede Moq kullanılıyorsa Moq). Assertion: xUnit `Assert` (projede başka bir kütüphane varsa o).
- Test projeleri `tests/` klasöründe, test ettiği projenin adı + `.Tests` son ekiyle:
  ```
  src/Company.Orders.Api/
  src/Company.Orders.Application/
  tests/Company.Orders.Application.Tests/
  ```
- Yeni test projesi oluşturma:
  ```bash
  dotnet new xunit -o tests/<Proje>.Tests
  dotnet sln add tests/<Proje>.Tests
  dotnet add tests/<Proje>.Tests reference src/<Proje>
  dotnet add tests/<Proje>.Tests package NSubstitute
  ```
- Test projesi içindeki klasör yapısı, test edilen projenin klasör yapısını takip eder. `OrderService` → `Services/OrderServiceTests.cs`.

## İsimlendirme
- Test sınıfı: `<TestEdilenSınıf>Tests`
- Test metodu: `<Metot>_<Senaryo>_<BeklenenSonuç>`
  ```csharp
  [Fact]
  public async Task CancelAsync_OrderAlreadyShipped_ThrowsBusinessRuleException()
  ```

## Test gövdesi
- **Arrange / Act / Assert** blokları boş satırla ayrılır; gerekiyorsa `// Arrange` yorumlarıyla.
- Bir test tek davranışı doğrular. Birden fazla `Assert` olabilir ama hepsi aynı davranışa aittir.
- Testler birbirinden bağımsızdır; sıra ve paylaşılan durum yok.
- Testlerde `DateTime.Now`, rastgele değer veya gerçek ağ/dosya erişimi yok; bunlar soyutlanıp sabitlenir.
- Aynı mantığı farklı girdilerle test ederken `[Theory]` + `[InlineData]`.
- Async kodu `async Task` testlerle test et; `.Result` yasak.
- Exception testi: `await Assert.ThrowsAsync<BusinessRuleException>(() => sut.CancelAsync(id, ct));`

## Ne test edilir?
| Katman | Test türü | Not |
|---|---|---|
| Servis / iş kuralı / validasyon / mapping | **Birim testi** (zorunlu) | Repository ve dış servisler mock'lanır |
| Controller | Genelde gerekmez | Controller ince olmalı; mantık servistedir |
| Repository / SQL / Dapper sorgusu | Entegrasyon testi | Gerçek Oracle ister; aşağıya bak |
| Trigger, PL/SQL | Manuel test + SQL kontrol sorgusu | tester agent'ın raporunda yer alır |

- Her kabul kriteri için en az bir test.
- "Mutlu yol"un yanında en az şu senaryolar: null/boş girdi, sınır değerler, bulunamayan kayıt, yetkisiz erişim, beklenen iş hatası.

## Oracle'a bağlı testler
- Gerçek Oracle'a bağlanan testler `[Trait("Category", "Integration")]` ile işaretlenir; birim testlerden ayrı çalıştırılabilir:
  `dotnet test --filter "Category!=Integration"`
- Entegrasyon testleri ortak/geliştirme veritabanındaki veriyi kalıcı olarak değiştirmez: transaction içinde çalışır ve sonda geri alınır,
  ya da kendi oluşturduğu veriyi temizler.
- Connection string test kodunda yazmaz; ortam değişkeni veya user-secrets'tan okunur. Yoksa test `Skip` edilir, başarısız olmaz.

## Kontrol listesi
Zorunlu:
- [ ] Her kabul kriterinin en az bir testi var
- [ ] İsimlendirme `<Metot>_<Senaryo>_<BeklenenSonuç>`
- [ ] Testler bağımsız; zamana/rastgeleliğe bağımlılık yok
- [ ] Oracle'a bağlanan testler `Integration` olarak işaretli
- [ ] Testlerde connection string veya gizli bilgi yok

Tavsiye:
- [ ] AAA blokları belirgin
- [ ] Tekrarlayan senaryolar `[Theory]` ile
- [ ] Hata senaryoları test edilmiş
