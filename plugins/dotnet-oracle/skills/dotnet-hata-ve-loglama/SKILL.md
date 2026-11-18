---
name: dotnet-hata-ve-loglama
description: .NET hata yönetimi ve loglama standardı — exception kullanımı, global hata yakalama, OracleException (ORA kodları) eşleme, ProblemDetails, yapılandırılmış loglama (ILogger), log seviyeleri ve hassas veri. try/catch, exception sınıfı, middleware, log satırı yazılırken HER ZAMAN kullan.
---

# Hata yönetimi ve loglama standardı

> Başlangıç standardıdır. Projede global hata middleware'i, kendi exception hiyerarşisi veya Serilog/NLog kurulumu varsa
> (proje haritası `mimari.md`) onu kullan; yenisini kurma.

## Exception kuralları
- Exception **beklenmeyen** durumlar içindir. Beklenen iş sonuçları (bulunamadı, kural ihlali) için projede Result deseni varsa onu kullan;
  yoksa projenin iş exception'larını kullan (örn. `NotFoundException`, `BusinessRuleException`).
- Exception yutma yasak:
  ```csharp
  // YASAK
  catch (Exception) { }
  catch (Exception ex) { _logger.LogError(ex, "Hata"); }   // logla-ve-devam-et, çağıran hatayı hiç görmez
  ```
- Yakaladığını ya **anlamlı şekilde ele al** ya da **tekrar fırlat**. Yeniden fırlatırken `throw;` kullan (`throw ex;` stack trace'i siler).
- Sarmalarken iç exception'ı kaybetme: `throw new OrderSyncException("...", ex);`
- `catch (Exception)` yalnızca en üst katmanda (global middleware, background job döngüsü) yapılır.
- Temizlik için `try/finally` yerine mümkünse `using`/`await using`.

## Global hata yakalama
- API'de tüm yakalanmamış hatalar tek bir yerde (exception middleware veya `IExceptionHandler`) ProblemDetails'e çevrilir.
- Controller'larda tek tek try/catch ile HTTP yanıtı üretme.
- 500 yanıtında istemciye yalnızca genel mesaj ve `traceId` döner; exception mesajı, stack trace, SQL, ORA metni **dönmez**.

## Oracle hataları
`OracleException.Number` ORA kodunun sayısal karşılığını verir (ORA-00001 → `1`). Global handler'da veya repository'de şu eşlemeyi kullan:

| ORA kodu | Anlamı | HTTP |
|---|---|---|
| ORA-00001 | Unique constraint ihlali | 409 |
| ORA-02291 | Üst kayıt (parent) bulunamadı | 400 / 422 |
| ORA-02292 | Alt kayıt var, silinemez | 409 |
| ORA-01400 | NOT NULL kolona NULL | 400 (validasyon eksik demektir — ayrıca düzelt) |
| ORA-12899 | Değer kolon için çok uzun | 400 (validasyon eksik demektir — ayrıca düzelt) |
| ORA-00054 / ORA-00060 | Kaynak kilitli / deadlock | 409 veya yeniden dene |
| ORA-20000 – ORA-20999 | PL/SQL'den `RAISE_APPLICATION_ERROR` ile gelen iş hatası | 422 (mesaj kullanıcıya gösterilebilir) |
| Diğer | Beklenmeyen | 500 |

- Bu eşlemeyi her repository'de tekrar yazma; projede tek bir yardımcı/handler'da topla.
- ORA-01400 ve ORA-12899 görüyorsan asıl düzeltme, uygulama tarafına validasyon eklemektir.

## Loglama
- `ILogger<T>` kullan; `Console.WriteLine` ve `Debug.WriteLine` yasak.
- **Yapılandırılmış log:** mesaj şablonu + parametre. Interpolation yasak.
  ```csharp
  // YASAK
  _logger.LogInformation($"Sipariş {orderId} oluşturuldu");
  // DOĞRU
  _logger.LogInformation("Sipariş {OrderId} oluşturuldu", orderId);
  ```
- Exception loglarken exception nesnesini ilk parametre olarak ver: `_logger.LogError(ex, "Sipariş {OrderId} senkronize edilemedi", orderId);`
- Aynı hatayı birden fazla katmanda loglama; hata en üstte bir kez loglanır.
- Yüksek frekanslı log satırlarında projede `LoggerMessage` source generator kullanılıyorsa onu kullan.

### Seviyeler
| Seviye | Ne zaman |
|---|---|
| `Trace` / `Debug` | Geliştirme ayrıntısı; üretimde kapalı |
| `Information` | Önemli iş olayları (sipariş oluşturuldu, job tamamlandı) |
| `Warning` | Beklenmeyen ama sistemin devam ettiği durumlar (yeniden deneme, fallback) |
| `Error` | İşlemin başarısız olduğu durumlar |
| `Critical` | Uygulamanın çalışamadığı durumlar (DB'ye hiç bağlanılamıyor) |

### Hassas veri — asla loglanmaz
Şifre, token, API anahtarı, connection string, kart numarası, TC kimlik no, tam request/response gövdesi (kişisel veri içerebilir).
Gerekirse maskele (`****1234`).

## Kontrol listesi
Zorunlu:
- [ ] Boş catch veya logla-ve-yut yok
- [ ] Yeniden fırlatma `throw;` ile
- [ ] 500 yanıtında iç ayrıntı yok
- [ ] Log satırları yapılandırılmış (interpolation yok)
- [ ] Hassas veri loglanmıyor
- [ ] `Console.WriteLine` yok

Tavsiye:
- [ ] ORA kodu eşlemesi merkezi yerde
- [ ] Log seviyeleri tabloya uygun
- [ ] Aynı hata tek yerde loglanıyor
