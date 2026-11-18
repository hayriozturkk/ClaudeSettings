# Bu repo hakkında

Bu repo bir Claude Code plugin marketplace'idir (`.claude-plugin/marketplace.json`). Tek plugin: `plugins/dotnet-oracle`.
İçerik Türkçe yazılır; kod örneklerinde tanımlayıcılar İngilizce.

## Düzenleme kuralları
- Skill'ler `plugins/dotnet-oracle/skills/<ad>/SKILL.md`. Klasör adı = frontmatter `name`. `description` alanı tetikleyici kelimeleri içermeli ve "HER ZAMAN kullan" ile bitmeli.
- Her skill'in sonunda "Kontrol listesi" bulunur: "Zorunlu" (reviewer'da ENGELLEYİCİ) ve "Tavsiye" (ÖNERİ). Yeni bir kural eklerken listeyi de güncelle.
- Bir skill 300 satırı geçmesin; geçerse detayı aynı klasörde ayrı bir `.md` dosyasına taşı ve SKILL.md'den bağlantı ver.
- Agent'lar skill'leri `skills:` alanında `dotnet-oracle:<skill-adi>` olarak listeler. Skill adı değişirse agent'ları da güncelle.
- Agent'lar ve komutlar görev klasörü (`.claude/gorevler/<ID>/`) dosya adlarına bağımlıdır: `task.md`, `analiz.md`, `kararlar.md`, `db-degisiklikleri.md`, `db-talepleri.md`, `degisiklikler.md`, `test-raporu.md`, `review.md`, `ozet.md`, `adim.json`, `agentlar.jsonl`, `agentlar.json` (ve `.claude/gorevler/aktif.json`). Bir adı değiştirirsen tüm agent, komut ve `hooks/durum.mjs` içinde değiştir.
- Bir agent'ın varsayılan `model:` / `effort:` değeri değişirse `commands/ajan-ayarlari.md` içindeki varsayılan listesini ve README'deki tabloyu da güncelle.
- `hooks/durum.mjs` bağımlılıksız kalmalı (yalnızca Node yerleşik modülleri) ve hiçbir hatada akışı durdurmamalı (her zaman exit 0, stdout'a yazmaz).
- Her yayında `plugins/dotnet-oracle/.claude-plugin/plugin.json` ve `.claude-plugin/marketplace.json` içindeki `version` birlikte artırılır.
- Başka projelerden yalnızca **fikir** alınır; metin, bölüm yapısı ve örnekler kopyalanmaz, çevrilmez veya yakın biçimde yeniden yazılmaz.
  İçerik, kaynağa bakmadan, bu reponun yapısıyla (`/gelistir` adımları, görev klasörü dosyaları) ve C#/.NET + Oracle örnekleriyle sıfırdan yazılır.
