# Treumarkt Kasa

Mobil öncelikli satış / gider / kâr takip uygulaması.
**Vanilla JS + Tailwind CDN** (build adımı yok) frontend, **Neon Postgres + Prisma + Vercel serverless functions** backend.

- Canlı: https://treumarkt-kasa.vercel.app
- Offline-first: bulut yokken bile LocalStorage ile çalışır
- PWA: telefonda "Ana Ekrana Ekle" → ikonla bağımsız uygulama
- Para birimi €, format `de-DE`, KDV %7

## Sahada kullanım

- **Kart Görünümü** — tek tap → onay sayfası → adet seç (+1/+5/+10) → SAT
- **Liste Görünümü** — her satırda sıra · alış · satış · stok · sat alanları, toplu kaydet
- **Son satışlar şeridi** — özet kutusunun altında son 5 satış; × ile tek tıkla geri al
- **Sales log** — sağ alttaki ≡ butonu, tüm satış geçmişi + tek tek silme
- **+ Yeni Ürün** — Liste görünümünden, ad/kategori/fiyatlar/ağırlık/sıra
- **Filtre** — Bugün / Hafta / Ay / Tümü / Özel
- **Ayarlar (⚙)** — JSON dışa/içeri aktar, aylık hedef, kasayı sıfırla

## Kurulum — yeni başlayan için

### 1. Neon Postgres aç (5 dk)
1. [neon.tech](https://neon.tech) → Sign up (Google ile, kart gerekmez)
2. **Create Project** → Name: `treumarkt-kasa`, Region: `Frankfurt (eu-central-1)`
3. Dashboard → **Connection Details** kartında iki string göreceksin:
   - **Pooled connection** (Transaction mode, `…-pooler.neon.tech`) → `DATABASE_URL`
   - **Direct connection** (`…neon.tech` — pooler kelimesi YOK) → `DIRECT_URL`
4. Bu iki URL'i Vercel'e ekle.

### 2. Vercel env vars
Vercel dashboard → Project `treumarkt-kasa` → Settings → Environment Variables. 3 değişken ekle:

| Key | Value | Environment |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | Production + Preview |
| `DIRECT_URL` | Neon direct connection string | Production + Preview |
| `APP_PASSWORD` | senin seçtiğin şifre (örn `treu2026`) | Production + Preview |

CLI ile alternatif:
```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add APP_PASSWORD production
```

### 3. Deploy
Repository'i Vercel'e bağlıysa `git push` otomatik tetikler. Manuel:
```bash
vercel deploy --prod
```
Build sırasında `prisma db push` çalışıp tabloları kurar. İlk açılışta `/api/seed` 36 ürünü yükler.

## Lokal geliştirme

```bash
git clone https://github.com/drpiha/treumarkt-kasa.git
cd treumarkt-kasa
npm install
cp .env.example .env
# .env'i kendi Neon URL'lerinle doldur
npx prisma db push          # tabloları oluştur
npx vercel dev              # http://localhost:3000
```

## Mimari kısa özet

```
┌──────────────┐
│ Browser/PWA  │ ← LocalStorage (anlık + offline)
└──────┬───────┘
       │ fetch /api/*   (Bearer: APP_PASSWORD)
       ▼
┌─────────────────────────┐
│ Vercel serverless       │
│ /api/state /api/sales … │
│ (Prisma client)         │
└──────┬──────────────────┘
       │ pg/SQL
       ▼
┌─────────────────────────┐
│ Neon Postgres           │
│ products, inventory,    │
│ sales_log, expenses,    │
│ targets                 │
└─────────────────────────┘
```

**Sync stratejisi:** mutasyon = local first, sonra arka planda API'ye. API yoksa sessizce sadece local. Boot'ta `/api/state` ile reconcile.

## Klasör yapısı

```
treumarkt-kasa/
├── index.html             # tüm UI + JS + Tailwind config
├── manifest.webmanifest   # PWA manifest
├── sw.js                  # Service worker (network-first HTML)
├── api/
│   ├── _lib/
│   │   ├── prisma.js      # singleton client
│   │   ├── auth.js        # Bearer auth
│   │   └── seed.js        # 36 ürün
│   ├── state.js           # GET
│   ├── sales.js           # POST + DELETE?id
│   ├── expenses.js
│   ├── products.js        # POST + PATCH?id + DELETE?id
│   ├── stock-on-hand.js   # PATCH bulk
│   ├── targets.js         # PUT?month + DELETE?month
│   ├── reset.js
│   └── seed.js
├── prisma/schema.prisma
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

## Güvenlik notları

- **APP_PASSWORD set etmezsen** API'ler herkese açık olur. Sadece kişisel test için. Üretimde mutlaka set.
- Token tarayıcıda `localStorage`'da. Cihaz başkasına gider, kasaya erişir.
- **HTTPS otomatik** (Vercel). HTTP üzerinden çalışmaz.
- "Kasayı Sıfırla" sales+expenses+inventory siler, **products dokunmaz**.
- Düzenli **JSON Export** alın (Ayarlar). DB silinse de elinde yedek olsun.

## Sorun giderme

- **Site açılıyor ama "Bulut hatası" toast'u** — DATABASE_URL eksik veya hatalı. Vercel logs'a bak.
- **Login overlay sürekli geliyor** — şifre yanlış, ya da APP_PASSWORD env değişkeni eksik (bu durumda overlay görünmemeli — `localStorage.removeItem('treumarkt_auth_token')` çalıştır)
- **36 ürün gelmedi** — `/api/seed` çağrısı atılmamış. Console'da `await fetch('/api/seed', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('treumarkt_auth_token') } })`
- **Deploy "db push skipped"** — DATABASE_URL Vercel'de set edilmemiş. Settings → Env Vars'tan ekle, yeniden deploy.

## Lisans

Özel — Treumarkt.
