# Operasional Kasir Harian

Modul ini mengelola siklus uang tunai per kasir dan per toko, mulai dari modal awal sampai rekonsiliasi saat shift ditutup.

## Alur operasional

1. Kasir membuka shift dan mengisi modal awal sesuai uang yang tersedia di laci.
2. Pembayaran dari POS dicatat ke `transaction_payments` dan dihubungkan ke shift aktif.
3. Kasir mencatat uang yang masuk atau keluar di luar transaksi penjualan.
4. Refund dan return tunai yang dilakukan saat shift aktif mengurangi perkiraan kas.
5. Kasir menghitung uang fisik, mengisi hasil hitung, lalu menutup shift.
6. Sistem menyimpan kas yang diharapkan, kas yang dihitung, dan selisih sebagai snapshot penutupan.

Pembayaran POS dengan nominal lebih dari nol ditolak jika pengguna tidak memiliki shift aktif. Pesanan meja tanpa pembayaran tetap dapat dibuat, kemudian pelunasannya mensyaratkan shift aktif.

## Perhitungan rekonsiliasi

```text
kas diharapkan = modal awal
                + pembayaran tunai
                + kas masuk
                - refund dan return tunai
                - kas keluar

selisih = kas fisik terhitung - kas diharapkan
```

Pembayaran dari transaksi yang sudah di-void tidak dihitung. Nilai pembayaran pada ledger menggunakan nominal yang diterapkan ke tagihan, sehingga uang kembalian tidak menambah kas yang diharapkan.

## Hak akses

- `cashier-shift.view`: melihat operasional dan riwayat shift sendiri.
- `cashier-shift.open`: membuka shift.
- `cashier-shift.manage`: mencatat kas masuk dan kas keluar.
- `cashier-shift.close`: menutup dan merekonsiliasi shift sendiri.
- `cashier-shift.view-all`: melihat riwayat seluruh kasir dalam toko.

Owner melewati pemeriksaan permission sesuai aturan akses proyek. Role admin memperoleh seluruh permission modul. Role kasir memperoleh permission untuk mengelola shift sendiri.

## Isolasi dan konsistensi data

- Seluruh shift, pergerakan kas, dan pembayaran menyimpan `team_id`.
- Mutasi shift hanya diizinkan untuk pengguna pemilik shift pada toko aktif.
- `open_guard` memiliki unique index untuk mencegah dua shift aktif milik kasir yang sama pada toko yang sama, termasuk saat request bersamaan.
- Penutupan mengunci row shift dan menyimpan snapshot agregat agar laporan lama tidak berubah saat data baru masuk.

## Keputusan antarmuka

Design Read: halaman operasional internal untuk kasir, mengikuti bahasa visual POS yang sudah ada, dengan ENERGY 1 / RHYTHM 1 / MOTION 1.

- Warna netral mempertahankan konsistensi aplikasi, sedangkan aksen gelap hanya menandai tindakan utama.
- Status shift dan perkiraan kas menjadi fokus pertama karena menentukan apakah kasir boleh menerima pembayaran.
- Form pergerakan dan penutupan dipisahkan untuk mengurangi risiko kasir menutup shift saat hendak mencatat pengeluaran.
- Ringkasan menggunakan kartu kecil karena setiap nilai adalah komponen langsung dari rumus rekonsiliasi.
- Riwayat berubah menjadi kartu pada layar kecil agar tidak memaksa tabel lebar dan horizontal scroll.
- Motion dibatasi pada state bawaan kontrol karena halaman digunakan berulang kali selama jam operasional.

## Route

| Method | Path | Kegunaan |
| --- | --- | --- |
| `GET` | `/{current_team}/cashier-operations` | Halaman shift aktif dan riwayat |
| `POST` | `/{current_team}/cashier-operations/open` | Membuka shift |
| `POST` | `/{current_team}/cashier-operations/{cashierShift}/movements` | Mencatat kas masuk atau keluar |
| `POST` | `/{current_team}/cashier-operations/{cashierShift}/close` | Menutup dan merekonsiliasi shift |
