# Roadmap Operasional Pasca-Perbandingan Majoo

Dokumen ini mencatat implementasi roadmap non-Midtrans pada 9 September
2026. Sprint A (Midtrans QRIS transaksi POS) sengaja belum dikerjakan sampai
akun dan kredensial Midtrans tersedia.

## Status

| Sprint | Status | Implementasi |
|---|---|---|
| B | Selesai | Dashboard organization: omzet hari/minggu/bulan, tren 30 hari, ranking dan tautan toko |
| C | Selesai secara kode | PDF thermal, download, email attachment, adapter WhatsApp Fonnte |
| D | Selesai | Pending → in transit → received/canceled, movement dua toko, matching/auto-create produk via SKU |
| E | Selesai | Supplier, PO, penerimaan partial/full, update cost, opname dan movement adjustment |
| F | Selesai | Master pelanggan, pencarian/tambah dari POS, earn/redeem ledger, snapshot kontak transaksi |
| G | Selesai (opsional) | Grid meja, available/reserved/occupied, open order Rp0, auto-release saat lunas/void |

## Keputusan Desain Penting

### Isolasi tenant

- Data operasional toko selalu di-scope dengan `team_id`.
- Transfer hanya boleh memakai dua Team dari `organization_id` yang sama.
- Controller tidak mempercayai ID dari form; produk, pelanggan, meja,
  supplier, PO, dan transaksi di-resolve ulang dalam scope aktif.
- Owner dan manager organization dapat mengoperasikan transfer; seluruh
  perubahan mencatat user pelaku.

### SKU lintas toko

Constraint lama `products.sku UNIQUE` bersifat global dan bertentangan dengan
transfer antar toko. Constraint diubah menjadi `UNIQUE(team_id, sku)`. Saat
transfer diterima, produk tujuan dicari dengan SKU yang sama. Jika belum ada,
produk dibuat dari snapshot master asal dengan kategori kosong, karena kategori
tetap merupakan data milik masing-masing toko.

### Konsistensi stok

Tidak ada fitur baru yang menulis `products.stock` secara diam-diam. Transfer,
penerimaan PO, dan opname memakai `AdjustProductStockAction` sehingga selalu
menghasilkan `product_stock_movements` dengan `reference_type` dan
`reference_id`. Operasi mutasi dibungkus database transaction dan baris utama
dikunci sebelum perubahan status.

### Loyalti

Default earn adalah 1 poin per Rp10.000 dan nilai redeem Rp100 per poin. Nilai
ini dapat diubah lewat:

```env
LOYALTY_SPEND_PER_POINT=10000
LOYALTY_POINT_VALUE=100
```

Poin baru diberikan ketika transaksi berstatus `paid`, bukan ketika masih
unpaid/partial. Ledger memakai unique guard per transaksi dan tipe agar callback
pelunasan ulang tidak menggandakan poin. Void membalikkan dampak poin dan akan
ditolak jika poin hasil transaksi sudah terpakai sehingga saldo tidak menjadi
negatif.

### Pesanan meja

Transaksi biasa tetap wajib memiliki pembayaran lebih dari nol. Hanya transaksi
yang memilih meja yang boleh dibuat dengan pembayaran Rp0 sebagai open order.
Meja menjadi `occupied`, lalu otomatis kembali `available` ketika transaksi
lunas atau di-void. Request baru ke meja occupied ditolak di dalam transaction
lock untuk mencegah double booking.

## Struk Digital

Download PDF dan email dapat langsung dipakai setelah mailer Laravel
dikonfigurasi. WhatsApp memakai Fonnte:

```env
FONNTE_TOKEN=token-perangkat
FONNTE_ENDPOINT=https://api.fonnte.com/send
```

Adapter mengirim file PDF secara multipart sehingga tidak memerlukan URL publik.
Tanpa token, endpoint mengembalikan validation error yang dapat ditampilkan ke
kasir. Pengiriman nyata tetap perlu diuji menggunakan akun/device Fonnte;
automated test memakai HTTP fake dan tidak membuktikan koneksi provider.

## Deployment

```bash
php artisan migrate
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=MenuSeeder
php artisan db:seed --class=UserSeeder
npm run build
```

MenuSeeder diperlukan agar tiga menu team baru muncul pada database yang sudah
ada: `PO & Stok Opname`, `Pelanggan & Loyalti`, dan `Manajemen Meja`.
UserSeeder menyinkronkan permission baru ke role demo. Pada production, admin
harus meninjau assignment role yang dibuat pengguna.

Docker Compose juga menyediakan service `queue` dan `scheduler`:

```bash
docker compose up -d --build
```

## Verifikasi Otomatis

`tests/Feature/RoadmapOperationsTest.php` mencakup agregasi multi-toko,
lifecycle transfer, PO partial/full, opname, earn/redeem poin, lifecycle meja,
PDF/email, dan request Fonnte. Semua feature test sekarang memakai
`RefreshDatabase`; sebelumnya full suite dapat gagal `no such table` tergantung
urutan eksekusi. Middleware settings team juga sudah diperbaiki agar membaca
parameter `{team}` alih-alih selalu mengharapkan `{current_team}`.

## Pekerjaan yang Sengaja Tersisa

- Sprint A Midtrans QRIS POS.
- Uji kirim WhatsApp nyata dan pemilihan paket Fonnte yang mendukung attachment.
- Pengiriman email/WhatsApp via queue untuk volume besar; implementasi awal masih
  sinkron agar failure langsung terlihat kasir.
- Observability query dashboard dan materialized summary bila volume transaksi
  sudah membuat agregasi langsung melewati target latency.
- Split tender/riwayat pembayaran detail masih memerlukan tabel payment terpisah
  dan paling tepat dikerjakan bersamaan dengan Sprint A.

## Temuan Review Project

- Fondasi Action class, organization/team separation, dan stock movement audit
  sudah tepat untuk meneruskan roadmap tanpa membuat service monolitik.
- Registrasi sebelumnya bergantung pada `PlanSeeder`, padahal script setup hanya
  menjalankan migration. `Plan::defaultBasic()` sekarang membuat fallback aman
  sehingga registrasi tetap bekerja pada database baru.
- Route settings bertipe `{team}` sebelumnya diproses middleware yang hanya
  memahami `{current_team}` dan selalu redirect. Kedua bentuk route sekarang
  ditangani dengan membership check yang sama.
- TypeScript check sebelumnya tidak bisa mulai karena `ignoreDeprecations: 6.0`
  tidak valid untuk TypeScript 5.9 yang terpasang; nilainya diselaraskan ke 5.0.
- Build production berhasil, tetapi menghasilkan warning initial app chunk sekitar
  552 kB. Code splitting layak menjadi pekerjaan performance berikutnya.
- Quality gate frontend lama belum hijau secara repository-wide: Prettier masih
  menemukan 26 file lama dan ESLint menemukan pelanggaran pada file di luar
  perubahan roadmap. File baru/yang relevan sudah lolos targeted lint, tetapi
  baseline lama perlu dibersihkan dalam PR terpisah agar diff fitur tidak tercampur.
