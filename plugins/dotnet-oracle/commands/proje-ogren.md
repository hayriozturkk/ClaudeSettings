---
description: Projeyi bir kez tarar ve kalıcı proje haritasını (.claude/proje/) oluşturur; sonraki task'larda proje baştan keşfedilmez.
---

# /proje-ogren — proje hafızasını oluştur

1. `.claude/proje/INDEX.md` zaten varsa kullanıcıya sor: "Harita zaten var. Sıfırdan mı oluşturulsun, yoksa /proje-guncelle mi yeterli?"
   Güncelleme yeterliyse `/proje-guncelle` adımlarını uygula ve dur.
2. `proje-kesif` agent'ını (dotnet-oracle:proje-kesif) `mod: tam` ile çağır.
3. Projenin kökündeki `CLAUDE.md` dosyasını kontrol et:
   - Dosya yoksa oluştur. İçine "Proje hafızası" bölümünü ve `@.claude/proje/INDEX.md` satırını ekle.
     Böylece harita her oturumda ve her agent'ta otomatik yüklenir.
   - Dosya varsa ve `@.claude/proje/INDEX.md` satırı yoksa, mevcut içeriğe dokunmadan sonuna şu bölümü ekle:
     ```markdown
     ## Proje hafızası
     Projeyi baştan keşfetmeden önce aşağıdaki haritaya bak; detay gerektiğinde `.claude/proje/` altındaki ilgili dosyayı aç.

     @.claude/proje/INDEX.md
     ```
4. `.gitignore` içinde `.claude/gorevler/` yoksa kullanıcıya sor: "Görev klasörleri (analiz, kararlar, raporlar) repoya girmesin mi?"
   Evet derse `.gitignore`'a ekle. `.claude/proje/` klasörü ise **repoya girmeli** (ekipteki herkes aynı haritayı kullanır); onu ignore etme.
5. Kullanıcıya kısa özet ver: oluşan dosyalar, INDEX.md satır sayısı ve haritayı commit etmesi gerektiği.
