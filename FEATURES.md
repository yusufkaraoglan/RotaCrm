# FEATURES.md — Özellik ve Fonksiyon Referansı

## Sayfalar (9 sayfa)

> Alt navigasyonda 5 buton: Route, Orders, Customers, Reports, Settings.
> Catalog, Map, Delivery History sayfaları Settings altından erişilir.
> Profile sayfası müşteri adına tıklayarak açılır.

---

### Route (`page-route`) — Nav: Route
Günlük ziyaret takibi ve rota yönetimi.

**Özellikler:**
- Week A/B seçimi + gün sekmeleri (Mon–Fri)
- Gün tablarında pending sipariş göstergesi (turuncu nokta)
- Her müşteri kartı: isim, adres, posta kodu, pending badge
- Checkbox ile teslimat işaretleme → delivery modal
- Sürükle-bırak ile rota sıralaması (touch + mouse)
- Alt bar: delivered sayısı, Cash/Bank/Unpaid toplamları
- Route summary share, Excel export, import butonları

---

### Orders (`page-orders`) — Nav: Orders
Sipariş listesi ve yönetimi.

**Özellikler:**
- Arama (müşteri adına göre)
- Filtre: All / Pending / Delivered
- Sıralama: Tarih / İsim / Tutar / Gün / Manuel
- Manuel sıralamada yukarı/aşağı ok butonları
- Her sipariş kartında müşteri adı + Week/Day badge
- Deliver, Edit, Remove butonları
- FAB (+) butonu ile yeni sipariş oluşturma
- Yeni sipariş formu tam sayfa overlay olarak açılır

**Yeni Sipariş Formu:**
- Müşteri seçimi (picker)
- Ürün ekleme (product picker — stok durumu gösterilir)
- Miktar (−/+) ve fiyat düzenlenebilir
- Toplam otomatik hesaplanır
- Teslimat tarihi + not alanı
- Stok takibi olan ürünlerde stok düşer

---

### Customers (`page-customers`) — Nav: Customers
Müşteri listesi ve yönetimi.

**Özellikler:**
- 103+ müşteri listesi (alfabetik)
- Arama filtresi
- Filtre: All / Week A / Week B / Unassigned
- Her kartta: avatar, isim, adres, Week/Day badge
- Müşteri adına tıkla → Profil sayfası
- "+ Add" butonu ile yeni müşteri ekleme

---

### Profile (`page-profile`)
Müşteri detay sayfası.

**Özellikler:**
- Müşteri bilgileri (adres, şehir, posta kodu)
- Atandığı gün badge'i
- Kalıcı müşteri notu
- Toplam sipariş sayısı, toplam harcama, ortalama
- En çok sipariş edilen ürünler (top 5)
- Sipariş geçmişi listesi
- Borç durumu ve geçmişi
- Hızlı sipariş, tekrar sipariş butonları

---

### Reports (`page-reports`) — Nav: Reports
Raporlar ve analitik.

**Özellikler:**
- Overview / Products / Customers / Debts / Export sekmeleri
- Tarih aralığı filtresi (This Week / This Month / Custom)
- Toplam ciro, sipariş sayısı, ortalama
- Ödeme dağılımı (Cash / Bank / Unpaid)
- Ürün bazlı satış tablosu (miktar, ciro)
- Müşteri bazlı harcama tablosu
- Borçlu müşteriler listesi
- Excel export (çok sheet'li)

---

### Settings (`page-settings`) — Nav: Settings
Uygulama ayarları hub'ı.

**Alt sayfalar:**
- **Product Catalog** → `page-catalog`
- **Harita** → `page-map`
- **Delivery History** → `page-delivery-history`

**Diğer ayarlar:**
- Supabase sync durumu ve kurulumu
- JSON dışa/içe aktarma (veri yedekleme)
- Reset all data

---

### Catalog (`page-catalog`) — Settings altından
Ürün kataloğu yönetimi.

**Özellikler:**
- Ürün ekleme formu (isim, birim, fiyat, stok)
- Her üründe renkli stok badge (yeşil/sarı/kırmızı)
- Stok −/+ butonları ile hızlı ayarlama (scroll korunur)
- "Stok ekle" input + Ekle butonu
- Edit modu: isim, birim, fiyat, stok değiştirme
- "Stok takibi yapma" checkbox (günlük ürünler)
- Ürün silme (edit modundan)
- `trackStock: false` olan ürünlerde stok alanı gizlenir

---

### Map (`page-map`) — Settings altından
Leaflet.js ile interaktif harita.

**Özellikler:**
- Müşteri konumları marker olarak
- Week A / Week B / All filtresi
- Marker popup (cafe adı, adres, gün)
- OpenStreetMap geocoding

---

### Delivery History (`page-delivery-history`) — Settings altından
Teslimat geçmişi sayfası.

---

## Sipariş Akışı

1. Orders → FAB (+) → Yeni sipariş formu (tam sayfa)
2. Müşteri seç → Ürün ekle (product picker)
3. Fiyat/miktar düzenle → Kaydet
4. Orders listesinde "pending" olarak görünür
5. Deliver → Ödeme modalı → Cash/Bank/Unpaid seç
6. Stok otomatik düşer (trackStock=true ürünlerde)
7. Borç varsa borç bilgisi gösterilir

---

## Stok Yönetimi

- Her catalog item'da `stock` (number|null) ve `trackStock` (boolean) alanı
- `trackStock: false` → günlük ürün, stok kontrolü yapılmaz
- Sipariş oluşturulduğunda stok düşer
- Sipariş düzenlendiğinde fark hesaplanır
- Stok 0 olan ürünler product picker'da disabled gösterilir
- Stok ≤5: kırmızı badge, ≤20: sarı badge, >20: yeşil badge
