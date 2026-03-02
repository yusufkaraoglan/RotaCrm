# FEATURES.md — Özellik ve Fonksiyon Referansı

## Sayfalar (7 sayfa + Modal'lar)

> Alt navigasyonda 5 buton var: Harita, Rota, Plan, Özet, Katalog.
> Adresler ve Borçlar sayfaları mevcut ama nav'da yok — diğer sayfalardan erişilir.

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
initMap()                    // Leaflet haritayı başlat (satır 1223)
makeIcon(stop)               // Renkli marker ikonu oluştur (satır 1234)
makePopup(stop)              // Marker popup HTML'i (satır 1253)
addOrUpdateMarker(stop)      // Marker ekle veya güncelle (satır 1266)
refreshAllMarkers()          // Tüm markerları yenile (satır 1281)
setMapFilter(f)              // 'all'|'A'|'B' filtresi (satır 1290)
renderMapLegend()            // Alt renk legend (satır 1298)
startGeo()                   // Geocoding kuyruğunu başlat (satır 1311)
processGeo()                 // Geocoding işle (satır 1323)
openAssignMap(stopId)        // Haritadan assign modal aç (satır 1285)
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
renderRota()                 // Tüm rota sayfasını render (satır 1441)
renderRotaTabs()             // Gün sekmeleri (satır 1449)
renderRotaBody()             // Stop kartları listesi (satır 1466)
renderUnassigned(el)         // Atanmamış stoplar bölümü (satır 1519)
updateRotaBar()              // Alt bar güncelle (satır 1538)
setRotaWeek(w)               // 'A'|'B' hafta seç (satır 1420)
setRotaDay(id)               // Gün seç (wA0 vb.) (satır 1427)
onRotaSearch(v)              // Arama filtrele (satır 1429)
clearRotaSearch()            // Arama temizle (satır 1434)
resetRotaDay()               // Günü sıfırla (satır 1553)
zoomTo(stopId)               // Haritada stop'a zoom (satır 1559)
exportExcel()                // Rota Excel export (siparişlerle) (satır 2164)
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
renderPlan()                 // Tüm plan sayfası (satır 1581)
renderPlanTabs()             // Gün sekmeleri (satır 1588)
renderPlanBody()             // Stop kartları (satır 1650)
renderPlanUnsched(el)        // Plansız stoplar (satır 1693)
renderDaySummary(dayId)      // Gün özet bar (satır 1611)
payBadgeHtml(stopId)         // Ödeme badge HTML'i (satır 1631)
setPlanWeek(w)               // Hafta seç (satır 1572)
setPlanDay(id)               // Gün seç (satır 1579)
bindPlanEvents()             // Event'leri bağla (satır 1707)
initDrag()                   // Drag-drop başlat (satır 1764)
reorder(dayId, from, to)     // Sıra değiştir (satır 1813)
openMove(fromDayId, stopId)  // Taşıma modal aç (satır 1722)
execMove(destId)             // Taşımayı uygula (satır 1738)
closeMove()                  // Taşıma modal kapat (satır 1760)
openPlanImport()             // Import modal aç (satır 2627)
applyPlanImport()            // Import verisini uygula (satır 2716)
```

**Sipariş Modalı (ordOv):**
```js
openOrd(stopId, dayId)       // Modalı aç (satır 2447)
closeOrd()                   // Modalı kapat (satır 2062)
saveOrder()                  // Siparişi kaydet + vis işaretle (satır 2396)
renderOrdItems()             // Sipariş kalemlerini göster (satır 2068)
renderOrdTotal()             // Toplam göster (satır 2110)
addOrderItem()               // Manuel ürün ekle (satır 2097)
addFromCatalog(name, price)  // Katalogdan ürün ekle (satır 2606)
changeQty(idx, delta)        // Miktar değiştir (satır 2087)
removeItem(idx)              // Kalemi kaldır (satır 2092)
selectPay(method)            // Ödeme yöntemi seç (satır 2123)
calcChange()                 // Para üstü hesapla (satır 2138)
applyDebtPayment()           // Borç ödemesi uygula (satır 2431)
toggleDebtPay()              // Borç ödeme alanını aç/kapat (satır 2158)
toggleCatPick()              // Katalog chip'lerini aç/kapat (satır 2575)
renderCatChips()             // Katalog chip'lerini render (satır 2584)
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

**İlgili fonksiyonlar:**
```js
renderDash()                 // Tüm dashboard (satır 2792)
setDashWeek(w)               // Hafta filtresi (satır 2747)
setDashPeriod(p)             // 'day'|'month' period (satır 2754)
getAllOrdersForPeriod(p)      // Period'a göre siparişleri topla (satır 2762)
buildProductStats(orderList) // Ürün bazlı istatistik hesapla (satır 2777)
```

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
renderKatalog()              // Katalog sayfası (satır 2492)
openAddCat()                 // Yeni ürün modal (satır 2527)
openEditCat(id)              // Düzenle modal (satır 2537)
saveCatItem()                // Kaydet (ekle/güncelle) (satır 2550)
deleteCatItem(id)            // Sil (satır 2566)
closeCat()                   // Modal kapat (satır 2548)
```

---

### Adresler (`page-adresler`) — Nav'da yok
Müşteri/stop yönetimi.

**Özellikler:**
- 101 cafe listesi (alfabetik sıralı), arama filtresi
- Stop ekle / düzenle / sil
- **Excel/CSV import** (Cafe Adı | Adres | Şehir | Posta Kodu)
- **Excel export** (adresler + atanmış gün bilgisi)
- Her kartta: atandığı gün badge'i, posta kodu rengi, geocode durumu ikonu
- Akıllı header algılama (import sırasında)
- Tekrar eklemeyi önleme (isim + posta kodu kontrolü)

**İlgili fonksiyonlar:**
```js
renderAdresler()             // Liste render (satır 1872)
renderAdrList()              // Filtrelenmiş liste (satır 1877)
onAdrSearch(v)               // Arama (satır 1860)
clearAdrSearch()             // Arama temizle (satır 1865)
openAddStop()                // Yeni stop ekle (satır 1918)
saveAdd()                    // Eklemeyi kaydet (satır 1924)
openEdit(stopId)             // Düzenleme modal (satır 1825)
saveEdit()                   // Düzenlemeyi kaydet (satır 1835)
openDel(stopId)              // Silme onay modal (satır 1947)
confirmDel()                 // Silmeyi uygula (satır 1954)
closeDel()                   // Silme modal kapat (satır 1953)
exportAdrExcel()             // Excel export (satır 1979)
handleImport(input)          // Excel/CSV import işle (satır 1994)
```

---

### Borç Geçmişi (`page-borclar`) — Nav'da yok
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
renderBorclar()              // Borç listesi (satır 2300)
toggleBdg(stopId)            // Kart aç/kapat (satır 2367)
quickPayDebt(stopId)         // Hızlı ödeme (satır 2372)
clearDebt(stopId)            // Borcu tamamen sil (satır 2384)
addDebtHistory(stopId, type, amount, note)  // Geçmişe ekle (satır 2275)
onBorcSearch(v)              // Arama (satır 2288)
clearBorcSearch()            // Arama temizle (satır 2293)
```

---

### Kalıcı Notlar (Modal)
Müşteriye özel kalıcı notlar (order modal'da "📌" butonu).

```js
openCnote(stopId)            // Not modal aç (satır 2230)
openCnoteFromOrd()           // Sipariş modal içinden aç (satır 2239)
saveCnote()                  // Notu kaydet (satır 2250)
closeCnote()                 // Modal kapat (satır 2245)
refreshOrdCnoteBanner(stopId) // Order modal'da not banner'ı güncelle (satır 2261)
```

---

### Supabase Sync (Modal)
Harita'daki sync noktasına tıkla → aç.

```js
openSbSetup()                // Modal aç (satır 2936)
closeSbSetup()               // Modal kapat (satır 2946)
saveSbConfig()               // URL + Key kaydet → reload (satır 2960)
testSbConnection()           // Bağlantı testi (satır 2971)
updateSbStatusBanner()       // Durum banner'ı güncelle (satır 2948)
pushAllToSupabase()          // Tüm LS → Supabase (satır 1118)
syncFromSupabase()           // Supabase → LS → re-render (satır 1075)
setSyncStatus(status)        // 'ok'|'syncing'|'error'|'offline' (satır 1131)
```

---

### Gün Atama (Assign Modal)
Stop'u bir güne ata veya atamayı kaldır.

```js
openAssign(stop)             // Modal aç (satır 1363)
doAssign(stopId, dayId)      // Atamayı uygula (satır 1386)
closeAssign()                // Modal kapat (satır 1410)
```

---

## Tüm Modallar

| Modal ID | Açıklama | Açan Fonksiyon | Satır |
|----------|----------|----------------|-------|
| `assignOv` | Gün atama | `openAssign()` | 660 |
| `editOv` | Stop düzenle | `openEdit()` | 708 |
| `addOv` | Stop ekle | `openAddStop()` | 744 |
| `delOv` | Stop sil | `openDel()` | 780 |
| `ordOv` | Sipariş/ödeme | `openOrd()` | 801 |
| `cnoteOv` | Müşteri notu | `openCnote()` | 673 |
| `moveOv` | Stop taşı | `openMove()` | 695 |
| `planImportOv` | Plan import | `openPlanImport()` | 510 |
| `catOv` | Ürün ekle/düzenle | `openAddCat()` / `openEditCat()` | 555 |
| `sbSetupOv` | Supabase kurulum | `openSbSetup()` | 609 |

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
