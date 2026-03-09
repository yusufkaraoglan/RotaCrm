# ROADMAP.md — Planlanan Özellikler ve Geliştirme Fikirleri

## Tamamlananlar

### Temel Altyapı
- [x] 103+ müşteri, Leaflet harita
- [x] Week A/B x 5 gün rotası
- [x] Sürükle-bırak sıralama (Route sayfası)
- [x] OpenStreetMap geocoding
- [x] Excel export (rota, raporlar)
- [x] JSON veri yedekleme/geri yükleme

### Sipariş ve Ödeme
- [x] Tam sayfa sipariş formu (yeni/düzenle)
- [x] Product picker ile ürün seçimi
- [x] Fiyat düzenlenebilir sipariş kalemleri
- [x] Ödeme yöntemi: Cash / Bank / Unpaid
- [x] Stok takibi (sipariş oluşturulduğunda otomatik düşme)
- [x] Sipariş sıralama: Tarih / İsim / Tutar / Gün / Manuel
- [x] Orders listesinde hafta/gün badge'i

### Müşteri Yönetimi
- [x] Müşteri CRUD (ekle/düzenle/sil)
- [x] Excel/CSV import
- [x] Kalıcı müşteri notları
- [x] Müşteri profil sayfası (sipariş geçmişi, top ürünler, borç)
- [x] Müşteriye özel fiyat (customerPricing)
- [x] Filtreler: All / Week A / Week B / Unassigned

### Katalog
- [x] Global ürün kataloğu (ad, birim, fiyat, stok)
- [x] Renkli stok badge'leri (yeşil/sarı/kırmızı)
- [x] Stok ekleme/çıkarma (scroll korunur)
- [x] Günlük ürün desteği (trackStock: false)
- [x] Edit modu (ad, birim, fiyat, stok, günlük toggle)

### Borç Yönetimi
- [x] Borç takibi
- [x] Borç geçmişi
- [x] Hızlı ödeme formu

### Raporlar
- [x] Overview / Products / Customers / Debts / Export sekmeleri
- [x] Tarih aralığı filtresi
- [x] Excel rapor export (çok sheet'li)

### Route
- [x] Pending sipariş göstergesi gün tablarında
- [x] Route summary share
- [x] Delivery modal

### Sync
- [x] Supabase hybrid storage
- [x] Offline-first (localStorage önbellek)
- [x] Sync UI (kurulum + durum)

---

## Bekleyen Özellikler

### Yüksek Öncelik

#### 1. Rota Optimizasyonu
Şu an manuel sıralama var.

**Yapılacak:**
- En yakın komşu algoritması ile otomatik sıralama
- Veya Google Maps / OSRM API entegrasyonu

---

#### 2. Haftalık/Aylık Ciro Grafiği
Raporlarda sayılar var ama görsel grafik yok.

**Yapılacak:**
- Canvas/SVG çizgi grafik
- Haftalık bar chart

---

### Orta Öncelik

#### 3. Push Notification / Hatırlatıcı
Sabah belirli saatte "bugünün rotası" bildirimi.

#### 4. PWA Desteği
Uygulamayı telefona "yükle" özelliği.

#### 5. WhatsApp Sipariş Özeti
Günün siparişlerini WhatsApp mesajı olarak formatlama.

---

### Düşük Öncelik

#### 6. Çoklu Kullanıcı / Ekip
Supabase Auth + Row Level Security

#### 7. Coğrafi Bölge Bazlı Sıralama
Kent / Londra bölge toggle + bölge filtresi

---

## Teknik Borçlar

### Yüksek
- [ ] Orders veri büyümesi — eski siparişleri arşivleme
- [ ] Error handling — sync hata durumlarında kullanıcı bilgilendirme
- [ ] Conflict resolution — timestamp bazlı merge

### Orta
- [ ] Batch Supabase writes — debounce ile toplu yazma
- [ ] Geocoding retry mekanizması

### Düşük
- [ ] Kod organizasyonu — 4500+ satır tek dosya
- [ ] CSS cleanup — inline style'lar class'a taşınabilir
