---
name: csharp-kod-standardi
description: Ekibin genel C# yazım standardı — isimlendirme, dosya düzeni, async/await, nullable, DI, sabitler, yorumlar. Herhangi bir C# sınıfı, servis, model, controller veya extension yazılırken ya da C# kodu incelenirken HER ZAMAN kullan.
---

# C# kod standardı

> Bu bir başlangıç standardıdır; ekip kararlarına göre güncellenir. Bir proje bu standarttan farklı, yerleşik bir desene sahipse
> (proje haritasında "Projeye özgü kurallar" bölümüne bak) projeninkine uy ve sapmayı not et.

## İsimlendirme
| Öğe | Kural | Örnek |
|---|---|---|
| Sınıf, record, enum, metot, property | PascalCase | `OrderService`, `GetByIdAsync` |
| Interface | `I` + PascalCase | `IOrderRepository` |
| Parametre, yerel değişken | camelCase | `orderId` |
| Private alan | `_` + camelCase | `_orderRepository` |
| Sabit (`const`) | PascalCase | `MaxRetryCount` |
| Async metot | `Async` son eki | `SaveAsync` |
| Generic tip parametresi | `T` + açıklama | `TEntity` |

- Kod (sınıf, metot, değişken adları) **İngilizce** yazılır. Yorumlar, log mesajları ve kullanıcıya dönen mesajlar projenin mevcut diline uyar.
- Kısaltma kullanma (`cust` değil `customer`). Yaygın kısaltmalar serbest: `Id`, `Dto`, `Url`, `Http`.
- Boolean adları soru gibi okunur: `isActive`, `hasPermission`, `canCancel`.

## Dosya ve sınıf düzeni
- Bir dosyada bir public tip. Dosya adı tip adıyla aynı.
- File-scoped namespace kullan: `namespace Company.Project.Orders;`
- Namespace klasör yapısını takip eder.
- Sınıf içi sıra: sabitler → private alanlar → constructor → public metotlar → private metotlar.
- `using`'ler dosya başında; kullanılmayanları sil. Projede `GlobalUsings.cs` varsa ortak olanları oraya koy.

## Değişkenler ve tipler
- Tip sağ tarafta açıksa `var` kullan (`var order = new Order();`). Açık değilse tipi yaz (`decimal total = CalculateTotal();`).
- Nullable reference types projede açıksa uyarıları bastırma; `!` (null-forgiving) yalnızca gerçekten null olamayacağı kanıtlanmışsa.
- Para ve miktar için `decimal`; asla `double`/`float`.
- Tarih için projede UTC kullanılıyorsa `DateTime.UtcNow`; sabit zaman gerekiyorsa `TimeProvider` veya projedeki saat soyutlamasını kullan, testlerde `DateTime.Now`'a bağımlı kalma.
- Sihirli string ve sayı yok: sabit, enum veya konfigürasyon (Options pattern) kullan.

## Async/await
- I/O yapan her metot async: `Task`/`Task<T>` döner, `Async` son eki alır.
- `.Result`, `.Wait()`, `GetAwaiter().GetResult()` **yasak** (deadlock ve thread tükenmesi riski).
- `async void` yasak (event handler hariç).
- `CancellationToken` controller'dan veri erişimine kadar zincir boyunca taşınır; son parametredir ve `cancellationToken` adını alır.
- Kütüphane kodunda gerekiyorsa `ConfigureAwait(false)`; ASP.NET Core uygulama kodunda gerekmez.

## Bağımlılıklar ve DI
- Bağımlılıklar constructor üzerinden alınır; `new` ile servis oluşturma, service locator (`IServiceProvider.GetService`) kullanma.
- Projede primary constructor kullanılıyorsa onu kullan; yoksa `private readonly` alanlar.
- Servis ömürleri: DbContext ve veri erişimi `Scoped`; durumsuz yardımcılar `Singleton`; şüphedeysen `Scoped`.
- Statik yardımcı sınıflar yalnızca saf fonksiyonlar için (yan etkisiz, dış bağımlılıksız).

## Metotlar
- Bir metot tek iş yapar. 40 satırı geçiyorsa bölmeyi düşün.
- En fazla 4 parametre; fazlası için parametre nesnesi (record) kullan.
- Erken dönüş (guard clause) ile iç içe `if` derinliğini azalt.
- Public metotlarda parametre doğrulaması: `ArgumentNullException.ThrowIfNull(x)`, `ArgumentException.ThrowIfNullOrWhiteSpace(s)`.

## Modeller
- DTO ve request/response modelleri için `record` tercih et; entity'ler projedeki desene uyar.
- Entity'yi doğrudan API'den dönme; DTO'ya map'le (projede AutoMapper/Mapster varsa onu, yoksa elle map).

## Yorumlar
- Kodun **ne** yaptığını değil **neden** yaptığını yorumla.
- Public API'lerde (kütüphane, paylaşılan servis) XML doc (`/// <summary>`) yaz.
- Yorum satırına alınmış eski kod bırakma; git geçmişi var.
- `TODO` yazacaksan sahibini ve nedenini yaz: `// TODO(ad): neden`.

## Kontrol listesi
Zorunlu (ihlali reviewer'da ENGELLEYİCİ):
- [ ] `.Result` / `.Wait()` / `async void` yok
- [ ] I/O yapan metotlar async ve `CancellationToken` taşıyor
- [ ] Para/miktar `decimal`
- [ ] Sihirli string/sayı yok
- [ ] Bağımlılıklar DI ile alınıyor, `new` ile servis oluşturulmuyor
- [ ] Entity doğrudan API'den dönülmüyor

Tavsiye (ihlali ÖNERİ):
- [ ] İsimlendirme tablosuna uygun
- [ ] File-scoped namespace, dosya başına bir public tip
- [ ] Metot 40 satırın, parametre 4'ün altında
- [ ] Yorumlar "neden"i açıklıyor, yorum satırında kod yok
