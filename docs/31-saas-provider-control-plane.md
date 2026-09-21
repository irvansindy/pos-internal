# SaaS Provider Control Plane

Tahap ini menyediakan area operasional lintas tenant untuk penyedia layanan.
Control plane terpisah dari sidebar dan layout toko agar konteks platform admin
tidak tercampur dengan konteks organisasi aktif.

## Cakupan

- Dashboard kondisi layanan: jumlah organisasi dan toko, subscription aktif,
  subscription yang perlu ditindak, invoice, pendapatan lunas bulan berjalan,
  serta permintaan paket custom.
- Direktori organisasi dengan pencarian dan filter status/paket.
- Detail tenant: anggota, toko, subscription, kuota efektif, invoice terakhir,
  dan audit tindakan provider.
- Intervensi status subscription menjadi aktif, ditangguhkan, atau dibatalkan.
- Pengelolaan katalog paket, kuota, harga bulanan/tahunan, dan status aktif.
- Review permintaan paket custom yang ikut tercatat dalam audit provider.
- Audit lintas tenant dengan filter tindakan, organisasi, admin, dan alasan.

## Keamanan dan audit

Semua route memakai middleware `platform.admin`. Flag `is_platform_admin`
sengaja tidak mass-assignable; pemberian akses dilakukan melalui perintah
`php artisan platform-admin:grant {email}`.

Perubahan status subscription dan katalog paket mewajibkan alasan. Setiap
perubahan menyimpan pelaku, organisasi bila ada, target, nilai sebelum/sesudah,
alamat IP, user agent, dan waktu. Keputusan paket custom juga masuk ke audit
yang sama. Tabel audit tidak memiliki endpoint update atau delete.

## Route

| Method | Path | Kegunaan |
| --- | --- | --- |
| `GET` | `/admin` | Dashboard provider |
| `GET` | `/admin/organizations` | Daftar dan filter tenant |
| `GET` | `/admin/organizations/{organization}` | Detail tenant |
| `PUT` | `/admin/organizations/{organization}/subscription-status` | Intervensi status subscription |
| `GET` | `/admin/plans` | Katalog paket |
| `PUT` | `/admin/plans/{plan}` | Perbarui paket |
| `GET` | `/admin/custom-plan-requests` | Permintaan paket custom |
| `PUT` | `/admin/custom-plan-requests/{customPlanRequest}` | Review paket custom |
| `GET` | `/admin/audits` | Audit tindakan provider |

## Deployment

Jalankan migration untuk membuat `platform_admin_audits`, lalu build aset
frontend. Akun provider pertama dapat diberikan akses dengan:

```bash
php artisan migrate --force
php artisan platform-admin:grant admin@example.com
npm run build
```

Midtrans QRIS POS tetap di luar tahap ini sesuai keputusan roadmap.
