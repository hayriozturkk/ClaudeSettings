# ClaudeSettings

C#/.NET + Oracle projelerinde Claude Code'un **herkes için aynı standartta** kod üretmesi için ortak ayarlar:
geliştirme akışı, agent'lar, proje hafızası ve yazım standartları (skill'ler).

Bu repo bir **Claude Code plugin marketplace**'idir. Bir kez kurulur; repoda yapılan her güncelleme kullanan herkese otomatik dağılır.

---

## Ne var?

```
ClaudeSettings/
├── .claude-plugin/marketplace.json      ← katalog
├── plugins/dotnet-oracle/
│   ├── commands/
│   │   ├── gelistir.md                  ← /gelistir: uçtan uca geliştirme akışı
│   │   ├── proje-ogren.md               ← /proje-ogren: projeyi bir kez öğren
│   │   └── proje-guncelle.md            ← /proje-guncelle: hafızayı güncelle
│   ├── agents/
│   │   ├── analyst.md                   ← task'ı yorumlar, karar sorularını çıkarır
│   │   ├── db.md                        ← Oracle: DDL, trigger, PL/SQL
│   │   ├── coder.md                     ← C#/.NET kodu
│   │   ├── tester.md                    ← xUnit testleri + manuel test planı
│   │   ├── reviewer.md                  ← standartlara göre review
│   │   └── proje-kesif.md               ← proje haritasını çıkarır/günceller
│   └── skills/
│       ├── calisma-ilkeleri/            ← tüm agent'lar: düşün, en küçük tam değişiklik, kanıtla bitir
│       ├── hata-ayiklama/               ← önce kök neden, sonra düzeltme
│       ├── csharp-kod-standardi/
│       ├── dotnet-veri-erisimi/         ← EF Core / Dapper / ADO.NET + Oracle
│       ├── dotnet-api/
│       ├── dotnet-hata-ve-loglama/
│       ├── dotnet-test/
│       ├── oracle-trigger/
│       ├── oracle-ddl-script/
│       └── oracle-plsql/
└── sablonlar/
    ├── proje-settings.json              ← proje repolarına konacak .claude/settings.json
    └── proje-CLAUDE.md                  ← proje repolarına konacak CLAUDE.md örneği
```

## Akış: `/gelistir`

```
/gelistir ABC-123: <task içeriği>
   │
   ▼
1. analyst ──► task'ı yorumlar, karar sorularını hazırlar
   ▼
   SEN cevaplarsın ──► kararlar.md
   ▼
2. db (DB işi varsa) ──► DDL / trigger / PL/SQL script'leri + rollback
   ▼
3. coder ──► kararlara ve skill'lere göre C# kodu, dotnet build
   │         (yeni DB ihtiyacı çıkarsa → db → coder)
   ▼
4. tester ──► kabul kriterlerine göre xUnit testleri, dotnet test, manuel test planı
   ▼
5. reviewer ──► standartlara göre review: ONAY / DÜZELTME GEREKLİ
   │
   ├─ DÜZELTME ──► coder (ve/veya db) → tester → reviewer   (en fazla 3 tur)
   │               coder her bulguyu doğrular, yanlış bulguya gerekçeyle itiraz eder;
   │               anlaşmazlık olursa karar sana sorulur
   └─ ONAY ──► ozet.md: değişiklikler, script çalıştırma sırası, commit mesajı önerisi
```

Agent'lar birbirinin konuşmasını görmez; ortak hafızaları görev klasörüdür:

```
<proje>/.claude/gorevler/ABC-123/
├── task.md  analiz.md  kararlar.md
├── db-degisiklikleri.md  degisiklikler.md
├── test-raporu.md  review.md
└── ozet.md
```

Claude commit, push yapmaz ve veritabanında script çalıştırmaz; bunlar sende kalır.

## Proje hafızası: `/proje-ogren`

Her task'ta projeyi baştan keşfedip token harcamamak için proje **bir kez** öğrenilir:

```
<proje>/.claude/proje/
├── INDEX.md        ← her oturumda otomatik yüklenir (kısa tutulur)
├── mimari.md  veri-erisimi.md  veritabani.md  api.md
└── _meta.md        ← son taranan commit
```

- `/proje-ogren` haritayı oluşturur ve projenin `CLAUDE.md`'sine `@.claude/proje/INDEX.md` satırını ekler. Böylece harita her oturumda ve her agent'ta hazır olur.
- `/proje-guncelle` yalnızca son taramadan bu yana değişen kısımları günceller.
- `.claude/proje/` repoya commit edilir; ekipte herkes aynı haritayı kullanır.

---

## Kurulum

### A) Kendi makinende (tek seferlik)
Claude Code içinde:
```
/plugin marketplace add hayriozturkk/ClaudeSettings
/plugin install dotnet-oracle@claude-settings
```
Repo private ise git kimlik bilgilerin (veya `GITHUB_TOKEN` ortam değişkeni) yeterlidir.

### B) Bir proje reposuna bağlamak (ekip için önerilen)
`sablonlar/proje-settings.json` dosyasını projenin `.claude/settings.json` dosyasına kopyala (dosya varsa içeriği birleştir) ve commit et.
Repoyu açan herkese Claude Code, klasöre güvendikten (trust) sonra marketplace'i ve plugin'i kurmayı önerir.

### C) Projede ilk kullanım
```
/proje-ogren
```
Oluşan `.claude/proje/` klasörünü ve `CLAUDE.md` değişikliğini commit et. Sonra:
```
/gelistir ABC-123: Siparişler için iptal nedeni zorunlu olsun, iptal edilen siparişlerin geçmişi tutulsun.
```

---

## Standartları güncellemek (günden güne)

1. İlgili `SKILL.md`'yi düzenle. Her skill'in sonundaki **kontrol listesi** reviewer'ın neye ENGELLEYİCİ diyeceğini belirler:
   "Zorunlu" maddeler düzeltme turunu tetikler, "Tavsiye" maddeler tetiklemez.
2. `plugins/dotnet-oracle/.claude-plugin/plugin.json` ve `.claude-plugin/marketplace.json` içindeki `version` alanını artır
   (örn. `0.1.0` → `0.2.0`). Sürüm artmazsa güncelleme kullananlara ulaşmayabilir.
3. Commit + push. `autoUpdate: true` olan makineler güncellemeyi alır; elle almak için: `/plugin marketplace update claude-settings`.

Yeni bir standart eklemek için `plugins/dotnet-oracle/skills/<yeni-skill>/SKILL.md` oluştur ve ilgili agent'ın `skills:` listesine ekle.

### Değişiklikleri yayınlamadan denemek
```bash
claude --plugin-dir ./plugins/dotnet-oracle
```

---

## Notlar
- Skill'ler **başlangıç standardıdır**; ekibin kendi kararlarıyla doldurulması gerekir (özellikle isimlendirme, hata kodu aralıkları, script klasör düzeni).
- Bir projede standarttan farklı, yerleşik bir desen varsa agent'lar projeninkini izler ve sapmayı not eder. Bu farklar proje haritasındaki "Projeye özgü kurallar" bölümünde tutulur.
- Agent modelleri ve dikkat seviyeleri agent dosyalarının başındaki `model:` ve `effort:` alanlarından değiştirilir.
  `model` agent'ın ne kadar güçlü olduğunu, `effort` (`low`, `medium`, `high`, `xhigh`, `max`) aynı modelin ne kadar uzun ve dikkatli düşüneceğini belirler.

  | Agent | model | effort | Neden |
  |---|---|---|---|
  | analyst | opus | high | Kararlar ve sorular bütün akışı belirliyor |
  | reviewer | opus | high | Son kalite kapısı |
  | coder | opus | medium | Çok katmanlı değişikliklerde ve uzun standartlara uymada güçlü; en çok token burada harcanır |
  | db | sonnet | high | Az kod üretir ama veri riski yüksek |
  | tester | sonnet | medium | Orta zorlukta iş |
  | proje-kesif | sonnet | medium | Seyrek çalışır |

  Ayarı değerlendirmek için birkaç görevden sonra `review.md` dosyalarındaki tur sayılarına bakın: görevler çoğunlukla 1. turda ONAY alıyorsa
  coder `sonnet`'e düşürülebilir; sık sık 3. tura gidiliyorsa coder'ın `effort`'u yükseltilebilir.
