// dotnet-oracle görev paneli: /gelistir'in görev klasörünü ve model ayar dosyalarını
// doğrudan okur/yazar. Claude'a mesaj göndermez, model token'ı harcamaz.
import { atom, read, update } from 'claude-code'
import type { EngineInterface as Dolar, Register } from 'claude-code'

import type { Adim, Agentlar, Aktif, Ayar, AyarDosyasi, Calisma, PanelVeri, SonGorev } from '../types'

const PANEL = 'gorev-paneli'
const BASLIK = 'Görev paneli'
const YOKLAMA_MS = 1000
const GITIGNORE_SATIRI = '.claude/dotnet-oracle-ayarlar.local.json'

const AGENTLAR = ['analyst', 'db', 'coder', 'tester', 'reviewer', 'proje-kesif'] as const
const MODELLER = ['haiku', 'sonnet', 'opus']
const EFFORTLAR = ['low', 'medium', 'high', 'xhigh', 'max']
// Agent dosyası okunamazsa (plugin dışında geliştirirken) kullanılan ekip varsayılanları.
const EKIP_VARSAYILANI: Record<string, Required<Ayar>> = {
  analyst: { model: 'opus', effort: 'high' },
  db: { model: 'sonnet', effort: 'high' },
  coder: { model: 'opus', effort: 'medium' },
  tester: { model: 'sonnet', effort: 'medium' },
  reviewer: { model: 'opus', effort: 'high' },
  'proje-kesif': { model: 'sonnet', effort: 'medium' },
}
const ADIMLAR = ['Hazırlık', 'Analiz ve kararlar', 'Veritabanı', 'Kod', 'Test', 'Review', 'Düzeltme', 'Tamamlandı']
const DURUM_ETIKETI: Record<'calisiyor' | 'tamamlandi' | 'durduruldu', { metin: string; renk: 'claude' | 'success' | 'warning' }> = {
  calisiyor: { metin: 'Çalışıyor', renk: 'claude' },
  tamamlandi: { metin: 'Tamamlandı', renk: 'success' },
  durduruldu: { metin: 'Durduruldu', renk: 'warning' },
}

const BOS: PanelVeri = {
  aktif: null, adim: null, agentlar: null, sonGorevler: [],
  ayarKullanici: null, ayarProje: null, varsayilan: EKIP_VARSAYILANI,
  yolKullanici: '', yolProje: '',
}
const veri = atom({ plugin: 'dotnet-oracle', key: 'veri' } as const, BOS, { shape: 'veri-1' })
const simdi = atom({ plugin: 'dotnet-oracle', key: 'simdi' } as const, 0)
const sekme = atom({ plugin: 'dotnet-oracle', key: 'sekme' } as const, 'durum' as 'durum' | 'modeller')
const kapsam = atom({ plugin: 'dotnet-oracle', key: 'kapsam' } as const, 'kullanici' as 'kullanici' | 'proje')

// Modül değişkenleri: yeniden yüklemede sıfırlanır, session.start yeniden kurar.
let zamanlayici: { cancel: () => void } | undefined
let kok = ''
let ev = ''
const sonMetin = new Map<string, string | null>()

function yol(...p: string[]) {
  return p.join('/')
}

// Bozuk ya da yarım yazılmış JSON'da undefined döner: çağıran son geçerli değeri korur.
export function jsonCoz<T>(metin: string): T | undefined {
  try {
    const v = JSON.parse(metin)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : undefined
  } catch {
    return undefined
  }
}

export function binlik(n: number | null | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—'
}

export function sure(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '—'
  const sn = Math.floor(ms / 1000)
  return `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}`
}

// Proje > kullanıcı > ekip varsayılanı, alan alan.
export function gecerliAyar(v: PanelVeri, agent: string) {
  const p = v.ayarProje?.agentlar?.[agent] ?? {}
  const k = v.ayarKullanici?.agentlar?.[agent] ?? {}
  const d = v.varsayilan[agent] ?? EKIP_VARSAYILANI[agent] ?? { model: '', effort: '' }
  const kaynak = p.model || p.effort ? 'proje' : k.model || k.effort ? 'kullanıcı' : 'varsayılan'
  return { model: p.model ?? k.model ?? d.model, effort: p.effort ?? k.effort ?? d.effort, kaynak }
}

async function metinOku($: Dolar, dosya: string): Promise<string | null> {
  return $.fs.read(dosya).then(t => (typeof t === 'string' ? t : null), () => null)
}

// Dosya yoksa null; değişmediyse ya da bozuksa undefined (son geçerli değer korunur).
async function oku<T>($: Dolar, dosya: string): Promise<T | null | undefined> {
  const metin = await metinOku($, dosya)
  const onceki = sonMetin.get(dosya)
  sonMetin.set(dosya, metin)
  if (metin === null) return null
  if (metin === onceki) return undefined
  return jsonCoz<T>(metin)
}

async function sonGorevler($: Dolar): Promise<SonGorev[]> {
  const dizin = yol(kok, '.claude', 'gorevler')
  const girisler = await $.fs.list(dizin).catch(() => [])
  const liste: SonGorev[] = []
  for (const g of girisler) {
    if (g.kind !== 'dir') continue
    const adimYolu = yol(dizin, g.name, 'adim.json')
    const st = await $.fs.stat(adimYolu).catch(() => undefined)
    const adim = st ? jsonCoz<Adim>((await metinOku($, adimYolu)) ?? '') : undefined
    liste.push({ id: g.name, ad: adim?.ad ?? '', zaman: st?.mtimeMs ?? 0 })
  }
  return liste.sort((a, b) => b.zaman - a.zaman).slice(0, 5)
}

function al<T>(deger: T | null | undefined, onceki: T | null): T | null {
  return deger === undefined ? onceki : deger
}

async function yokla($: Dolar) {
  const eski = await read($, veri)
  const yeni: PanelVeri = {
    ...eski,
    yolKullanici: yol(ev, '.claude', 'dotnet-oracle-ayarlar.json'),
    yolProje: yol(kok, '.claude', 'dotnet-oracle-ayarlar.local.json'),
  }

  yeni.aktif = al(await oku<Aktif>($, yol(kok, '.claude', 'gorevler', 'aktif.json')), eski.aktif)
  if (yeni.aktif && typeof yeni.aktif.gorev !== 'string') yeni.aktif = eski.aktif
  if (yeni.aktif) {
    const gd = yol(kok, '.claude', 'gorevler', yeni.aktif.gorev)
    if (yeni.aktif.gorev !== eski.aktif?.gorev) {
      // Görev değişti: eski görevin verisi ve "değişmedi" önbelleği geçersiz.
      yeni.adim = null
      yeni.agentlar = null
      sonMetin.delete(yol(gd, 'adim.json'))
      sonMetin.delete(yol(gd, 'agentlar.json'))
    }
    yeni.adim = al(await oku<Adim>($, yol(gd, 'adim.json')), yeni.adim)
    yeni.agentlar = al(await oku<Agentlar>($, yol(gd, 'agentlar.json')), yeni.agentlar)
    yeni.sonGorevler = []
  } else {
    yeni.adim = null
    yeni.agentlar = null
    yeni.sonGorevler = await sonGorevler($)
  }
  yeni.ayarKullanici = al(await oku<NonNullable<AyarDosyasi>>($, yeni.yolKullanici), eski.ayarKullanici)
  yeni.ayarProje = al(await oku<NonNullable<AyarDosyasi>>($, yeni.yolProje), eski.ayarProje)

  if (JSON.stringify(yeni) !== JSON.stringify(eski)) await update($, veri, () => yeni)
  // Saniye sayacı yalnızca çalışan bir agent varken ilerler; boşuna yeniden çizim olmaz.
  if (yeni.agentlar?.aktif?.length) await update($, simdi, () => Date.now())
}

async function varsayilanlariOku($: Dolar) {
  const sonuc: Record<string, Required<Ayar>> = { ...EKIP_VARSAYILANI }
  for (const a of AGENTLAR) {
    const metin = (await metinOku($, yol($.plugin.root, 'agents', `${a}.md`))) ?? ''
    const ust = metin.split(/\r?\n---\r?\n/)[0] ?? ''
    const model = ust.match(/^model:\s*(\S+)/m)?.[1]
    const effort = ust.match(/^effort:\s*(\S+)/m)?.[1]
    if (model && effort) sonuc[a] = { model, effort }
  }
  await update($, veri, v => ({ ...v, varsayilan: sonuc }))
}

async function panelAc($: Dolar) {
  await $.ui.open({ id: PANEL, title: BASLIK })
  if (zamanlayici) return
  await yokla($)
  zamanlayici = $.clock.every(YOKLAMA_MS, () => void yokla($).catch(() => undefined))
}

async function gitignoreEkle($: Dolar) {
  const dosya = yol(kok, '.gitignore')
  const metin = (await metinOku($, dosya)) ?? ''
  const varMi = metin.split(/\r?\n/).some(s => s.trim().replace(/^\//, '') === GITIGNORE_SATIRI)
  if (varMi) return
  const ayrac = metin === '' || metin.endsWith('\n') ? '' : '\n'
  await $.fs.write(dosya, `${metin}${ayrac}${GITIGNORE_SATIRI}\n`)
}

// Seçili kapsamdaki dosyayı yeniden okur; yalnızca agentlar altındaki ilgili kayıtları değiştirir.
async function ayarYaz($: Dolar, hedef: 'kullanici' | 'proje', degistir: (agentlar: Record<string, Ayar>) => void) {
  const v = await read($, veri)
  const dosya = hedef === 'proje' ? v.yolProje : v.yolKullanici
  const metin = await metinOku($, dosya)
  const icerik = metin === null || metin.trim() === '' ? {} : jsonCoz<Record<string, unknown>>(metin)
  if (!icerik) {
    // Bozuk dosyanın üzerine yazmak elle yazılmış ayarları silerdi.
    await $.ui.toast(`${dosya} okunamadı (bozuk JSON); üzerine yazılmadı.`)
    return
  }
  const agentlar = (icerik.agentlar && typeof icerik.agentlar === 'object' ? icerik.agentlar : {}) as Record<string, Ayar>
  degistir(agentlar)
  if (Object.keys(agentlar).length) icerik.agentlar = agentlar
  else delete icerik.agentlar
  await $.fs.write(dosya, JSON.stringify(icerik, null, 2) + '\n')
  if (hedef === 'proje') await gitignoreEkle($)
  await yokla($)
}

async function guvenliYaz($: Dolar, hedef: 'kullanici' | 'proje', degistir: (agentlar: Record<string, Ayar>) => void) {
  await ayarYaz($, hedef, degistir).catch(() => $.ui.toast('Ayar dosyası yazılamadı.'))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const sonuc = await next(e)
    kok = (await $.session.cwd()).replace(/\\/g, '/')
    ev = ((await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '').replace(/\\/g, '/')
    await $.command.register({ name: 'gorev-paneli', description: 'dotnet-oracle görev panelini açar (durum ve agent modelleri)' })
    await varsayilanlariOku($).catch(() => undefined)
    // Yalnızca /gelistir kullanılan projelerde kendiliğinden açılır.
    if (await $.fs.exists(yol(kok, '.claude', 'gorevler'))) await panelAc($)
    return sonuc
  })

  on('command.run', { command: 'gorev-paneli' }, async $ => {
    await panelAc($)
    return { text: 'Görev paneli açıldı.' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANEL) {
      zamanlayici?.cancel()
      zamanlayici = undefined
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANEL }, async ($, e) => {
    const { Box, Text, Button, Select } = $.ui.resolve(e)
    const v = await read($, veri)
    const secili = await read($, sekme)

    const ust = (
      <Box flexDirection="row" gap={1}>
        <Button key="sekme-durum" label="Durum" variant={secili === 'durum' ? 'primary' : 'secondary'} onPress={() => void update($, sekme, () => 'durum' as const)} />
        <Button key="sekme-modeller" label="Modeller" variant={secili === 'modeller' ? 'primary' : 'secondary'} onPress={() => void update($, sekme, () => 'modeller' as const)} />
      </Box>
    )

    if (secili === 'modeller') {
      const k = await read($, kapsam)
      const dosya = k === 'proje' ? v.yolProje : v.yolKullanici
      return (
        <Box flexDirection="column" gap={1}>
          {ust}
          <Box flexDirection="column">
            <Box flexDirection="row" gap={1}>
              <Button key="kapsam-kullanici" label="Benim için" variant={k === 'kullanici' ? 'primary' : 'secondary'} onPress={() => void update($, kapsam, () => 'kullanici' as const)} />
              <Button key="kapsam-proje" label="Bu proje" variant={k === 'proje' ? 'primary' : 'secondary'} onPress={() => void update($, kapsam, () => 'proje' as const)} />
            </Box>
            <Text dimColor wrap="truncate-start">{dosya}</Text>
          </Box>
          {AGENTLAR.map(a => {
            const g = gecerliAyar(v, a)
            return (
              <Box key={`agent-${a}`} flexDirection="column">
                <Box flexDirection="row" gap={1}>
                  <Text weight="semibold">{a}</Text>
                  <Text color={g.kaynak === 'varsayılan' ? 'inactive' : 'suggestion'}>[{g.kaynak}]</Text>
                </Box>
                <Box flexDirection="row" gap={2}>
                  <Select key={`model-${a}`} label="model" value={g.model} options={MODELLER.map(m => ({ value: m, label: m }))}
                    onSelect={m => void guvenliYaz($, k, ag => { ag[a] = { ...ag[a], model: m } })} />
                  <Select key={`effort-${a}`} label="effort" value={g.effort} options={EFFORTLAR.map(m => ({ value: m, label: m }))}
                    onSelect={m => void guvenliYaz($, k, ag => { ag[a] = { ...ag[a], effort: m } })} />
                </Box>
              </Box>
            )
          })}
          <Button key="sifirla" label="Ekip varsayılanlarına dön"
            onPress={() => void guvenliYaz($, k, ag => { for (const a of AGENTLAR) delete ag[a] })} />
          <Text dimColor>Yeni seçim bir sonraki agent çağrısında geçerli olur.</Text>
        </Box>
      )
    }

    if (!v.aktif) {
      return (
        <Box flexDirection="column" gap={1}>
          {ust}
          <Text weight="semibold">Aktif görev yok</Text>
          {v.sonGorevler.length > 0 && <Text dimColor>Son görevler</Text>}
          {v.sonGorevler.map(g => (
            <Box key={`son-${g.id}`} flexDirection="row" gap={1}>
              <Text weight="semibold">{g.id}</Text>
              <Text dimColor>{g.ad || '—'}</Text>
            </Box>
          ))}
        </Box>
      )
    }

    const an = Math.max(await read($, simdi), Date.now())
    const durum = DURUM_ETIKETI[v.aktif.durum as keyof typeof DURUM_ETIKETI] ?? DURUM_ETIKETI.calisiyor
    const bitti = v.aktif.durum === 'tamamlandi'
    const adimNo = typeof v.adim?.adim === 'number' ? v.adim.adim : -1
    const aktifler = v.agentlar?.aktif ?? []
    const calismalar = v.agentlar?.calismalar ?? []
    const gecen = (c: Calisma) => (c.baslangic ? an - Date.parse(c.baslangic) : null)
    const hucre = (w: number, metin: string, soluk = false, kalin = false) => (
      <Box width={w}>
        <Text tabular dimColor={soluk} weight={kalin ? 'semibold' : undefined} wrap="truncate">{metin}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        {ust}
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1}>
            <Text weight="bold" size="heading">{v.aktif.gorev}</Text>
            <Text color={durum.renk}>● {durum.metin}</Text>
          </Box>
          {v.aktif.baslik ? <Text>{v.aktif.baslik}</Text> : null}
        </Box>

        {v.adim?.bekleyen === 'kullanici' ? (
          <Box borderStyle="round" borderColor="warning" paddingX={1}>
            <Text color="warning" weight="semibold">Senin cevabın bekleniyor — sohbete dön.</Text>
          </Box>
        ) : null}

        <Box flexDirection="column">
          {ADIMLAR.map((ad, i) => {
            const tamam = bitti || i < adimNo
            const simdiki = !bitti && i === adimNo
            const tur = simdiki && (v.adim?.tur ?? 1) > 1 ? ` (tur ${v.adim?.tur})` : ''
            return (
              <Text color={tamam ? 'success' : simdiki ? 'claude' : undefined} dimColor={!tamam && !simdiki} weight={simdiki ? 'semibold' : undefined}>
                {tamam ? '✓' : simdiki ? '▶' : '○'} {ad}{tur}
              </Text>
            )
          })}
        </Box>

        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Text dimColor>Şu an çalışan</Text>
          {aktifler.length === 0 ? <Text dimColor>Çalışan agent yok</Text> : null}
          {aktifler.map((c, i) => (
            <Box key={`aktif-${i}`} flexDirection="row" gap={1}>
              <Text weight="semibold">{c.agent}</Text>
              <Text dimColor>{c.model ?? '—'}/{c.effort ?? '—'}</Text>
              <Text dimColor>tur {c.tur ?? '—'}</Text>
              <Text tabular color="claude">{sure(gecen(c))}</Text>
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Box flexDirection="row">
            {hucre(12, 'Agent', true)}
            {hucre(14, 'Model/effort', true)}
            {hucre(5, 'Tur', true)}
            {hucre(7, 'Süre', true)}
            {hucre(9, 'Token', true)}
          </Box>
          {calismalar.length === 0 ? <Text dimColor>Henüz agent çalışmadı</Text> : null}
          {calismalar.map((c, i) => (
            <Box key={`satir-${i}`} flexDirection="row">
              {hucre(12, c.agent, false, c.durum === 'calisiyor')}
              {hucre(14, `${c.model ?? '—'}/${c.effort ?? '—'}`)}
              {hucre(5, String(c.tur ?? '—'))}
              {hucre(7, sure(c.durum === 'calisiyor' ? gecen(c) : c.sureMs))}
              {hucre(9, binlik(c.token))}
            </Box>
          ))}
          <Text weight="semibold">Toplam token: {binlik(v.agentlar?.toplamToken ?? null)}</Text>
        </Box>
      </Box>
    )
  })
}
