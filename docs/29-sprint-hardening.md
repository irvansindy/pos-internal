# Sprint Hardening

Sprint ini menutup jalur yang dapat mengubah paket tanpa pembayaran, merusak
stok, atau mencampur data antartoko. Midtrans QRIS untuk transaksi POS tetap di
luar lingkup sampai kredensial akun tersedia.

## Perubahan

- Endpoint `settings/organization/upgrade` dihapus. Upgrade paket standar wajib
  melalui checkout dan konfirmasi webhook Midtrans.
- CSRF aktif kembali untuk user, invitation, dan role. Hanya webhook Midtrans
  yang dikecualikan karena memakai verifikasi signature.
- Hapus transaksi dari halaman manajemen sekarang menjalankan void. Record
  transaksi dan audit trail tetap tersimpan; stok, voucher, poin, dan meja
  dipulihkan dalam satu transaksi database.
- Refund dibatasi oleh nilai yang benar-benar sudah dibayar. Refund dan return
  yang disetujui memakai satu batas saldo agar total pengembalian tidak melebihi
  pembayaran pelanggan.
- Return hanya berlaku untuk transaksi selesai yang sudah menerima pembayaran.
  Nilai refund return tidak boleh melebihi nilai item.
- Refund dan return yang sudah disetujui tidak dapat dihapus. Transaksi yang
  sudah memiliki salah satunya tidak dapat di-void.
- Validasi paket dan promosi menolak kategori atau produk milik tenant lain.
  Unique index SKU paket dan nama kategori sekarang memakai scope `team_id`.
- Permission kategori diselaraskan ke format `product.category.*`. Permission
  pelanggan, meja, dan operasional stok dipisahkan dari permission transaksi.
- Docker Compose menjalankan `queue` dan `scheduler` agar job serta lifecycle
  subscription tidak bergantung pada proses manual.

## Deployment

```bash
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder --force
php artisan db:seed --class=MenuSeeder --force
```

Tinjau assignment custom role setelah permission baru dibuat. Environment demo
dapat menjalankan `UserSeeder` untuk menyinkronkan role admin, kasir, dan waiter.

## Verifikasi

```bash
composer ci:check
npm run build
docker compose config --quiet
```

`tests/Feature/HardeningTest.php` mencakup batas refund, interaksi refund dan
return, immutability record keuangan, void transaksi, voucher, isolasi tenant,
serta konsistensi permission kategori.
