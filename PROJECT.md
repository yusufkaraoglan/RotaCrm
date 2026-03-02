# PROJECT.md — Mimari ve Teknik Detaylar

## Uygulama Nedir?

Costadoro Coffee'nin Kent ve Londra bölgelerinde ~101 kafede kahve dağıtımı yapan Yusuf için özel geliştirilmiş rota yönetim sistemi.

**Temel iş akışı:**
1. 101 müşteri iki haftalık rotaya (Hafta A / Hafta B) dağıtılmış
2. Her hafta 5 gün (Pazartesi–Cuma) × 2 hafta = 10 günlük plan
3. Saha'da telefon ile ziyaret takibi + sipariş/ödeme kaydı
4. Ofiste bilgisayar ile rota planlama ve analiz

---

## Teknik Mimari

```
index.html (tek dosya, ~3487 satır)
├── <style>           CSS (satır 9–350)
├── <body>            HTML sayfaları + modallar (satır 352–963)
│   ├── page-map      Leaflet harita (satır 355)
│   ├── page-rota     Günlük rota listesi / ziyaret takibi (satır 384)
│   ├── page-plan     Haftalık plan / sipariş/ödeme (satır 416)
│   ├── page-adresler Müşteri/adres CRUD (satır 432) — "Diğer" menüsünden
│   ├── page-dash     Dashboard / özet + ürün analizi (satır 463)
│   ├── page-borclar  Borç geçmişi (satır 481) — "Diğer" menüsünden
│   ├── page-katalog  Ürün kataloğu yönetimi (satır 499)
│   └── page-profil   Müşteri profil sayfası (satır 511) — Adresler'den erişilir
├── Modallar          planImportOv, catOv, stopCatOv, nav, morePopup,
│                     sbSetupOv, assignOv, cnoteOv, moveOv, editOv,
│                     addOv, delOv, ordOv
├── CDN Scripts       XLSX (satır 964), Leaflet (satır 965)
└── <script>          JavaScript (satır 966–3487)
    ├── DATA           STOPS_DEFAULT (101 stop), DAYS (10 gün) (satır 968–1087)
    ├── SUPABASE CFG   SB_URL, SB_KEY sabitleri (satır 1088–1093)
    ├── HYBRID STORAGE Supabase hybrid storage katmanı (satır 1094–1210)
    ├── STATE          S objesi + save objesi (satır 1211–1265)
    ├── NAVIGATION     showPage(), toggleMore(), closeMore() (satır 1266–1300)
    ├── MAP            Leaflet init, markers, geocoding (satır 1301–1440)
    ├── ASSIGN MODAL   Gün atama (satır 1441–1497)
    ├── ROTA           Günlük ziyaret takibi (satır 1498–1651)
    ├── PLAN           Sipariş/ödeme, sürükle-bırak sıralama (satır 1652–1903)
    ├── EDIT MODAL     Stop düzenleme (satır 1904–1937)
    ├── ADRESLER       CRUD, Excel/CSV import/export (satır 1938–2137)
    ├── ORDER/PAYMENT  Sipariş & ödeme sistemi (satır 2138–2308)
    ├── NOTES          Kalıcı müşteri notları (satır 2309–2355)
    ├── DEBT HISTORY   Borç takibi ve geçmiş (satır 2356–2476)
    ├── SAVE ORDER     Sipariş kaydet + borç + openOrd (satır 2477–2570)
    ├── KATALOG        Global ürün kataloğu (satır 2571–2697)
    ├── STOP CATALOG   Müşteriye özel fiyat UI (satır 2698–2828)
    ├── PLAN IMPORT    Excel/CSV/JSON ile toplu atama (satır 2829–2955)
    ├── DASHBOARD      Satış analizi, ürün bazlı rapor (satır 2956–3147)
    ├── MÜŞTERİ PROFİL Müşteri profil sayfası (satır 3148–3317)
    ├── DASH EXPORT    Dashboard Excel rapor export (satır 3318–3407)
    ├── SUPABASE UI    Kurulum ve sync arayüzü (satır 3408–3469)
    └── INIT           Uygulama başlatma (satır 3470–3487)
```

---

## Navigasyon Yapısı

### Alt Nav Bar (6 buton)
| Buton | Sayfa | İkon |
|-------|-------|------|
| Harita | `page-map` | Harita SVG |
| Rota | `page-rota` | Onay kutusu SVG |
| Plan | `page-plan` | Takvim SVG |
| Özet | `page-dash` | Grid SVG |
| Katalog | `page-katalog` | Çanta SVG |
| Diğer | Popup menü | ⋯ (üç nokta) |

### "Diğer" Popup Menüsü
| Sayfa | Erişim Yolu |
|-------|-------------|
| `page-adresler` | "Diğer" popup → "📍 Adresler" |
| `page-borclar` | "Diğer" popup → "💰 Borçlar" (+ Dashboard'dan "Tümünü Gör →" linki) |

### Profil Sayfası
| Sayfa | Erişim Yolu |
|-------|-------------|
| `page-profil` | Adresler listesinde müşteri adına tıklayarak erişilir |

---

## Veri Modelleri

### STOPS (Müşteri Durağı)
```js
{
  id: number,        // 0–100, unique (zero-indexed)
  n: string,         // Cafe adı (örn: "ABBEY CAFE")
  a: string,         // Adres satırı
  c: string,         // Şehir (örn: "Gravesend")
  p: string,         // Posta kodu (örn: "DA11 0BB")
  // Koordinatlar S.geo[id] içinde ayrı saklanır
}
```

### DAYS (Gün Tanımları) — sabit, 10 gün
```js
{
  id: string,        // örn: "wA0" (Hafta A Pazartesi)
  label: string,     // "Pazartesi"
  week: "A" | "B",
  color: string,     // hex renk kodu (örn: "#E85D3A")
  ci: number,        // renk index'i (0–9)
}
```

**ID formatı:** `w{HAFTA}{GÜN_INDEX}` → `wA0`=HftA Pzt, `wB3`=HftB Per

### State (S objesi) — localStorage + Supabase'de saklanır

| Key | Tip | Açıklama |
|-----|-----|----------|
| `assign` | `{stopId: dayId}` | Hangi stop hangi güne atanmış |
| `order` | `{dayId: [stopId, ...]}` | Gün içi sıralama |
| `vis` | `{dayId_stopId: bool}` | Ziyaret edildi mi |
| `geo` | `{stopId: {lat, lng}}` | Geocoded koordinatlar |
| `orders` | `{YYYY-MM-DD_stopId: OrderObj}` | Günlük siparişler |
| `debts` | `{stopId: number}` | Birikmiş borç (£) |
| `cnotes` | `{stopId: string}` | Kalıcı müşteri notları |
| `debtHistory` | `{stopId: [TxObj, ...]}` | Borç işlem geçmişi |
| `catalog` | `[CatalogItem, ...]` | Global ürün kataloğu |
| `stopCatalog` | `{stopId: [override, ...]}` | Müşteriye özel fiyatlar |
| `stops` | `[Stop, ...]` | Düzenlenmiş stop listesi |

### Order Objesi
```js
{
  items: [{name: string, qty: number, price: number}],
  payMethod: "cash" | "bank" | "unpaid",
  cashReceived: number,
  note: string,
  debtPaid: number | null,
  ts: ISO8601 string,
}
```

### Debt History Transaction
```js
{
  date: "YYYY-MM-DD",
  type: "added" | "paid",
  amount: number,
  note: string,
}
```

### Catalog Item
```js
{
  id: string,          // Date.now().toString(36)
  name: string,
  price: number,
  category: string,    // "Genel", "Kahve", "Aksesuar" vb.
}
```

---

## Storage Mimarisi

### Hybrid localStorage + Supabase

```
Yazma:  lsSave(key, value)
          ├── lsSaveLocal()  →  localStorage['cr4_' + key]  (anlık)
          └── sbSet()        →  Supabase cr4_store (async, fire-and-forget)

Okuma:  lsGet(key, default)
          └── localStorage['cr4_' + key]  (hız için sadece local)

Sync:   syncFromSupabase()
          ├── Supabase'den tüm satırları çek
          ├── localStorage'ı güncelle
          └── Tüm sayfaları yeniden render et
```

### Supabase Tablosu
```
cr4_store (
  key         TEXT PRIMARY KEY,   -- örn: "orders", "debts"
  value       JSONB,              -- tüm state tek obje olarak
  updated_at  TIMESTAMPTZ
)
```

Her state key'i tek bir Supabase satırına karşılık gelir. Örn: `orders` key'i tüm siparişleri içeren büyük bir JSON objesi saklar.

---

## Önemli Fonksiyonlar

### Navigasyon
```js
showPage(name)  // 'map'|'rota'|'plan'|'adresler'|'dash'|'borclar'|'katalog'|'profil'
toggleMore(e)    // "Diğer" popup menüsünü aç/kapat
closeMore()      // "Diğer" popup menüsünü kapat
```

### Sipariş Anahtarı
```js
todayKey()           // "2026-03-01"
ordKey(stopId)       // "2026-03-01_42"
getOrd(stopId)       // S.orders[ordKey(stopId)] || null
ordTotal(ord)        // ord.items.reduce(toplam)
```

### Ödeme Formatı
```js
fmt(number)          // "£12.50"
```

### Yardımcı
```js
getDay(id)           // DAYS.find(d => d.id === id)
stopsForDay(dayId)   // Güne atanmış ve sıralanmış stop listesi
pcClass(postcode)    // Posta koduna göre CSS class ("pSE", "pDA" vb.)
delay(ms)            // Promise tabanlı bekleme
```

### Geocoding
```js
startGeo()           // Geocode edilmemiş stopları kuyruğa al
processGeo()         // OpenStreetMap Nominatim ile toplu geocode
// Koordinatlar S.geo[stopId] = {lat, lng} olarak saklanır
```

---

## CSS Mimarisi

### CSS Değişkenleri (`:root`)
```css
--bg: #F7F8FA        /* Sayfa arkaplanı */
--card: #FFFFFF      /* Kart arkaplanı */
--border: #EAECF0    /* Hafif border */
--border2: #D0D5DD   /* Daha belirgin border */
--text: #101828      /* Ana metin */
--sub: #475467       /* İkincil metin */
--muted: #98A2B3     /* Soluk metin */
--nav: #101828       /* Nav bar rengi */

/* Hafta A renkleri: --c0 (Pzt) → --c4 (Cum) */
/* Hafta B renkleri: --c5 (Pzt) → --c9 (Cum) */
```

### Tasarım Sistemi
- Font: Inter (Google Fonts)
- Border-radius: 8–10px (kartlar), 99px (pill/chip)
- Mobile-first: `max-scale=1.0, user-scalable=no`
- Safe area: `env(safe-area-inset-bottom)` ile iPhone notch desteği

---

## Posta Kodu → CSS Sınıfı Eşleşmesi

| Prefix | CSS Class | Arkaplan | Metin Rengi |
|--------|-----------|----------|-------------|
| SE | `.pSE` | `#EFF8FF` (mavi) | `#1849A9` |
| DA | `.pDA` | `#ECFDF3` (yeşil) | `#054F31` |
| ME | `.pME` | `#FDF4FF` (mor) | `#53178F` |
| BR | `.pBR` | `#EDE9FE` (eflatun) | `#3E1C96` |
| CR | `.pCR` | `#FFFAEB` (amber) | `#7A2E0E` |
| SM | `.pSM` | `#EEF4FF` (lacivert) | `#2D3282` |
| CT | `.pCT` | `#F0FDF4` (yeşil) | `#064E3B` |
| TN | `.pTN` | `#FFF6ED` (turuncu) | `#7E2410` |
| KT | `.pKT` | `#F0FDF4` (yeşil) | `#054F31` |
| RH | `.pRH` | `#FFF1F3` (pembe) | `#881B2D` |
| GU | `.pGU` | `#FDF4FF` (mor) | `#53178F` |
| Diğer | `.pOT` | `#F2F4F7` (gri) | `#344054` |

---

## Bilinen Sınırlamalar

1. **Tek kullanıcı** — çok kullanıcılı çakışma çözümü yok (last-write-wins)
2. **Büyük veri** — `orders` objesi zamanla büyüyebilir; Supabase 5MB/satır limiti var
3. **Offline ilk açılış** — internet yoksa Supabase sync olmaz, sadece localStorage çalışır
4. **Geocoding** — OpenStreetMap Nominatim rate-limit var (~1.1 sn/istek aralık)
5. **Excel export** — SheetJS CDN gerektirir, offline'da çalışmaz
6. **~~Adresler sayfasına erişim~~** — Çözüldü: "Diğer" popup menüsü ile erişim sağlandı
