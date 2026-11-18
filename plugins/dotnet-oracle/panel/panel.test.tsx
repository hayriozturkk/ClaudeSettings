import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE = {
  plugin: 'dotnet-oracle',
  component: 'Pane',
  requestId: 'gorev-paneli',
  props: { title: 'Görev paneli', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const G = '/p/.claude/gorevler'
const KULLANICI = '/home/.claude/dotnet-oracle-ayarlar.json'

// Motor yolu mutlak yapar (Windows'ta C:\p\...): karşılaştırma için sadeleştirilir.
const sade = (p: string) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')

// Bellekte bir dosya sistemi: panelin okuyup yazdığı her şey buradan geçer.
function sahteDosyalar(on: On, dosyalar: Map<string, string>) {
  on('session.cwd', () => ({ value: '/p' }))
  on('command.register', () => ({ value: { command: 'gorev-paneli' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('fs.read', (_, e) => (dosyalar.has(sade(e.path)) ? { value: dosyalar.get(sade(e.path))! } : { deny: 'ENOENT' }))
  on('fs.write', (_, e) => { dosyalar.set(sade(e.path), e.text); return { value: undefined } })
  on('fs.exists', (_, e) => ({ value: [...dosyalar.keys()].some(k => k.startsWith(sade(e.path))) }))
  on('fs.list', () => ({ value: [] }))
  mock.env(on, { USERPROFILE: '/home' })
}

function ornekGorev() {
  return new Map<string, string>([
    [`${G}/aktif.json`, JSON.stringify({ gorev: 'TEST-1', baslik: 'Telefon numarası zorunlu', durum: 'calisiyor' })],
    [`${G}/TEST-1/adim.json`, JSON.stringify({ adim: 3, ad: 'Kod', tur: 1, bekleyen: null })],
    [`${G}/TEST-1/agentlar.json`, JSON.stringify({
      aktif: [{ agent: 'coder', model: 'opus', effort: 'medium', tur: 1, baslangic: '1970-01-01T00:00:00Z', durum: 'calisiyor' }],
      calismalar: [
        { agent: 'analyst', model: 'opus', effort: 'high', tur: 1, sureMs: 192000, token: 38400, durum: 'tamamlandi' },
        { agent: 'db', model: 'sonnet', effort: 'high', tur: 1, sureMs: 60000, token: null, durum: 'tamamlandi' },
      ],
      toplamToken: 38400,
    })],
  ])
}

test('Durum sekmesi görevi, adımı ve token tablosunu gösterir; bozuk JSON son durumu bozmaz', async ($, on) => {
  const dosyalar = ornekGorev()
  sahteDosyalar(on, dosyalar)
  const saat = mock.clock(on, { now: 0 })
  await $.session.start({ cwd: '/p', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: 'TEST-1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Çalışıyor/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /▶ Kod/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /✓ Veritabanı/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '38.400' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '3:12' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Toplam token: 38\.400/ })).toBeDefined()

  // Yarım yazılmış dosya: panel son geçerli adımı göstermeye devam eder.
  dosyalar.set(`${G}/TEST-1/adim.json`, '{"adim": 5, "ad"')
  await saat.advance(1100)
  expect(await ui.find({ type: 'Text', text: /▶ Kod/ })).toBeDefined()

  // Geçerli değişiklik bir yoklamada görünür.
  dosyalar.set(`${G}/TEST-1/adim.json`, JSON.stringify({ adim: 1, ad: 'Analiz', tur: 1, bekleyen: 'kullanici' }))
  await saat.advance(1100)
  expect(await ui.find({ type: 'Text', text: /Senin cevabın bekleniyor/ })).toBeDefined()
  await ui.unmount()
})

test('Modeller sekmesindeki seçim kullanıcı dosyasına yazılır, diğer alanlar korunur', async ($, on) => {
  const dosyalar = ornekGorev()
  dosyalar.set(KULLANICI, JSON.stringify({ baska: 1, agentlar: { db: { model: 'opus' } } }))
  sahteDosyalar(on, dosyalar)
  mock.clock(on, { now: 0 })
  await $.session.start({ cwd: '/p', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'sekme-modeller' })
  await ui.select({ key: 'model-coder', value: 'sonnet' })
  expect(JSON.parse(dosyalar.get(KULLANICI)!)).toEqual({ baska: 1, agentlar: { db: { model: 'opus' }, coder: { model: 'sonnet' } } })

  await ui.press({ key: 'sifirla' })
  expect(JSON.parse(dosyalar.get(KULLANICI)!)).toEqual({ baska: 1 })

  // Bozuk dosyanın üzerine yazılmaz.
  dosyalar.set(KULLANICI, '{bozuk')
  await ui.select({ key: 'effort-coder', value: 'max' })
  expect(dosyalar.get(KULLANICI)).toBe('{bozuk')

  // Proje kapsamı .gitignore'a satır ekler.
  await ui.press({ key: 'kapsam-proje' })
  await ui.select({ key: 'effort-coder', value: 'max' })
  expect(JSON.parse(dosyalar.get('/p/.claude/dotnet-oracle-ayarlar.local.json')!)).toEqual({ agentlar: { coder: { effort: 'max' } } })
  expect(dosyalar.get('/p/.gitignore')).toBe('.claude/dotnet-oracle-ayarlar.local.json\n')
  await ui.unmount()
})
