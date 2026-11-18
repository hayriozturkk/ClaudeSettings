---
description: Aktif (veya belirtilen) görevin hangi adımda olduğunu, hangi agent'ın çalıştığını ve agent başına token kullanımını gösterir.
argument-hint: "[GÖREV-ID]"
---

# /durum — görev durumu

Argüman: `$ARGUMENTS`

Yalnızca dosya oku; agent çağırma, kod okuma. Kısa tut.

1. Görev ID'si argümanda verilmişse onu kullan; yoksa `.claude/gorevler/aktif.json` içindeki `gorev` değerini al.
   İkisi de yoksa "Aktif görev yok" de ve `.claude/gorevler/` altındaki son 5 görev klasörünü listele.
2. Görev klasöründen şunları oku (olmayanı atla):
   - `adim.json` → şu anki adım, tur, kullanıcı bekleniyor mu
   - `agentlar.json` → çalışan agent'lar (`aktif`), tamamlanan çalışmalar (`calismalar`), `tokenToplami`, `toplamToken`
3. Şu biçimde göster:

```
Görev: <ID> — <aktif.json'daki başlık>
Adım:  <adim>/7 <ad>   Tur: <tur>   <bekleyen kullanici ise: "⏳ Senin cevabın bekleniyor">

Şu an çalışan: <agent> (<model>/<effort>) — <başlangıçtan bu yana geçen süre>   | yoksa: "Çalışan agent yok"

| Agent | Model/Effort | Tur | Süre | Token |
|---|---|---|---|---|
<calismalar listesindeki her satır; süreyi dakika:saniye, token'ı binlik ayraçla>

Toplam token: <toplamToken>
```

4. `agentlar.json` yoksa veya token alanları boşsa tek satırla belirt: "Agent kayıtları yok — hook çalışmıyor olabilir (Node.js kurulu mu?)".
