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
│   │   ├── proje-guncelle.md            ← /proje-guncelle: hafızayı güncelle
│   │   ├── ajan-ayarlari.md             ← /ajan-ayarlari: agent modellerini kendin seç
│   │   └── durum.md                     ← /durum: görev hangi adımda, hangi agent çalışıyor
│   ├── hooks/
│   │   ├── hooks.json                   ← agent başlayınca/bitince durum kaydı + görev panelini yükler
│   │   └── durum.mjs                    ← kaydı yazan script (Node.js, model token'ı harcamaz)
│   ├── panel/
│   │   ├── panel.tsx                    ← görev paneli: sohbetin yanında canlı durum ve model seçimi
│   │   ├── panel.test.tsx               ← panel testleri (claude plugin test)
│   │   └── ornek-gorev.mjs              ← paneli denemek için örnek görev oluşturur
│   ├── types/index.d.ts                 ← panelin tuttuğu değerlerin tipleri
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
    ├── proje-CLAUDE.md                  ← proje repolarına konacak CLAUDE.md örneği
    └── dotnet-oracle-ayarlar.ornek.json ← kişisel model ayarı örneği
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
├── ozet.md
├── adim.json        ← şu anki adım ve tur (/gelistir yazar)
├── agentlar.jsonl   ← agent başlama/bitiş kayıtları (hook yazar)
└── agentlar.json    ← özet: çalışan agent, model, süre, token (hook yazar)

<proje>/.claude/gorevler/aktif.json   ← şu an yürüyen görev
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

## Agent modelleri: varsayılan repoda, seçim sende

Her agent'ın ekip varsayılanı, agent dosyasının başındaki `model:` ve `effort:` satırlarındadır.
`model` agent'ın ne kadar güçlü olduğunu, `effort` (`low`, `medium`, `high`, `xhigh`, `max`) aynı modelin ne kadar uzun ve dikkatli düşüneceğini belirler.

| Agent | model | effort | Neden |
|---|---|---|---|
| analyst | opus | high | Kararlar ve sorular bütün akışı belirliyor |
| reviewer | opus | high | Son kalite kapısı |
| coder | opus | medium | Çok katmanlı değişikliklerde ve uzun standartlara uymada güçlü; en çok token burada harcanır |
| db | sonnet | high | Az kod üretir ama veri riski yüksek |
| tester | sonnet | medium | Orta zorlukta iş |
| proje-kesif | sonnet | medium | Seyrek çalışır |

Repoyu indiren herkes, hiçbir dosyayı değiştirmeden kendi seçimini yapabilir:
```
/ajan-ayarlari                      ← geçerli ayarları gösterir
/ajan-ayarlari coder sonnet         ← senin makinende coder sonnet ile çalışır
/ajan-ayarlari reviewer effort max
/ajan-ayarlari coder sonnet --proje ← yalnızca bu projede
/ajan-ayarlari sifirla coder        ← ekip varsayılanına dön
```
Ayarlar `~/.claude/dotnet-oracle-ayarlar.json` (kullanıcı) ve `<proje>/.claude/dotnet-oracle-ayarlar.local.json` (proje, repoya girmez) dosyalarına yazılır;
dosyaları elle de düzenleyebilirsin (örnek: `sablonlar/dotnet-oracle-ayarlar.ornek.json`). `/gelistir` her agent'ı çağırmadan önce bu dosyalara baktığı için
akış sürerken yapılan değişiklik bir sonraki agent çağrısında geçerli olur. Ekibin varsayılanını değiştirmek için agent dosyasını repoda değiştir.

Ayarı değerlendirmek için birkaç görevden sonra `/durum` ile agent başına token'a ve `review.md`'lerdeki tur sayılarına bakın:
görevler çoğunlukla 1. turda ONAY alıyorsa coder `sonnet`'e düşürülebilir; sık sık 3. tura gidiliyorsa coder'ın `effort`'u yükseltilebilir.

## Durum takibi: `/durum`

`/durum` aktif görevin hangi adımda olduğunu, şu an hangi agent'ın hangi modelle çalıştığını ve her agent'ın harcadığı token'ı gösterir.
Bilgiler görev klasöründeki `adim.json` ve `agentlar.json` dosyalarından okunur; aynı bilgileri sohbetin yanında canlı gösteren **görev paneli** aşağıda.
Agent kayıtlarını plugin'in hook'u tutar ve model token'ı harcamaz.

## Görev paneli

Sohbetin yanında duran, kendiliğinden güncellenen bir panel. Plugin'in parçasıdır; ayrıca bir şey kurmaya gerek yoktur.
Dosyaları doğrudan okur ve yazar, Claude'a mesaj göndermez: **model token'ı harcamaz**.

**Açmak:** `.claude/gorevler/` klasörü olan bir projede oturum açılınca kendiliğinden açılır. Kapattıysan ya da klasör henüz yoksa:
```
/gorev-paneli
```
Panel Claude Code'un temasını (açık/koyu) kullanır. Dosyaları saniyede bir yoklar; dosya yoksa, JSON bozuksa ya da yarım yazılmışsa son geçerli durumu göstermeye devam eder.

**Durum sekmesi**
- Görev ID'si, başlığı ve durum rozeti (Çalışıyor / Tamamlandı / Durduruldu)
- 8 adımlık liste: biten adım ✓, şu anki adım vurgulu; kararların beklendiği adımda "Senin cevabın bekleniyor" uyarısı
- "Şu an çalışan" kartı: agent, model/effort, tur ve canlı sayan süre
- Agent başına tablo (agent, model/effort, tur, süre, token) ve toplam token. Claude Code token bilgisini vermediyse "—" görünür.
- Aktif görev yoksa: "Aktif görev yok" ve `.claude/gorevler` altındaki son 5 görev

**Modeller sekmesi**
- Her agent için model (haiku / sonnet / opus) ve effort seçimi; yanında ayarın kaynağı: `varsayılan`, `kullanıcı` ya da `proje`
- **Benim için** → `~/.claude/dotnet-oracle-ayarlar.json`, **Bu proje** → `<proje>/.claude/dotnet-oracle-ayarlar.local.json` (öncelikli). Yazılacak dosyanın yolu altında görünür.
- **Ekip varsayılanlarına dön**: seçili dosyadaki agent kayıtlarını siler; dosyadaki diğer alanlara dokunmaz.
- "Bu proje" ile ilk yazışta `.claude/dotnet-oracle-ayarlar.local.json` satırı yoksa projenin `.gitignore`'una eklenir.
- Bozuk bir ayar dosyasının üzerine yazılmaz; panel uyarı gösterir. `/ajan-ayarlari` ile aynı dosyaları kullanır.

**Gerçek görev olmadan denemek.** Projenin kök dizininde (plugin yolu, `/plugin` listesindeki kurulum klasörüdür; repo klonunda `plugins/dotnet-oracle`):
```bash
node <plugin-yolu>/panel/ornek-gorev.mjs            # .claude/gorevler/TEST-1 + aktif.json oluşturur
node <plugin-yolu>/panel/ornek-gorev.mjs adim 1     # adımı değiştirir (adim.json'u elle de düzenleyebilirsin)
node <plugin-yolu>/panel/ornek-gorev.mjs sil        # örnek görevi siler
```
Ardından `/gorev-paneli`. `adim.json`'u değiştirdiğinde panel bir saniye içinde güncellenir.

**Gereksinim.** Panel, Claude Code'un mod (function hooks) desteğini kullanır: terminalde ve masaüstü uygulamasının Code sekmesinde çalışır.
Bu destek erken erişimdedir ve Claude Code'un güncel bir sürümünü gerektirir (2.1.325 ile denendi).

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
- Agent kayıtları (`agentlar.json`, `/durum`'daki model/süre/token bilgisi) için makinede **Node.js 18+** gerekir. Node yoksa akış ve model seçimi yine çalışır, yalnızca agent kayıtları tutulmaz.
