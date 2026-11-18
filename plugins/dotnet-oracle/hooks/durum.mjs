#!/usr/bin/env node
// dotnet-oracle durum kaydı.
// Claude Code, bir agent çağrısından önce (basladi) ve sonra (bitti) bu script'i çalıştırır.
// Görev klasörüne iki dosya yazar:
//   agentlar.jsonl  → her olay için bir satır (ham kayıt)
//   agentlar.json   → özet: şu an çalışan agent'lar, tamamlanan çalışmalar, toplam token
// Script hiçbir koşulda akışı durdurmaz: hata olursa sessizce çıkar (exit 0) ve stdout'a yazmaz.
// Bağımlılık yok; Node 18+ yeterli.

import fs from 'node:fs';
import path from 'node:path';

const PLUGIN_ONEKI = 'dotnet-oracle:';
const olay = process.argv[2] === 'bitti' ? 'bitti' : 'basladi';

let ham = '';
try {
  for await (const parca of process.stdin) ham += parca;
  calis(JSON.parse(ham || '{}'));
} catch {
  // Durum kaydı yardımcı bir özelliktir; hata akışı etkilememeli.
}
process.exit(0);

function calis(girdi) {
  const toolInput = girdi.tool_input ?? {};
  const tur = String(toolInput.subagent_type ?? '');
  if (!tur.startsWith(PLUGIN_ONEKI)) return;
  const agent = tur.slice(PLUGIN_ONEKI.length);

  const cwd = girdi.cwd || process.cwd();
  const gorevlerDizini = path.join(cwd, '.claude', 'gorevler');
  const gorevId = gorevIdBul(String(toolInput.prompt ?? ''), gorevlerDizini);
  if (!gorevId) return;

  const gorevDizini = path.join(gorevlerDizini, gorevId);
  if (!fs.existsSync(gorevDizini)) return;

  const varsayilan = varsayilanAyar(agent);
  const adim = jsonOku(path.join(gorevDizini, 'adim.json')) ?? {};

  const kayit = {
    zaman: new Date().toISOString(),
    olay,
    agent,
    model: toolInput.model || varsayilan.model || null,
    effort: toolInput.effort || varsayilan.effort || null,
    tur: Number.isFinite(adim.tur) ? adim.tur : null,
    adim: adim.ad ?? null,
    toolUseId: girdi.tool_use_id ?? null,
  };

  if (olay === 'bitti') {
    const yanit = girdi.tool_response;
    kayit.token = tokenHesapla(yanit);
    kayit.sureMs = sayiVeyaNull(yanit?.totalDurationMs);
    kayit.aracKullanimi = sayiVeyaNull(yanit?.totalToolUseCount);
  }

  const logYolu = path.join(gorevDizini, 'agentlar.jsonl');
  fs.appendFileSync(logYolu, JSON.stringify(kayit) + '\n', 'utf8');
  ozetYaz(gorevDizini, gorevId, logYolu);
}

// Görev ID'si agent'a verilen prompt'taki ".claude/gorevler/<ID>" yolundan alınır;
// bulunamazsa /gelistir'in yazdığı aktif.json'a bakılır.
function gorevIdBul(prompt, gorevlerDizini) {
  const eslesme = prompt.match(/\.claude[\\/]gorevler[\\/]([^\\/\s`'"<>|]+)/);
  if (eslesme) return eslesme[1];
  return jsonOku(path.join(gorevlerDizini, 'aktif.json'))?.gorev ?? null;
}

// Çağrıda model/effort verilmediyse geçerli olan, agent dosyasındaki varsayılandır.
function varsayilanAyar(agent) {
  const kok = process.env.CLAUDE_PLUGIN_ROOT;
  if (!kok) return {};
  try {
    const metin = fs.readFileSync(path.join(kok, 'agents', `${agent}.md`), 'utf8');
    const ust = metin.split(/\r?\n---\r?\n/)[0];
    return {
      model: ust.match(/^model:\s*(\S+)/m)?.[1],
      effort: ust.match(/^effort:\s*(\S+)/m)?.[1],
    };
  } catch {
    return {};
  }
}

function tokenHesapla(yanit) {
  if (!yanit || typeof yanit !== 'object') return null;
  if (typeof yanit.totalTokens === 'number') return yanit.totalTokens;
  const u = yanit.usage;
  if (u && typeof u === 'object') {
    const toplam = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']
      .reduce((t, k) => t + (Number(u[k]) || 0), 0);
    return toplam || null;
  }
  return null;
}

// Ham kayıtlardan özet çıkarır: başlayan her çağrı, bitişiyle eşleştirilir.
function ozetYaz(gorevDizini, gorevId, logYolu) {
  const satirlar = fs.readFileSync(logYolu, 'utf8').split('\n').filter(Boolean);
  const calismalar = [];

  for (const satir of satirlar) {
    let k;
    try { k = JSON.parse(satir); } catch { continue; }

    if (k.olay === 'basladi') {
      calismalar.push({
        agent: k.agent, model: k.model, effort: k.effort, tur: k.tur, adim: k.adim,
        baslangic: k.zaman, bitis: null, sureMs: null, token: null, aracKullanimi: null,
        durum: 'calisiyor', toolUseId: k.toolUseId,
      });
      continue;
    }

    const acik = calismalar.filter(c => c.durum === 'calisiyor' && c.agent === k.agent);
    const eslesen = (k.toolUseId && acik.find(c => c.toolUseId === k.toolUseId)) || acik.at(-1);
    if (!eslesen) continue;
    eslesen.bitis = k.zaman;
    eslesen.sureMs = k.sureMs ?? (Date.parse(k.zaman) - Date.parse(eslesen.baslangic));
    eslesen.token = k.token;
    eslesen.aracKullanimi = k.aracKullanimi;
    eslesen.durum = 'tamamlandi';
  }

  const tokenToplami = {};
  for (const c of calismalar) {
    if (typeof c.token === 'number') tokenToplami[c.agent] = (tokenToplami[c.agent] ?? 0) + c.token;
  }

  const ozet = {
    gorev: gorevId,
    guncelleme: new Date().toISOString(),
    aktif: calismalar.filter(c => c.durum === 'calisiyor').map(({ toolUseId, ...c }) => c),
    calismalar: calismalar.map(({ toolUseId, ...c }) => c),
    tokenToplami,
    toplamToken: Object.values(tokenToplami).reduce((a, b) => a + b, 0),
  };

  // Okuyan bir panel yarım dosya görmesin diye önce geçici dosyaya yazılır, sonra yer değiştirilir.
  const hedef = path.join(gorevDizini, 'agentlar.json');
  const gecici = `${hedef}.${process.pid}.tmp`;
  fs.writeFileSync(gecici, JSON.stringify(ozet, null, 2), 'utf8');
  fs.renameSync(gecici, hedef);
}

function jsonOku(yol) {
  try { return JSON.parse(fs.readFileSync(yol, 'utf8')); } catch { return null; }
}

function sayiVeyaNull(d) {
  return typeof d === 'number' && Number.isFinite(d) ? d : null;
}
