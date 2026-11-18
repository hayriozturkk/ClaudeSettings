#!/usr/bin/env node
// Görev paneli için örnek görev oluşturur; gerçek bir /gelistir çalıştırmadan paneli denemek içindir.
//   node ornek-gorev.mjs [proje-dizini]          → .claude/gorevler/TEST-1 ve aktif.json oluşturur
//   node ornek-gorev.mjs adim <0-7> [dizin]      → adim.json'daki adımı değiştirir (elle düzenlemenin kısayolu)
//   node ornek-gorev.mjs sil [proje-dizini]      → örnek görevi ve (TEST-1'i gösteriyorsa) aktif.json'u siler
// Bağımlılık yok; Node 18+ yeterli.

import fs from 'node:fs';
import path from 'node:path';

const ID = 'TEST-1';
const ADIMLAR = ['Hazırlık', 'Analiz', 'Veritabanı', 'Kod', 'Test', 'Review', 'Düzeltme', 'Tamamlandı'];

const [komut, ...arg] = process.argv.slice(2);
const islem = komut === 'sil' || komut === 'adim' ? komut : 'olustur';
const adimNo = islem === 'adim' ? Number(arg.shift()) : null;
const kok = path.resolve((islem === 'olustur' ? komut : arg[0]) ?? process.cwd());
const gorevler = path.join(kok, '.claude', 'gorevler');
const gorev = path.join(gorevler, ID);

const yaz = (dosya, veri) => {
  fs.mkdirSync(path.dirname(dosya), { recursive: true });
  fs.writeFileSync(dosya, JSON.stringify(veri, null, 2) + '\n', 'utf8');
};
const dk = n => new Date(Date.now() - n * 60_000).toISOString();

if (islem === 'sil') {
  fs.rmSync(gorev, { recursive: true, force: true });
  const aktif = path.join(gorevler, 'aktif.json');
  try {
    if (JSON.parse(fs.readFileSync(aktif, 'utf8')).gorev === ID) fs.rmSync(aktif);
  } catch { /* aktif.json yok ya da başka görevi gösteriyor */ }
  console.log(`Silindi: ${gorev}`);
} else if (islem === 'adim') {
  if (!Number.isInteger(adimNo) || adimNo < 0 || adimNo > 7) {
    console.error('Kullanım: node ornek-gorev.mjs adim <0-7> [proje-dizini]');
    process.exit(1);
  }
  yaz(path.join(gorev, 'adim.json'), {
    adim: adimNo, ad: ADIMLAR[adimNo], tur: adimNo === 6 ? 2 : 1,
    bekleyen: adimNo === 1 ? 'kullanici' : null, guncelleme: new Date().toISOString(),
  });
  console.log(`adim.json → ${adimNo} ${ADIMLAR[adimNo]}`);
} else {
  yaz(path.join(gorevler, 'aktif.json'), { gorev: ID, baslik: 'Telefon numarası zorunlu', baslangic: dk(25), durum: 'calisiyor' });
  yaz(path.join(gorev, 'adim.json'), { adim: 3, ad: 'Kod', tur: 1, bekleyen: null, guncelleme: dk(2) });
  yaz(path.join(gorev, 'agentlar.json'), {
    gorev: ID,
    guncelleme: dk(2),
    aktif: [{ agent: 'coder', model: 'opus', effort: 'medium', tur: 1, adim: 'Kod', baslangic: dk(2), durum: 'calisiyor' }],
    calismalar: [
      { agent: 'analyst', model: 'opus', effort: 'high', tur: 1, adim: 'Analiz', baslangic: dk(24), bitis: dk(21), sureMs: 192000, token: 38400, aracKullanimi: 12, durum: 'tamamlandi' },
      { agent: 'db', model: 'sonnet', effort: 'high', tur: 1, adim: 'Veritabanı', baslangic: dk(10), bitis: dk(8), sureMs: 95000, token: null, aracKullanimi: 6, durum: 'tamamlandi' },
      { agent: 'coder', model: 'opus', effort: 'medium', tur: 1, adim: 'Kod', baslangic: dk(2), bitis: null, sureMs: null, token: null, aracKullanimi: null, durum: 'calisiyor' },
    ],
    tokenToplami: { analyst: 38400 },
    toplamToken: 38400,
  });
  console.log(`Örnek görev oluşturuldu: ${gorev}`);
  console.log(`Adımı değiştirmek için adim.json'u düzenle ya da: node ${path.relative(process.cwd(), process.argv[1])} adim 4`);
}
