# FEATURES.md — Özellik ve Fonksiyon Referansı

## Sayfalar (8 sayfa + Modal'lar)

> Alt navigasyonda 6 buton var: Harita, Rota, Plan, Özet, Katalog, Diğer.
> "Diğer" butonundan Adresler ve Borçlar sayfalarına erişilir.
> Profil sayfasına Adresler listesinden müşteri adına tıklayarak erişilir.

---

### Harita (`page-map`) — Nav: Harita
Leaflet.js ile interaktif harita.

**Özellikler:**
- 101 müşteri konumu marker olarak gösterilir
- Hafta A / Hafta B / Tümü filtresi
- Marker'a tıkla → popup (cafe adı, adres, gün)
- Popup'ta "Güne Ata" butonu → assign modal açar
- Sağ üstte sync durumu noktası (tıklanabilir → Supabase modal)
- OpenStreetMap geocoding (processGeo ile toplu, ~1.1 sn/istek)
- Geocode edemezse posta kodu ile fallback dener

**İlgili fonksiyonlar:**
```js
initMap()                    // Leaflet haritayı başlat (satır 1306)
makeIcon(stop)               // Renkli marker ikonu oluştur (satır 1317)
makePopup(stop)              // Marker popup HTML'i (satır 1336)
addOrUpdateMarker(stop)      // Marker ekle veya güncelle (satır 1349)
refreshAllMarkers()          // Tüm markerları yenile (satır 1364)
setMapFilter(f)              // 'all'|'A'|'B' filtresi (satır 1373)
renderMapLegend()            // Alt renk legend (satır 1381)
startGeo()                   // Geocoding kuyruğunu başlat (satır 1394)
processGeo()                 // Geocoding işle (satır 1406)
openAssignMap(stopId)        // Haritadan assign modal aç (satır 1368)
```

---

### Rota (`page-rota`) — Nav: Rota
Günlük ziyaret takibi.

**Özellikler:**
- Hafta A/B seçimi + gün sekmeleri (5 tab + "Atanmamış" tab)
- Her stop kart: isim, adres, posta kodu pill
- Tik butonu → ziyaret edildi işaretle (yeşil)
- "↗" butonu → müşteriyi güne ata/değiştir (assign modal)
- "✏️" butonu → stop düzenleme modal
- Arama: cafe adı / adres / posta kodu
- Alt bar: Ziyaret / Toplam / Kalan sayısı
- "↺ Sıfırla" → günün ziyaretlerini temizle
- Atanmamış durağa tıkla → assign modal açılır
- "📥 Excel" butonu → tüm rotaları Excel'e export et (siparişlerle birlikte)
- Stop kartına tıkla → haritada zoom

**İlgili fonksiyonlar:**
```js
renderRota()                 // Tüm rota sayfasını render (satır 1524)
renderRotaTabs()             // Gün sekmeleri (satır 1532)
renderRotaBody()             // Stop kartları listesi (satır 1548)
renderUnassigned(el)         // Atanmamış stoplar bölümü (satır 1602)
updateRotaBar()              // Alt bar güncelle (satır 1621)
setRotaWeek(w)               // 'A'|'B' hafta seç (satır 1503)
setRotaDay(id)               // Gün seç (wA0 vb.) (satır 1510)
onRotaSearch(v)              // Arama filtrele (satır 1512)
clearRotaSearch()            // Arama temizle (satır 1517)
resetRotaDay()               // Günü sıfırla (satır 1636)
zoomTo(stopId)               // Haritada stop'a zoom (satır 1642)
exportExcel()                // Rota Excel export (siparişlerle) (satır 2246)
```

---

### Plan (`page-plan`) — Nav: Plan
Günlük sipariş ve ödeme takibi.

**Özellikler:**
- Hafta A/B + gün sekmeleri + "Plansız" tab
- Her stop kart: ödeme durumu badge'i (Cash/Banka/Ödenmedi/Borç/Not)
- Karta tıkla → sipariş/ödeme modal (ordOv)
- Gün özeti: Cash / Banka / Ödenmedi / Borç Ödendi
- Plansız stoplar bölümü
- Taşı özelliği (stop'u başka güne taşı) — "↗" butonu
- Sürükle-bırak ile sıralama (desktop: drag, mobile: touch grip)
- Tik butonu → ziyaret edildi
- **Import** butonu → Excel/CSV/JSON ile toplu gün atama

**İlgili fonksiyonlar:**
```js
renderPlan()                 // Tüm plan sayfası (satır 1664)
renderPlanTabs()             // Gün sekmeleri (satır 1671)
renderPlanBody()             // Stop kartları (satır 1733)
renderPlanUnsched(el)        // Plansız stoplar (satır 1776)
renderDaySummary(dayId)      // Gün özet bar (satır 1694)
payBadgeHtml(stopId)         // Ödeme badge HTML'i (satır 1714)
setPlanWeek(w)               // Hafta seç (satır 1655)
setPlanDay(id)               // Gün seç (satır 1662)
bindPlanEvents()             // Event'leri bağla (satır 1790)
initDrag()                   // Drag-drop başlat (satır 1844)
reorder(dayId, from, to)     // Sıra değiştir (satır 1896)
openMove(fromDayId, stopId)  // Taşıma modal aç (satır 1802)
execMove(destId)             // Taşımayı uygula (satır 1818)
closeMove()                  // Taşıma modal kapat (satır 1840)
openPlanImport()             // Import modal aç (satır 2829)
applyPlanImport()            // Import verisini uygula (satır 2918)
```

**Sipariş Modalı (ordOv):**
```js
openOrd(stopId, dayId)       // Modalı aç (satır 2531)
closeOrd()                   // Modalı kapat (satır 2145)
saveOrder()                  // Siparişi kaydet + vis işaretle (satır 2480)
renderOrdItems()             // Sipariş kalemlerini göster (satır 2150)
renderOrdTotal()             // Toplam göster (satır 2192)
addOrderItem()               // Manuel ürün ekle (satır 2179)
addFromCatalog(name, price)  // Katalogdan ürün ekle (satır 2688)
changeQty(idx, delta)        // Miktar değiştir (satır 2169)
removeItem(idx)              // Kalemi kaldır (satır 2174)
selectPay(method)            // Ödeme yöntemi seç (satır 2205)
calcChange()                 // Para üstü hesapla (satır 2220)
applyDebtPayment()           // Borç ödemesi uygula (satır 2515)
toggleDebtPay()              // Borç ödeme alanını aç/kapat (satır 2240)
toggleCatPick()              // Katalog chip'lerini aç/kapat (satır 2657)
renderCatChips()             // Katalog chip'lerini render (satır 2666)
openStopCatFromOrd()         // Sipariş modalından özel fiyat UI aç (satır 2821)
```

---

### Özet Dashboard (`page-dash`) — Nav: Özet
Satış analizi ve raporlama.

**Özellikler:**
- **Bugün / Ay** toggle (period filter)
- **Hafta A / B / Tümü** toggle
- Hero: toplam ciro, ziyaret yüzdesi
- 4 pill: Cash / Banka / Ödenmedi / Toplam Borç
- 2x2 kart grid: ödeme dağılımı
- **Ürün bazlı satış sıralaması** (top 15, bar chart)
- Günlük durum bar'ları
- Top 5 borçlu → Borç sayfasına link ("Tümünü Gör →")
- Notlu müşteriler listesi
- **📥 Excel Rapor** butonu → 4 sheet'li detaylı rapor export

**İlgili fonksiyonlar:**
```js
renderDash()                 // Tüm dashboard (satır 3006)
setDashWeek(w)               // Hafta filtresi (satır 2961)
setDashPeriod(p)             // 'day'|'month' period (satır 2968)
getAllOrdersForPeriod(p)      // Period'a göre siparişleri topla (satır 2976)
buildProductStats(orderList) // Ürün bazlı istatistik hesapla (satır 2991)
exportDashReport()           // 4-sheet'li Excel rapor export (satır 3320)
```

**Excel Rapor Detayı (exportDashReport):**
4 sheet içerir:
1. **Özet** — period, toplam ciro, ödeme dağılımı, ziyaret yüzdesi
2. **Ürün Satışları** — ürün adı, miktar, toplam ciro (çok satandan aza)
3. **Müşteriler** — müşteri adı, sipariş sayısı, toplam harcama, ortalama
4. **Borçlar** — borçlu müşteriler, borç tutarı

---

### Katalog (`page-katalog`) — Nav: Katalog
Ürün yönetimi.

**Özellikler:**
- Global ürün listesi (ad, fiyat, kategori)
- Kategoriye göre gruplanmış görünüm
- Ürün ekle / düzenle / sil
- Order modal'da "Katalogdan Seç" → chip'ler
- Global chip: beyaz | Müşteriye özel chip: mor (stop override)
- `S.stopCatalog[stopId]` ile müşteriye özel fiyat tanımlanabilir

**İlgili fonksiyonlar:**
```js
renderKatalog()              // Katalog sayfası (satır 2575)
openAddCat()                 // Yeni ürün modal (satır 2610)
openEditCat(id)              // Düzenle modal (satır 2620)
saveCatItem()                // Kaydet (ekle/güncelle) (satır 2633)
deleteCatItem(id)            // Sil (satır 2649)
closeCat()                   // Modal kapat (satır 2631)
```

---

### Adresler (`page-adresler`) — "Diğer" menüsünden erişilir
Müşteri/stop yönetimi.

**Özellikler:**
- 101 cafe listesi (alfabetik sıralı), arama filtresi
- Stop ekle / düzenle / sil
- **Excel/CSV import** (Cafe Adı | Adres | Şehir | Posta Kodu)
- **Excel export** (adresler + atanmış gün bilgisi)
- Her kartta: atandığı gün badge'i, posta kodu rengi, geocode durumu ikonu
- Akıllı header algılama (import sırasında)
- Tekrar eklemeyi önleme (isim + posta kodu kontrolü)
- **📋 Fiyat** butonu → müşteriye özel fiyat modalı (stopCatOv)
- Müşteri adına tıkla → Profil sayfasına git

**İlgili fonksiyonlar:**
```js
renderAdresler()             // Liste render (satır 1954)
renderAdrList()              // Filtrelenmiş liste (satır 1959)
onAdrSearch(v)               // Arama (satır 1943)
clearAdrSearch()             // Arama temizle (satır 1948)
openAddStop()                // Yeni stop ekle (satır 2001)
saveAdd()                    // Eklemeyi kaydet (satır 2007)
openEdit(stopId)             // Düzenleme modal (satır 1907)
saveEdit()                   // Düzenlemeyi kaydet (satır 1917)
openDel(stopId)              // Silme onay modal (satır 2030)
confirmDel()                 // Silmeyi uygula (satır 2037)
closeDel()                   // Silme modal kapat (satır 2036)
exportAdrExcel()             // Excel export (satır 2061)
handleImport(input)          // Excel/CSV import işle (satır 2076)
```

---

### Borç Geçmişi (`page-borclar`) — "Diğer" menüsünden erişilir
Borç yönetimi ve işlem geçmişi.

**Özellikler:**
- Tüm borçlu müşteriler, toplam borç topbar'da
- Genişletilebilir kart: tam işlem geçmişi (en yeni üstte)
- Hızlı ödeme formu (kart başına)
- "Borcu Tamamen Sil" butonu
- Arama filtresi
- Renk kodlu: kırmızı = borç eklendi, yeşil = ödeme
- Borcu kapatılmış müşteriler de gösterilir ("KAPANDI" badge)
- En yüksek borçtan en düşüğe sıralı

**İlgili fonksiyonlar:**
```js
renderBorclar()              // Borç listesi (satır 2383)
toggleBdg(stopId)            // Kart aç/kapat (satır 2450)
quickPayDebt(stopId)         // Hızlı ödeme (satır 2455)
clearDebt(stopId)            // Borcu tamamen sil (satır 2467)
addDebtHistory(stopId, type, amount, note)  // Geçmişe ekle (satır 2358)
onBorcSearch(v)              // Arama (satır 2371)
clearBorcSearch()            // Arama temizle (satır 2376)
```

---

### Kalıcı Notlar (Modal)
Müşteriye özel kalıcı notlar (order modal'da "📌" butonu).

```js
openCnote(stopId)            // Not modal aç (satır 2314)
openCnoteFromOrd()           // Sipariş modal içinden aç (satır 2323)
saveCnote()                  // Notu kaydet (satır 2334)
closeCnote()                 // Modal kapat (satır 2329)
refreshOrdCnoteBanner(stopId) // Order modal'da not banner'ı güncelle (satır 2345)
```

---

### Müşteri Profil Sayfası (`page-profil`)
Her müşteri için detaylı istatistik ve geçmiş sayfası. Adresler'den müşteri adına tıklayarak açılır.

**Özellikler:**
- Müşteri bilgileri (adres, şehir, posta kodu)
- Atandığı gün badge'i
- Kalıcı müşteri notu
- Toplam sipariş sayısı, toplam harcama, ortalama sipariş tutarı
- En çok sipariş edilen ürünler (top 5)
- Sipariş geçmişi listesi (tarih, tutar, ödeme yöntemi, ürünler)
- Borç durumu ve borç geçmişi
- "Geri" butonu ile önceki sayfaya dönüş

```js
openProfil(stopId, backPage) // Profil sayfasını aç (satır 3153)
renderProfil()               // Profil sayfasını render et (satır 3159)
// profilStopId, profilBack — state değişkenleri
```

---

### Müşteriye Özel Fiyat (stopCatOv Modal)
Müşteriye özel fiyat tanımlama arayüzü. `S.stopCatalog[stopId]` verisi üzerinden çalışır.

**Erişim:**
- Adresler sayfasında "📋 Fiyat" butonu
- Sipariş modalında "Bu müşteriye özel fiyat ayarla →" linki

```js
openStopCat(stopId)          // Modal aç (satır 2703)
closeStopCat()               // Modal kapat (satır 2714)
renderStopCatItems()         // Override listesini render (satır 2720)
updateScPrice(name, v, gp)   // Fiyat güncelle (satır 2747)
updateScOnlyPrice(name, v)   // Sadece fiyat güncelle (satır 2756)
removeScOverride(name)       // Override kaldır (satır 2762)
addStopCatItem()             // Yeni override ekle (satır 2772)
saveStopCat()                // Değişiklikleri kaydet (satır 2798)
openStopCatFromOrd()         // Sipariş modalından aç (satır 2821)
```

---

### Supabase Sync (Modal)
Harita'daki sync noktasına tıkla → aç.

```js
openSbSetup()                // Modal aç (satır 3410)
closeSbSetup()               // Modal kapat (satır 3420)
saveSbConfig()               // URL + Key kaydet → reload (satır 3434)
testSbConnection()           // Bağlantı testi (satır 3445)
updateSbStatusBanner()       // Durum banner'ı güncelle (satır 3422)
pushAllToSupabase()          // Tüm LS → Supabase (satır 1185)
syncFromSupabase()           // Supabase → LS → re-render (satır 1141)
setSyncStatus(status)        // 'ok'|'syncing'|'error'|'offline' (satır 1198)
```

---

### Gün Atama (Assign Modal)
Stop'u bir güne ata veya atamayı kaldır.

```js
openAssign(stop)             // Modal aç (satır 1445)
doAssign(stopId, dayId)      // Atamayı uygula (satır 1468)
closeAssign()                // Modal kapat (satır 1493)
```

---

## Tüm Modallar

| Modal ID | Açıklama | Açan Fonksiyon | Satır |
|----------|----------|----------------|-------|
| `planImportOv` | Plan import | `openPlanImport()` | 525 |
| `catOv` | Ürün ekle/düzenle | `openAddCat()` / `openEditCat()` | 570 |
| `stopCatOv` | Müşteriye özel fiyat | `openStopCat()` | 602 |
| `sbSetupOv` | Supabase kurulum | `openSbSetup()` | 672 |
| `assignOv` | Gün atama | `openAssign()` | 723 |
| `cnoteOv` | Müşteri notu | `openCnote()` | 736 |
| `moveOv` | Stop taşı | `openMove()` | 758 |
| `editOv` | Stop düzenle | `openEdit()` | 771 |
| `addOv` | Stop ekle | `openAddStop()` | 807 |
| `delOv` | Stop sil | `openDel()` | 843 |
| `ordOv` | Sipariş/ödeme | `openOrd()` | 864 |

### Diğer UI Elemanları

| ID | Açıklama | Satır |
|----|----------|-------|
| `morePopup` | "Diğer" popup menüsü (Adresler + Borçlar) | 659 |

---

## localStorage Anahtarları

Tüm anahtarlar `cr4_` prefix'i ile saklanır:

| Anahtar | Açıklama |
|---------|----------|
| `cr4_stops` | Düzenlenmiş stop listesi |
| `cr4_assign` | Gün atamaları |
| `cr4_order` | Günlük sıralama |
| `cr4_vis` | Ziyaret edildi işaretleri |
| `cr4_geo` | Geocoded koordinatlar |
| `cr4_orders` | Tüm siparişler |
| `cr4_debts` | Birikmiş borçlar |
| `cr4_cnotes` | Kalıcı notlar |
| `cr4_debtHistory` | Borç işlem geçmişi |
| `cr4_catalog` | Ürün kataloğu |
| `cr4_stopCatalog` | Müşteri bazlı katalog override |
| `cr4_rWeek` | Rota sayfası hafta tercihi |
| `cr4_rDay` | Rota sayfası gün tercihi |
| `cr4_pWeek` | Plan sayfası hafta tercihi |
| `cr4_pDay` | Plan sayfası gün tercihi |
| `cr4_mFilter` | Harita filtresi |
| `cr4_dWeek` | Dashboard hafta filtresi |
| `cr4_dPeriod` | Dashboard period filtresi |
| `cr4_sb_url` | Supabase project URL |
| `cr4_sb_key` | Supabase anon key |
