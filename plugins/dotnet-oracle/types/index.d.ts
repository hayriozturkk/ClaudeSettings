// Panelin $.state'te tuttuğu değerler.
export type Ayar = { model?: string; effort?: string }
export type AyarDosyasi = { agentlar?: Record<string, Ayar> } | null

export type Calisma = {
  agent: string
  model?: string | null
  effort?: string | null
  tur?: number | null
  adim?: string | null
  baslangic?: string | null
  bitis?: string | null
  sureMs?: number | null
  token?: number | null
  durum?: string
}

export type Aktif = { gorev: string; baslik?: string; baslangic?: string; durum?: string }
export type Adim = { adim?: number; ad?: string; tur?: number; bekleyen?: string | null; guncelleme?: string }
export type Agentlar = {
  aktif?: Calisma[]
  calismalar?: Calisma[]
  tokenToplami?: Record<string, number>
  toplamToken?: number
}
export type SonGorev = { id: string; ad: string; zaman: number }

export type PanelVeri = {
  aktif: Aktif | null
  adim: Adim | null
  agentlar: Agentlar | null
  sonGorevler: SonGorev[]
  ayarKullanici: AyarDosyasi
  ayarProje: AyarDosyasi
  varsayilan: Record<string, Required<Ayar>>
  yolKullanici: string
  yolProje: string
}

declare module 'claude-code' {
  interface PluginState {
    'dotnet-oracle': {
      veri: Shaped<PanelVeri>
      simdi: number
      sekme: 'durum' | 'modeller'
      kapsam: 'kullanici' | 'proje'
    }
  }
}
