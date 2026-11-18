---
description: Proje haritasını yalnızca son taramadan bu yana değişen kısımlar için günceller; projeyi baştan taramaz.
---

# /proje-guncelle — proje hafızasını güncelle

1. `.claude/proje/_meta.md` yoksa harita hiç oluşturulmamıştır: kullanıcıya `/proje-ogren` öner ve dur.
2. `_meta.md`'deki commit'ten bu yana değişiklik var mı bak: `git log --oneline <commit>..HEAD` ve `git status --short`.
   Hiç değişiklik yoksa "Harita güncel" de ve dur.
3. `proje-kesif` agent'ını (dotnet-oracle:proje-kesif) `mod: guncelle` ile çağır.
   Commit edilmemiş değişiklik varsa agent'a bunları da `git diff HEAD` ile hesaba katmasını söyle.
4. Kullanıcıya yalnızca hangi harita dosyalarının değiştiğini ve haritayı commit etmesi gerektiğini söyle.
