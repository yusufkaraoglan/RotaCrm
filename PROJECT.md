# PROJECT.md — Mimari ve Teknik Detaylar

## Uygulama Nedir?

Costadoro Coffee'nin Kent ve Londra bölgelerinde ~103 kafede kahve dağıtımı yapan Yusuf için özel geliştirilmiş rota yönetim sistemi.

**Temel iş akışı:**
1. 103+ müşteri iki haftalık rotaya (Week A / Week B) dağıtılmış
2. Her hafta 5 gün (Mon–Fri) × 2 hafta = 10 günlük plan
3. Saha'da telefon ile ziyaret takibi + sipariş/ödeme kaydı
4. Ofiste bilgisayar ile rota planlama ve analiz

---

## Teknik Mimari

```
index.html (tek dosya, ~4571 satır)
├── <style>           CSS — tema, responsive, bileşen stilleri
├── <body>            HTML sayfaları + modallar
│   ├── page-route          Günlük rota / ziyaret takibi
│   ├── page-orders         Sipariş listesi (pending/delivered)
│   ├── page-customers      Müşteri listesi + CRUD
│   ├── page-profile        Müşteri profil detayı
│   ├── page-reports        Raporlar / dashboard
│   ├── page-settings       Ayarlar (katalog, harita, sync, yedekleme)
│   ├── page-catalog        Ürün kataloğu yönetimi
│   ├── page-map            Leaflet harita
│   └── page-delivery-history  Teslimat geçmişi
├── CDN Scripts       XLSX, Leaflet
└── <script>          JavaScript — tüm iş mantığı
```

---

## Navigasyon Yapısı

### Alt Nav Bar (5 buton)
| Buton | Sayfa | Açıklama |
|-------|-------|----------|
| Route | `page-route` | Günlük rota + ziyaret takibi |
| Orders | `page-orders` | Sipariş listesi + yeni sipariş |
| Customers | `page-customers` | Müşteri listesi + ekleme |
| Reports | `page-reports` | Raporlar / dashboard |
| Settings | `page-settings` | Ayarlar hub (katalog, harita, sync, yedek) |

### Settings Alt Sayfaları
| Sayfa | Erişim |
|-------|--------|
| `page-catalog` | Settings → Product Catalog |
| `page-map` | Settings → Harita |
| `page-delivery-history` | Settings → Teslimat Geçmişi |

### Profil Sayfası
| Sayfa | Erişim |
|-------|--------|
| `page-profile` | Customers listesinden veya Order kartından müşteri adına tıkla |

---

## Veri Modelleri

### STOPS (Müşteri Durağı)
```js
{
  id: number,        // unique
  n: string,         // Cafe adı (örn: "ABBEY CAFE")
  a: string,         // Adres satırı
  c: string,         // Şehir (örn: "Gravesend")
  p: string,         // Posta kodu (örn: "DA11 0BB")
}
```

### DAYS (Gün Tanımları) — sabit, 10 gün
```js
{
  id: string,        // örn: "wA0" (Week A Monday)
  label: string,     // "Monday"
  week: "A" | "B",
  color: string,     // hex renk kodu
  ci: number,        // renk index'i (0–9)
}
```

**ID formatı:** `w{WEEK}{DAY_INDEX}` → `wA0`=WeekA Mon, `wB3`=WeekB Thu

### State (S objesi) — localStorage + Supabase'de saklanır

| Key | Tip | Açıklama |
|-----|-----|----------|
| `assign` | `{stopId: dayId}` | Hangi stop hangi güne atanmış |
| `routeOrder` | `{dayId: [stopId, ...]}` | Gün içi sıralama |
| `geo` | `{stopId: {lat, lng}}` | Geocoded koordinatlar |
| `orders` | `{orderId: OrderObj}` | Tüm siparişler (UUID key) |
| `debts` | `{stopId: number}` | Birikmiş borç (£) |
| `cnotes` | `{stopId: string}` | Kalıcı müşteri notları |
| `debtHistory` | `{stopId: [TxObj, ...]}` | Borç işlem geçmişi |
| `catalog` | `[CatalogItem, ...]` | Global ürün kataloğu |
| `customerPricing` | `{stopId: {productName: price}}` | Müşteriye özel fiyatlar |
| `stops` | `[Stop, ...]` | Düzenlenmiş stop listesi |

### Order Objesi (V2)
```js
{
  id: string,           // UUID
  customerId: number,   // stop id
  items: [{name, qty, price}],
  note: string,
  deliveryDate: string, // YYYY-MM-DD
  status: "pending" | "delivered",
  payMethod: "cash" | "bank" | "unpaid" | "visit" | null,
  createdAt: ISO8601,
  deliveredAt: ISO8601 | null,
}
```

### Catalog Item
```js
{
  name: string,
  unit: string,        // "1" gibi birim
  price: number,
  stock: number | null, // null = stok takibi yok
  trackStock: boolean,  // false = günlük ürün, stok takibi yapılmaz
}
```

---

## Storage Mimarisi

### Hybrid localStorage + Supabase

```
Yazma:  lsSave(key, value)
          ├── localStorage['cr4_' + key]  (anlık)
          └── Supabase REST API (async, fire-and-forget)

Okuma:  lsGet(key, default)
          └── localStorage['cr4_' + key]  (hız için sadece local)

Sync:   syncFromSupabase()
          ├── Supabase'den tüm satırları çek
          ├── localStorage'ı güncelle
          └── Tüm sayfaları yeniden render et
```

**Not:** Supabase SDK kullanılmıyor — saf `fetch()` ile REST API çağrısı.

---

## CSS Mimarisi

### Tema Değişkenleri (`:root`)
```css
--bg: #F5F5F5        /* Sayfa arkaplanı */
--card: #FFFFFF      /* Kart arkaplanı */
--border: #EAECF0    /* Hafif border */
--text: #1A1A1A      /* Ana metin */
--text-sec: #6B7280  /* İkincil metin */
--text-muted: #9CA3AF /* Soluk metin */
--primary: #E85D3A   /* Costadoro turuncu */
--success: #12B76A   /* Yeşil */
--danger: #F04438    /* Kırmızı */
--warning: #F79009   /* Uyarı */
--info: #2E90FA      /* Bilgi mavisi */
```

### Tasarım Sistemi
- Font: Inter (Google Fonts)
- Border-radius: `--radius` (12px), `--radius-sm` (8px)
- Mobile-first responsive
- Safe area: `env(safe-area-inset-bottom)` ile iPhone notch desteği
- Chip/toggle sistemi filtreler için

---

## Bilinen Sınırlamalar

1. **Tek kullanıcı** — çok kullanıcılı çakışma çözümü yok (last-write-wins)
2. **Büyük veri** — `orders` objesi zamanla büyüyebilir
3. **Offline ilk açılış** — internet yoksa Supabase sync olmaz
4. **Geocoding** — OpenStreetMap Nominatim rate-limit var
5. **Excel export** — SheetJS CDN gerektirir
