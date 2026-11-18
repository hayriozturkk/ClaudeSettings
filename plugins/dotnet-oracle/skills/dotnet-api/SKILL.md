---
name: dotnet-api
description: ASP.NET Core API standardı — controller/endpoint yapısı, route ve HTTP metotları, status kodları, request/response modelleri, validasyon, sayfalama ve yetkilendirme. Controller, minimal API endpoint, request/response DTO veya validator yazılırken HER ZAMAN kullan.
---

# API standardı (ASP.NET Core)

> Başlangıç standardıdır. Projelerin mimarisi farklı olabilir: önce proje haritasındaki `api.md`'ye ve aynı projedeki
> mevcut bir controller'a bak; route düzeni, response sarmalayıcı (örn. `ApiResult<T>`) ve validasyon kütüphanesi projede neyse onu kullan.

## Katman sorumluluğu
- Controller/endpoint **ince** olur: girdiyi alır, servisi (veya MediatR handler'ını) çağırır, sonucu HTTP'ye çevirir.
- İş kuralı, veri erişimi ve transaction controller'da **olmaz**.
- Controller'dan doğrudan `DbContext`, `OracleConnection` veya repository çağırma (proje bunu bilinçli olarak yapmıyorsa).

## Route ve HTTP metotları
- Kaynak adları çoğul ve küçük harf, kelimeler tire ile: `/api/orders`, `/api/order-items`.
- Fiil route'a yazılmaz; HTTP metodu anlatır.

| İşlem | Metot | Route | Başarılı yanıt |
|---|---|---|---|
| Listele | GET | `/api/orders?page=1&pageSize=20` | 200 |
| Getir | GET | `/api/orders/{id}` | 200 / 404 |
| Oluştur | POST | `/api/orders` | 201 + `Location` |
| Tam güncelle | PUT | `/api/orders/{id}` | 200 veya 204 |
| Kısmi güncelle | PATCH | `/api/orders/{id}` | 200 veya 204 |
| Sil | DELETE | `/api/orders/{id}` | 204 |
| Kaynak dışı eylem | POST | `/api/orders/{id}/cancel` | 200 / 204 |

## Status kodları
| Kod | Ne zaman |
|---|---|
| 400 | Validasyon hatası, bozuk istek |
| 401 | Kimlik doğrulanmamış |
| 403 | Yetkisiz |
| 404 | Kaynak yok |
| 409 | Çakışma: unique ihlali (ORA-00001), alt kayıt varken silme (ORA-02292), eşzamanlılık |
| 422 | İş kuralı ihlali (projede 400 kullanılıyorsa ona uy) |
| 500 | Beklenmeyen hata — ayrıntı istemciye dönmez |

- Hata yanıtları **ProblemDetails** formatında (projede kendi hata modeli varsa o). Ayrıntı: `dotnet-hata-ve-loglama`.

## Modeller
- Her endpoint'in kendi request ve response modeli olur: `CreateOrderRequest`, `OrderResponse`. `record` tercih edilir.
- Entity'yi request veya response olarak kullanma.
- Response'ta iç ayrıntı sızdırma: iç ID'ler, audit kolonları, şifre/hash alanları.

## Validasyon
- Girdi validasyonu iş mantığından önce yapılır. Projede FluentValidation varsa validator sınıfı yaz; yoksa DataAnnotations.
- Validasyon hatası 400 + alan bazlı hata listesi döner.
- Validasyon "format" kontrolüdür (boş mu, uzunluk, aralık). Veritabanına bakan kontroller (kayıt var mı) servis katmanındadır.

## Liste endpoint'leri
- Sayfalama zorunlu: `page` (1'den başlar) ve `pageSize` (varsayılan 20, üst sınır 100).
- Yanıtta toplam kayıt sayısı: projede sayfalı response modeli varsa onu kullan.
- Filtre ve sıralama parametreleri query string'den; sıralama kolonu beyaz listeden.

## Yetkilendirme
- Her controller/endpoint varsayılan olarak `[Authorize]` (veya projedeki global politika). Anonim erişim açıkça `[AllowAnonymous]` ile ve gerekçesiyle.
- Kullanıcının yalnızca kendi verisine erişebildiği durumlarda sahiplik kontrolü servis katmanında yapılır; ID'yi istemciden almak yetmez.

## Diğer
- Her action `CancellationToken cancellationToken` alır ve servise geçirir.
- Action'lar async'tir ve `Task<IActionResult>` / `Task<ActionResult<T>>` (veya minimal API'de `Results<...>`) döner.
- Swagger/OpenAPI kullanılıyorsa dönüş tiplerini `[ProducesResponseType]` ile belirt.

## Kontrol listesi
Zorunlu:
- [ ] Controller'da iş kuralı / veri erişimi yok
- [ ] Entity request/response olarak kullanılmıyor
- [ ] Girdi validasyonu var
- [ ] Yetkilendirme açık (`[Authorize]` veya bilinçli `[AllowAnonymous]`)
- [ ] Liste endpoint'i sayfalı ve üst sınırlı
- [ ] 500 yanıtında iç ayrıntı (stack trace, SQL, ORA mesajı) yok
- [ ] `CancellationToken` servise iletiliyor

Tavsiye:
- [ ] Route ve status kodları tablolara uygun
- [ ] POST 201 + Location döndürüyor
- [ ] `[ProducesResponseType]` tanımlı
