# CLAUDE.md — Costadoro Route CRM

> Bu dosya Claude Code için hazırlanmıştır. Projeye devam etmeden önce bu dosyayı ve referans verilen diğer MD dosyalarını oku.

---

## Projeye Genel Bakış

**Costadoro Routes** — Costadoro Coffee markalı kahve dağıtımı için geliştirilmiş, tek HTML dosyasından oluşan mobil öncelikli rota yönetim uygulaması.

- **Sahip:** Yusuf (işletme sahibi, geliştirici değil — "vibe coding" yaklaşımı)
- **Kullanım:** Saha'da telefon + ofiste bilgisayar
- **Dil:** Türkçe UI, İngilizce kod
- **Teknoloji:** Vanilla HTML/CSS/JS + Leaflet.js + Supabase

**Tek dosya mimarisi** — her şey `index.html` içinde:
- CSS (satır 9–350)
- HTML sayfaları (satır 352–897)
- JavaScript (satır 900–3013)

---

## Dosya Yapısı

```
index.html              ← Tek kaynak dosya, tüm uygulama burada (~3013 satır)
CLAUDE.md               ← Bu dosya (Claude Code talimatları)
PROJECT.md              ← Proje detayları, mimari, veri yapıları
FEATURES.md             ← Tüm özellikler ve fonksiyon referansı
ROADMAP.md              ← Yapılacaklar ve geliştirme fikirleri
README.md               ← Kısa proje açıklaması
```

---

## Kritik Geliştirme Kuralları

### 1. Tek Dosya — Her Zaman
Asla ayrı `.js`, `.css` veya `.html` dosyası oluşturma. Her şey `index.html` içinde kalmalı.

### 2. Brace Dengesi Kontrolü
Her değişiklikten sonra JS'in brace/parantez dengesini kontrol et:
```python
# Hızlı kontrol:
js_content.count('{') == js_content.count('}')
```
**Geçmişte bu hata projeyi tamamen çökertti** — `clearDebt()` fonksiyonunun kapanış `}` eksikti.

### 3. localStorage + Supabase Hybrid Storage
`lsSave(key, value)` → hem localStorage'a hem Supabase'e yazar.
`lsGet(key, default)` → sadece localStorage'dan okur (hız için).
`syncFromSupabase()` → Supabase'den çekip localStorage'ı günceller.

**Asla `localStorage.setItem()` direkt kullanma** — her zaman `lsSave()` / `lsGet()` kullan.

### 4. State Değişikliklerinde Save Çağır
```js
S.debts[stopId] = yeniDeger;
save.debts();  // ← MUTLAKA çağır
```

### 5. Yeni Sayfa Ekleme
Yeni sayfa eklerken 3 şeyi güncelle:
1. HTML'de `<div class="page" id="page-ISIM">` ekle
2. `showPage()` fonksiyonuna `if(name==='ISIM') renderISIM();` ekle
3. Nav'a `<button class="ni" id="nav-ISIM">` ekle (eğer ana navigasyona dahil edilecekse)

**Not:** Şu an sadece 5 sayfa ana navigasyonda: map, rota, plan, dash, katalog. Adresler ve borçlar sayfaları mevcut ama alt nav'da butonu yok — diğer sayfalardan link ile erişilir.

### 6. Türkçe UI
Tüm kullanıcıya görünen metinler Türkçe olmalı. Kod yorumları İngilizce veya Türkçe olabilir.

---

## Supabase Bilgileri

```
Project: ClientRotaCrm
URL: https://mvvvqloqwjimlbqeotsd.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnZxbG9xd2ppbWxicWVvdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTYxMDAsImV4cCI6MjA4NzkzMjEwMH0.tKSiEJouyr9dhs_vIAPUbX9NqtAsFAslZroNKtG2mBk

Tablo: cr4_store (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)
RLS: kapalı (DISABLE ROW LEVEL SECURITY)
```

Tablo SQL:
```sql
DROP TABLE IF EXISTS cr4_store;
CREATE TABLE cr4_store (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cr4_store DISABLE ROW LEVEL SECURITY;
```

---

## Bağımlılıklar (CDN)

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:...">

<!-- JS (script tag ile, body sonunda) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js">
```

Supabase SDK kullanılmıyor — saf `fetch()` ile REST API çağrısı yapılıyor.

---

## Hızlı Başlangıç Kontrol Listesi

Claude Code'un projeye başlamadan önce yapması gerekenler:

- [ ] `PROJECT.md` oku — mimari ve veri yapılarını anla
- [ ] `FEATURES.md` oku — mevcut tüm özellikleri öğren
- [ ] `ROADMAP.md` oku — planlanmış özellikleri gör
- [ ] `index.html` dosyasını incele
- [ ] Değişiklik yapmadan önce brace dengesi kontrolü yap
- [ ] Her değişiklik sonrası HTML dosyasını kaydet ve test et
