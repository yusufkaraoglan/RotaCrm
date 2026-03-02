# ROADMAP.md — Planlanan Özellikler ve Geliştirme Fikirleri

## Durum Göstergesi
- Henüz başlanmadı
- Kısmi / geçici çözüm var
- Tamamlandı

---

## Tamamlananlar

### Temel Altyapı
- [x] 101 müşteri durağı, Leaflet harita
- [x] Hafta A/B x 5 gün rotası
- [x] Sürükle-bırak sıralama (Plan sayfası)
- [x] OpenStreetMap geocoding (fallback ile)
- [x] Rota Excel export (siparişlerle birlikte)
- [x] Adresler Excel export

### Sipariş ve Ödeme
- [x] Sipariş modalı (ürün, miktar, fiyat)
- [x] Ödeme yöntemi: Cash / Banka / Ödenmedi
- [x] Para üstü hesaplama
- [x] Günlük sipariş özeti (Plan sayfası)

### Müşteri Yönetimi
- [x] Stop CRUD (ekle/düzenle/sil)
- [x] Excel/CSV import (Adresler sayfası)
- [x] Kalıcı müşteri notları

### Borç Yönetimi
- [x] Borç takibi
- [x] Borç geçmişi sayfası
- [x] İşlem geçmişi (eklendi/ödendi)
- [x] Hızlı ödeme formu

### Analitik
- [x] Dashboard özet sayfası
- [x] Cash / Bank / Ödenmedi toplamları
- [x] Günlük durum bar'ları
- [x] Ürün bazlı satış sıralaması (top 15)
- [x] Bugün / Aylık period filtresi
- [x] Dashboard Excel rapor export (4 sheet)

### Navigasyon
- [x] "Diğer" popup menüsü (Adresler + Borçlar erişimi)

### Müşteri
- [x] Müşteri Profil sayfası (sipariş geçmişi, top ürünler, borç durumu)
- [x] Sipariş geçmişi (profil sayfasında tarih bazlı listeleme)

### Katalog
- [x] Global ürün kataloğu
- [x] Müşteriye özel fiyat override (stopCatalog) — altyapı + UI
- [x] Order modal'da katalog chip'leri
- [x] Müşteriye özel fiyat UI (stopCatOv modal)

### Plan Import
- [x] Excel (.xlsx/.xls) import
- [x] CSV import
- [x] JSON import
- [x] Önizleme (eşleşen/eşleşmeyen)
- [x] Sürükle-bırak veya dosya seç

### Sync
- [x] Supabase hybrid storage
- [x] Offline-first (localStorage önbellek)
- [x] Online sync (page load + online event)
- [x] Supabase kurulum UI (sync noktası)
- [x] Push all / Sync all butonları

---

## Bekleyen Özellikler

### Yüksek Öncelik

#### ~~1. Sipariş Geçmişi Sayfası~~ ✅ Tamamlandı
Müşteri Profil sayfasında (`page-profil`) sipariş geçmişi tarih bazlı listeleniyor.

---

#### ~~2. Müşteri Bazlı Stop Override UI~~ ✅ Tamamlandı
`stopCatOv` modalı ile müşteriye özel fiyat tanımlama UI eklendi.
- Adresler sayfasında "📋 Fiyat" butonu
- Sipariş modalında "Bu müşteriye özel fiyat ayarla →" linki
- Global katalogdan ürün seçip fiyat override tanımlama

---

#### 3. Rota Optimizasyonu
Şu an manuel sıralama var.

**Yapılacak:**
- Basit en yakın komşu algoritması ile otomatik sıralama
- Veya Google Maps / OSRM API entegrasyonu

---

#### 4. Haftalık/Aylık Ciro Grafiği
Dashboard'da sayılar var ama görsel grafik yok.

**Yapılacak:**
- Canvas/SVG çizgi grafik (CDN bağımlılığı olmadan)
- Haftalık bar chart
- Chart.js CDN ile geliştirilmiş versiyon

---

### Orta Öncelik

#### ~~5. Adresler Sayfasına Nav Erişimi~~ ✅ Tamamlandı
"Diğer" (⋯) popup menüsü ile Adresler ve Borçlar sayfalarına erişim sağlandı.

---

#### 6. Push Notification / Hatırlatıcı
Sabah belirli saatte "bugünün rotası" bildirimi.

**Teknik not:** PWA Service Worker gerektirir. Tek HTML dosyası için komplex.

---

#### 7. PWA Desteği
Uygulamayı telefona "yükle" özelliği.

**Yapılacak:**
- `manifest.json` (harici dosya gerekir → mimariyi bozar)
- Service Worker (harici dosya gerekir)
- **Seçenek:** Base64 inline manifest trick

---

#### ~~8. Aylık Kapanış Raporu~~ ✅ Tamamlandı
Dashboard'da "📥 Excel" butonu ile 4 sheet'li rapor export eklendi:
- Özet, Ürün Satışları, Müşteriler, Borçlar

---

#### ~~9. Müşteri Profil Sayfası~~ ✅ Tamamlandı
`page-profil` sayfası eklendi.
- Toplam sipariş geçmişi, ortalama sipariş tutarı
- Tercih ettiği ürünler (top 5)
- Borç durumu ve geçmişi
- Kalıcı notlar

---

### Düşük Öncelik

#### 10. Çoklu Kullanıcı / Ekip
Şu an tek kullanıcı (Yusuf). Ekip genişlerse:
- Supabase Auth entegrasyonu
- Row Level Security (her kullanıcı kendi verisini görür)
- "Bugün kim hangi rotada" paylaşımı

---

#### 11. WhatsApp Sipariş Özeti
Günün siparişlerini WhatsApp mesajı olarak formatla.

**Yapılacak:**
- "WhatsApp'a Gönder" butonu
- `wa.me/?text=...` deep link formatı
- Günlük özet mesaj şablonu

---

#### 12. Coğrafi Bölge Bazlı Sıralama
Mevcut posta kodu pill renkleri var ama coğrafi gruplama yok.

**Yapılacak:**
- Kent bölgesi / Londra bölgesi toggle
- Bölge bazlı dashboard filtresi

---

## Teknik Borçlar / İyileştirmeler

### Yüksek Öncelik
- [ ] **Orders veri büyümesi** — zamanla `orders` objesinin boyutu artacak. Supabase'de eski tarihleri arşivleme veya tarih bazlı ayrı satırlar
- [ ] **Error handling** — `syncFromSupabase` hata durumunda kullanıcıya görünür hata mesajı göster
- [ ] **Conflict resolution** — iki cihazda aynı anda değişiklik olursa son yazan kazanır (last-write-wins). Timestamp bazlı merge gerekebilir

### Orta Öncelik
- [ ] **Geocoding retry** — başarısız geocode'lar için retry mekanizması
- [ ] **Batch Supabase writes** — her `save.X()` ayrı HTTP isteği yapıyor. Debounce ile batch'le
- [ ] **Search performance** — 101 stop küçük, sorun değil; büyüyünce index gerekebilir
- [x] **~~Adresler/Borçlar navigasyon~~** — "Diğer" popup menüsü ile çözüldü

### Düşük Öncelik
- [ ] **Kod organizasyonu** — 3500+ satır tek dosya okunması zor. Comment section'ları iyi ama idealde modüler
- [ ] **CSS cleanup** — bazı inline style'lar CSS class'a taşınabilir
- [ ] **TypeScript** — tip güvenliği için; ama tek HTML dosyası mimarisini bozar

---

## Geliştirme Notları

### Yeni Özellik Eklerken Kontrol Listesi
1. `index.html` dosyasını düzenle
2. Brace/parantez dengesi kontrolü yap
3. State'e yeni key ekliyorsan:
   - `const S = {}` içine ekle
   - `const save = {}` içine ekle
   - `syncFromSupabase()` içinde reload'a ekle
4. Yeni sayfa ekliyorsan: HTML + showPage() + nav butonu
5. Türkçe UI metinleri kullan
6. Mobile-first düşün: küçük ekran, dokunmatik

### Test Edilmesi Gereken Senaryolar
- [ ] Offline iken sipariş kaydet → online ol → sync doğru mu?
- [ ] Telefonda kaydet → bilgisayarda sync → aynı veri mi?
- [ ] 50+ ürünlü katalog ile chip render hızı
- [ ] Aylık view'da 300+ sipariş ile dashboard performansı
