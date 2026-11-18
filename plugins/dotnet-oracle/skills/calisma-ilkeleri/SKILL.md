---
name: calisma-ilkeleri
description: Tüm agent'ların ortak çalışma ilkeleri — kodlamadan önce düşünmek, en küçük tam değişiklik, yalnızca gerekeni değiştirmek (cerrahi değişiklik), asla kesilmeyecek güvenlik/validasyon kuralları ve kanıt olmadan "bitti" dememek. Kod yazarken, düzeltirken, analiz veya review yaparken HER ZAMAN kullan.
---

# Çalışma ilkeleri

> Kaynak: Andrej Karpathy'nin LLM kodlama hatalarına dair gözlemlerinden derlenen ilkeler (andrej-karpathy-skills),
> Ponytail'in "en küçük tam değişiklik" yaklaşımı ve Superpowers'ın "tamamlamadan önce doğrula" kuralı; ekibe uyarlanmıştır.
> Lisanslar: depo kökündeki `KAYNAKLAR.md`.
>
> Bu ilkeler diğer standart skill'lerin **üstünde değil, yanında** çalışır: "sade yaz" ilkesi, standartlardaki zorunlu kuralları
> (validasyon, transaction, loglama, yetki) kesmek için gerekçe olamaz.

## 1. Kodlamadan önce düşün
Varsayma, kafa karışıklığını gizleme, alternatifleri görünür kıl.
- Varsayımlarını açıkça yaz. Emin değilsen sor (agent isen ana oturuma soruyu dön).
- Task'ın birden fazla yorumu varsa sessizce birini seçme; yorumları listele.
- Daha basit bir yol varsa söyle; gerektiğinde isteğe itiraz et.
- Bir şey anlaşılmıyorsa dur, neyin anlaşılmadığını adlandır.

## 2. En küçük tam değişiklik
İşi **eksiksiz** çöz, ama en az yeni kodla. Kod yazmadan önce sırayla sor ve işe yarayan ilk basamakta dur:
1. **Gerçekten gerekli mi?** İstenmeyen özelliği, seçeneği, esnekliği ekleme; atladığını tek satırla belirt.
2. **Projede zaten var mı?** Mevcut helper, servis, extension, base class, ortak repository metodu varsa onu, çevresindeki kodun kullandığı şekilde kullan.
3. **.NET'te veya Oracle'da hazır var mı?** BCL, ASP.NET Core özellikleri, LINQ, Oracle yerleşik fonksiyonları. Proje kendi sarmalayıcısını kullanıyorsa onu tercih et.
4. **Kurulu bir NuGet paketi yapıyor mu?** Kullan. Birkaç satır iş için yeni paket ekleme.
5. **Bir okuyucunun bir bakışta anlayacağı tek satır mı?** Tek satır.
6. Hiçbiri değilse: çalışan en az kod.

Kurallar:
- Tek kullanımlık koda soyutlama (interface, base class, generic, factory) açma. **İstisna:** projenin mimarisi bunu gerektiriyorsa (örn. her servisin bir interface'i ve DI kaydı varsa) projenin yapısına uy.
- Talep edilmemiş konfigürasyon, "ileride lazım olur" kodu, olanaksız senaryolar için hata yönetimi yazma.
- 200 satır yazdıysan ve 50 satır olabiliyorsa yeniden yaz. Kendine sor: "Kıdemli bir geliştirici buna aşırı karmaşık der mi?"
- **Çözümde tembel ol, işi bitirmekte değil:** değişikliğin bozduğu çağıranları, testleri, DI kayıtlarını, mapping'leri de güncelle.
- Bilinçli bir kısayol yaptıysan sınırını koda yaz:
  `// kisayol: <sınır>, <ne zaman yükseltilmeli>` — örn. `// kisayol: tüm liste belleğe alınıyor, 10.000 kaydı geçerse sayfalamaya geç`
  Reviewer bu yorumu taşıyan kısayolu bulgu değil, karar olarak değerlendirir.

**Asla kesilmeyenler** (sadelik bunlar için gerekçe olamaz):
- Güven sınırındaki girdi validasyonu (API girdisi, dosya, dış sistem)
- Veri kaybını veya tutarsızlığını önleyen hata yönetimi ve transaction
- Güvenlik: parametreli SQL, yetki kontrolü, hassas verinin loglanmaması
- Kullanıcının açıkça istediği her şey
- Standart skill'lerdeki "Zorunlu" kontrol listesi maddeleri

## 3. Cerrahi değişiklik
Yalnızca gerekene dokun; yalnızca kendi dağınıklığını topla.
- Yanındaki kodu, yorumları, formatı "iyileştirme". Bozuk olmayanı refactor etme.
- Kendi tarzın farklı olsa bile mevcut tarza uy.
- İlgisiz ölü kod veya sorun görürsen **silme, not et** (`degisiklikler.md` → notlar).
- Kendi değişikliğinin kullanılmaz bıraktığı `using`, değişken, metot ve dosyaları temizle; önceden var olan ölü kodu temizleme.
- Test: Değişen her satır doğrudan task'a veya bir karara bağlanabilmeli.
- Hata düzeltirken önce düzelttiğin fonksiyonun **tüm çağıranlarını** bul; kök nedeni ortak kodda bir kez düzelt, tek bir çağıranda yama yapma.
- Taşıdığın veya birleştirdiğin kod, hata yönetimini ve validasyonunu korur.

## 4. Hedefe göre çalış, kanıtla bitir
Task'ı doğrulanabilir hedeflere çevir:
- "Validasyon ekle" → "Geçersiz girdiler için test yaz, sonra geçir"
- "Hatayı düzelt" → "Hatayı tekrar üreten test yaz, sonra geçir"
- "Refactor et" → "Testler öncesinde ve sonrasında geçiyor"

Çok adımlı işte kısa bir plan yaz:
```
1. <adım> → doğrulama: <kontrol>
2. <adım> → doğrulama: <kontrol>
```

**Kanıt olmadan "bitti" deme.** Bir durumu iddia etmeden önce:
1. İddiayı kanıtlayacak komutu belirle.
2. Komutu şimdi, eksiksiz çalıştır.
3. Çıktının tamamını oku: çıkış kodu, hata ve uyarı sayısı.
4. Çıktı iddiayı doğruluyorsa iddiayı kanıtıyla birlikte yaz; doğrulamıyorsa gerçek durumu yaz.

| İddia | Gereken kanıt | Yetmeyen |
|---|---|---|
| Derleniyor | `dotnet build` çıkış kodu 0 | "Kod doğru görünüyor" |
| Testler geçiyor | `dotnet test` çıktısı: 0 başarısız | Önceki çalıştırma, "geçmesi lazım" |
| Hata düzeldi | Hatayı üreten test artık geçiyor | Kod değişti, düzelmiş olmalı |
| Kabul kriterleri karşılandı | Kriterlerin tek tek kontrol listesi | "Testler geçiyor" |
| Agent işi yaptı | `git status` / `git diff` gerçek değişikliği gösteriyor | Agent'ın "başarılı" raporu |

"Muhtemelen", "olmalı", "görünüyor" gibi ifadeler doğrulama yapılmadığının işaretidir: dur ve doğrula.

## Kontrol listesi
Zorunlu:
- [ ] "Asla kesilmeyenler" listesinden hiçbir şey sadelik gerekçesiyle çıkarılmamış
- [ ] Değişen her satır task'a veya bir karara bağlanabiliyor; ilgisiz refactor yok
- [ ] Bir hata düzeltmesi tüm çağıranlarda geçerli (kök neden ortak kodda düzeltilmiş)
- [ ] "Derleniyor / testler geçiyor / düzeldi" iddiaları komut çıktısıyla kanıtlı

Tavsiye:
- [ ] İstenmeyen özellik, seçenek veya tek kullanımlık soyutlama yok
- [ ] Projede veya .NET'te hazır olan şey yeniden yazılmamış
- [ ] Bilinçli kısayollar `// kisayol:` yorumuyla işaretli
- [ ] Varsayımlar yazılı
