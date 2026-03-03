# Uygulama Geliştirme Planı

## Genel Özet

4 ana değişiklik talep edildi:
1. Plan + Rota birleştirme
2. Bağımsız Sipariş sayfası oluşturma
3. Müşteriye özel fiyatların sipariş akışına entegrasyonu
4. Günlük teslimat raporlama sistemi (günlük/aylık/custom tarih)

---

## AŞAMA 1: Plan ve Rota Birleştirme

### Mevcut Durum
- **Rota** (`page-rota`, satır 384–413): Günlük ziyaret takibi. Hafta A/B, gün sekmeleri, arama, tik butonu (ziyaret), ↗ atama, ✏️ düzenleme, Excel export, haritada zoom, alt bar (ziyaret/toplam/kalan), sıfırla.
- **Plan** (`page-plan`, satır 416–429): Sipariş/ödeme takibi. Hafta A/B, gün sekmeleri, sipariş/ödeme badge'leri, karta tıkla → sipariş modalı, gün özeti (cash/bank/ödenmedi/borç), sürükle-bırak sıralama, ↗ taşıma, import.

### Yapılacaklar

#### 1.1 HTML Değişiklikleri
- `page-plan` HTML bloğunu **tamamen kaldır** (satır 416–429)
- `page-rota` bloğuna Plan'ın özelliklerini ekle:
  - **Import butonu** (📂 Import) → topbar'a ekle (Excel butonunun yanına)
  - `page-rota` topbar'da zaten Excel export ve Hafta A/B var, Import butonu da eklenmeli
- Nav bar'dan **Plan butonunu kaldır** (satır 640–643, `nav-plan`)
  - Nav 6 butondan 5'e düşecek: Harita, Rota, Özet, Katalog, Diğer
  - Boşalan alana **Sipariş** butonu gelecek (Aşama 2)

#### 1.2 JavaScript Değişiklikleri

**Rota sayfasını genişlet — Plan'ın tüm özelliklerini Rota'ya taşı:**

- `renderRotaBody()` içine Plan'ın kart yapısını entegre et:
  - Her stop kartına **sipariş/ödeme badge'i** ekle (`payBadgeHtml()`)
  - Karta tıklama → `openOrd(stopId, dayId)` sipariş modalını aç
  - **Borç uyarısı** olan kartlarda sarı border
  - **Sürükle-bırak sıralama** (grip icon + drag logic)
  - **Taşıma butonu** (↗ → `openMove()`)

- `renderRotaTabs()` üstüne **gün özeti** ekle (`renderDaySummary()`)
  - Cash / Banka / Ödenmedi / Borç Ödendi toplamları

- Alt bar'ı genişlet:
  - Mevcut: Ziyaret / Toplam / Kalan
  - Ekle: Günün toplam cirosu

- `renderRota()` fonksiyonuna `bindPlanEvents()` ve `initDrag()` çağrılarını ekle

**Plan fonksiyonlarını temizle veya yeniden adlandır:**
- `setPlanWeek()`, `setPlanDay()` → kaldır (artık `setRotaWeek/Day` kullanılacak)
- `renderPlan()`, `renderPlanTabs()`, `renderPlanBody()`, `renderPlanUnsched()` → kaldır
- `bindPlanEvents()` → mantığını `renderRotaBody()` sonuna taşı
- `initDrag()`, `reorder()` → olduğu gibi kal (Rota'da kullanılacak)
- `openMove()`, `execMove()`, `closeMove()` → olduğu gibi kal (Rota'da kullanılacak)
- `renderDaySummary()`, `payBadgeHtml()` → olduğu gibi kal
- `openPlanImport()` → olduğu gibi kal ama artık Rota sayfasından çağrılacak

**showPage() güncelle:**
- `if(name==='plan')` bloğunu kaldır
- `if(name==='rota')` bloğunda `renderRota()` yeterli (zaten tüm özellikler burada olacak)

**State temizliği:**
- `S.planWeek`, `S.planDay` → kaldır, `S.rotaWeek/Day` kullanılacak
- `lsSave('pWeek')`, `lsSave('pDay')` → kaldır
- `execMove()` içindeki `S.planWeek/Day` referanslarını `S.rotaWeek/Day`'e çevir

#### 1.3 Birleştirilmiş Rota Kartı Yapısı (Her Stop İçin)

```
┌─────────────────────────────────────────────────┐
│ [1]  ABBEY CAFE                          [✓][↗]│
│      183 Abbey Wood Road, Abbey Wood     [✏️][≡]│
│      SE2 9DZ                                    │
│      [Cash £45.00] [2 kalem · £45.00]           │
│      [⚠ Borç £12.50]                            │
└─────────────────────────────────────────────────┘
```

- Tıkla → sipariş modalı aç
- ✓ → ziyaret işaretle
- ↗ → başka güne taşı (move modal)
- ✏️ → düzenle
- ≡ → sürükle-bırak grip

---

## AŞAMA 2: Sipariş Sayfası (`page-orders`)

### Konsept
Rota'dan bağımsız, herhangi bir müşteriye sipariş oluşturma sayfası. Fatura benzeri görünüm.

### 2.1 HTML — Yeni Sayfa

```html
<div class="page" id="page-orders">
  <div class="topbar">
    <div class="tb-title" style="flex:1">Sipariş</div>
  </div>
  <div class="body" id="ordersBody"></div>
</div>
```

### 2.2 Nav Bar
- Plan butonunun yerine **Sipariş** butonu ekle
- İkon: Alışveriş sepeti veya fatura ikonu
- Sıralama: Harita, Rota, **Sipariş**, Özet, Katalog, Diğer

### 2.3 Sayfa Akışı

```
┌──────────────────────────────────────────┐
│  Sipariş                                 │
├──────────────────────────────────────────┤
│  [🔍 Müşteri Ara...              ]       │
│                                          │
│  ► Seçilen: ABBEY CAFE                   │
│    183 Abbey Wood Rd, SE2 9DZ            │
│    📌 "Her zaman nakit ister"            │
│                                          │
├──────────────────────────────────────────┤
│  📦 Ürünler           [📋 Katalogdan Seç]│
│  ┌─────────────────────────────────────┐ │
│  │ Costadoro Espresso 1kg  x2  £30.00 │ │
│  │ Costadoro Filtre 250g   x1  £8.50  │ │
│  └─────────────────────────────────────┘ │
│  [Ürün adı] [Qty] [£] [+ Ekle]          │
│                                          │
├──────────────────────────────────────────┤
│  Toplam: £38.50                          │
│                                          │
│  💳 Ödeme: [Cash] [Banka] [Ödenmedi]    │
│  [Alınan Cash: ____]                     │
│  [✓ Para üstü: £1.50]                   │
│                                          │
│  📝 Not: [_____________]                 │
│                                          │
│  [  Kaydet ✓  ]                          │
└──────────────────────────────────────────┘
```

### 2.4 JavaScript — Yeni Fonksiyonlar

```js
// State
let orderPageStopId = null;

// Render
renderOrders()          // Sayfa render
renderOrderSearch()     // Müşteri arama listesi
selectOrderStop(id)     // Müşteri seç
renderOrderForm()       // Sipariş formu (items + payment + note)
savePageOrder()         // Siparişi kaydet (S.orders'a)

// Mevcut fonksiyonları yeniden kullan:
// - addFromCatalog(), renderCatChips() → katalog chip'leri
// - payBadgeHtml() → ödeme durumu
// - fmt(), ordTotal() → format ve toplam
```

### 2.5 Veri Kaydı
- Aynı `S.orders` yapısı kullanılacak: `ordKey = "YYYY-MM-DD_stopId"`
- `savePageOrder()` → `lsSave('orders', S.orders)` + Supabase sync
- Sipariş kaydedildiğinde otomatik `S.vis[dayId_stopId] = true` (eğer o stop o gün atanmışsa)

### 2.6 showPage() Güncelle
```js
if(name==='orders') renderOrders();
```

---

## AŞAMA 3: Müşteriye Özel Fiyatların Entegrasyonu

### Mevcut Durum
- `S.stopCatalog[stopId]` → `[{name, price, globalPrice}]` zaten var
- `stopCatOv` modalı ile müşteriye özel fiyat tanımlanabiliyor
- Sipariş modalında `renderCatChips()` zaten özel fiyatlı chip'leri **mor** gösteriyor

### Yapılacaklar

#### 3.1 Sipariş Sayfasında Özel Fiyat Entegrasyonu
- Müşteri seçildiğinde, o müşterinin `stopCatalog` override'ları otomatik uygulanmalı
- Katalog chip'lerinde özel fiyat varsa **mor** renkte ve **özel fiyatla** gösterilmeli
- "⚙️ Bu müşteriye özel fiyat ayarla →" linki sipariş sayfasında da olmalı

#### 3.2 Özel Fiyat Göstergesi
- Müşteri seçildiğinde, özel fiyatı olan ürünler için bilgi banner'ı göster:
  ```
  ℹ️ Bu müşteri için 3 ürüne özel fiyat tanımlı
  ```
- Fiyat farklarını göster: `Costadoro 1kg: £18.00 (global: £20.00)`

#### 3.3 Mevcut Kod Dokunulmayacak
- `openStopCat()`, `saveStopCat()`, `renderStopCatItems()` → olduğu gibi
- `addFromCatalog()` → zaten stopCatalog'u kontrol ediyor

---

## AŞAMA 4: Günlük Teslimat ve Raporlama Sistemi

### Konsept
Rota'daki müşterilere teslimat yapıldığında ödeme durumu seçilir. Dashboard'da günlük/aylık/custom tarih aralığında detaylı rapor görüntülenir.

### 4.1 Teslimat Akışı (Rota'da — Aşama 1 ile entegre)
- Zaten Aşama 1'de sipariş modalı Rota'ya entegre edilecek
- Sipariş kaydedildiğinde `payMethod` seçilmiş olacak (cash/bank/unpaid)
- Ek değişiklik gerekmez, Aşama 1 bunu kapsar

### 4.2 Dashboard Geliştirmesi — Custom Tarih Aralığı

**Mevcut:** Bugün / Ay (2 period toggle)
**Yeni:** Bugün / Ay / **Özel** (3 period toggle)

- "Özel" seçildiğinde tarih aralığı seçici açılacak:
  ```
  ┌──────────────────────────────────┐
  │  Başlangıç: [2026-02-01]        │
  │  Bitiş:     [2026-02-28]        │
  │  [Uygula]                       │
  └──────────────────────────────────┘
  ```

- `getAllOrdersForPeriod()` fonksiyonunu güncelle:
  - `period === 'custom'` → `startDate` ile `endDate` arasındaki siparişleri getir
  - State'e ekle: `S.dashStart`, `S.dashEnd`

### 4.3 Detaylı Satış Raporu Bölümü

Dashboard'a yeni bir bölüm ekle: **"Teslimat Raporu"**

```
┌─────────────────────────────────────────────────────┐
│ 📊 Teslimat Raporu — Bugün (2 Mart 2026)            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 💰 Müşteri Ödemeleri                                │
│ ┌─────────────────────────────────────────────────┐  │
│ │ ABBEY CAFE     │ Cash   │ £45.00               │  │
│ │ BEAN COUNTER   │ Banka  │ £32.00               │  │
│ │ COSTA PLUS     │ Ödenmedi│ £28.50              │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ 📦 Ürün Bazlı Satış                                 │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Costadoro Espresso 1kg  │  8 adet  │  £120.00  │  │
│ │ Costadoro Filtre 250g   │  5 adet  │  £42.50   │  │
│ │ Paper Cups (100lü)      │  3 adet  │  £15.00   │  │
│ └─────────────────────────────────────────────────┘  │
│                                                      │
│ 📊 Toplam Özet                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Toplam Satış:    £177.50                        │  │
│ │ Cash Toplanan:   £45.00                         │  │
│ │ Banka Toplanan:  £32.00                         │  │
│ │ Ödenmedi:        £28.50                         │  │
│ │ Toplam Ürün:     16 adet                        │  │
│ └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 4.4 JavaScript — Dashboard Güncellemeleri

```js
// Yeni state
S.dashStart = lsGet('dStart', todayKey());  // custom başlangıç
S.dashEnd   = lsGet('dEnd', todayKey());    // custom bitiş

// Yeni fonksiyonlar
setDashPeriod('custom')    // custom period seçildiğinde tarih inputları göster
applyCustomRange()         // custom tarih aralığını uygula
renderDeliveryReport()     // müşteri ödemeleri + ürün bazlı satış tablosu

// Güncellenen fonksiyonlar
getAllOrdersForPeriod(period) // 'custom' case ekle
renderDash()                 // deliveryReport bölümünü ekle
```

### 4.5 Rota Gün Bazlı Filtreleme
Rota sayfasında aktif güne göre, o gündeki müşterilerin siparişleri otomatik filtrelenecek:
- Gün sekmesine tıkla → o güne atanmış müşterilerin siparişleri ve ödemeleri görünür
- Alt bar'da: Günün toplam cirosu, cash toplamı, ürün adedi

---

## UYGULAMA SIRASI

```
1. Aşama 1 — Plan + Rota birleştirme     (en büyük değişiklik, önce yapılmalı)
2. Aşama 3 — Özel fiyat entegrasyonu     (Aşama 1 ile paralel düşünülmeli)
3. Aşama 2 — Sipariş sayfası             (birleştirilmiş Rota'dan bağımsız)
4. Aşama 4 — Dashboard raporlama         (en son, tüm veri akışı hazır olunca)
```

---

## ETKİLENEN DOSYALAR

Sadece `index.html` (tek dosya mimarisi).

### Silinecekler
- `page-plan` HTML bloğu
- `nav-plan` butonu
- `setPlanWeek()`, `setPlanDay()`, `renderPlan()`, `renderPlanTabs()`, `renderPlanBody()`, `renderPlanUnsched()` fonksiyonları
- `S.planWeek`, `S.planDay` state'leri

### Eklenecekler
- `page-orders` HTML bloğu
- `nav-orders` butonu
- Sipariş sayfası fonksiyonları (~150 satır JS)
- Dashboard custom tarih aralığı (~50 satır JS + HTML)
- Teslimat raporu bölümü (~80 satır JS)

### Güncellenecekler
- `renderRotaBody()` → Plan özelliklerini entegre et
- `renderRotaTabs()` → gün özetini ekle
- `showPage()` → `plan` kaldır, `orders` ekle
- `getAllOrdersForPeriod()` → custom period ekle
- `renderDash()` → custom tarih UI + teslimat raporu
- `execMove()` → `S.planWeek/Day` referanslarını `S.rotaWeek/Day`'e çevir
- Nav bar → Plan → Sipariş

### Brace Dengesi Kontrolü
Her aşama sonunda yapılacak:
```python
js_content.count('{') == js_content.count('}')
```

---

## RİSKLER ve DİKKAT EDİLECEKLER

1. **Rota + Plan birleştirme karmaşık** — çok sayıda fonksiyon birbirine bağlı. Dikkatli test gerekir.
2. **Mobil UX** — Birleştirilmiş Rota kartları daha uzun olacak, scroll performansı kontrol edilmeli.
3. **State migration** — `S.planWeek/Day` kullanan eski localStorage verileri temizlenmeli.
4. **openOrd() referansları** — Plan'dan çağrılan `openOrd()`, artık Rota'dan çağrılacak; `ordDayId` doğru geçmeli.
5. **Arama + Sürükle-bırak çakışması** — Rota'da arama var, Plan'da yok. Arama filtresi aktifken sürükle-bırak devre dışı bırakılmalı.
