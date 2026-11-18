# Kaynaklar ve lisanslar

Bu repodaki bazı skill ve agent talimatları aşağıdaki açık kaynak projelerden **uyarlanmıştır**: Türkçeye çevrilmiş, C#/.NET + Oracle
bağlamına göre değiştirilmiş ve ekibin `/gelistir` akışına bağlanmıştır. Projelerin kendisi bu repoya kopyalanmamıştır.

| Kaynak | Sürüm (commit) | Lisans | Nerede kullanıldı |
|---|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) — Jesse Vincent | `22f0b46` | MIT | `skills/hata-ayiklama` (systematic-debugging, test-driven-development); `skills/calisma-ilkeleri` §4 (verification-before-completion); `agents/coder.md` düzeltme turu bölümü (receiving-code-review) |
| [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) — forrestchang | `2c60614` | MIT | `skills/calisma-ilkeleri` §1–§4 (karpathy-guidelines) |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — DietrichGebert | `96608e0` | MIT | `skills/calisma-ilkeleri` §2 (ponytail); `agents/reviewer.md` inceleme bölümleri (ponytail-review) |

Değerlendirilip **alınmayanlar**: claude-mem (AGPL lisansı; proje hafızası ihtiyacı `/proje-ogren` ile karşılanıyor),
Claude mem cowork (veriyi harici servise gönderiyor), I have adhd (kişisel çıktı tercihi), claude-code-setup (standart değil, ayrıca kullanılabilecek bir araç).

---

## Lisans metinleri

### obra/superpowers

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### forrestchang/andrej-karpathy-skills

Repo, lisansını README ve `plugin.json` içinde "MIT" olarak belirtir; ayrı bir LICENSE dosyası yoktur. Standart MIT metni:

```
MIT License

Copyright (c) forrestchang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### DietrichGebert/ponytail

```
MIT License

Copyright (c) 2026 DietrichGebert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
