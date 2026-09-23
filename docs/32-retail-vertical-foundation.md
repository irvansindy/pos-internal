# Vertikal Retail: Katalog, Satuan, Barcode, dan Batch

Tahap 4 memilih vertikal retail. Implementasi ini memperluas model produk dan
alur stok yang sudah ada tanpa membuat inventori kedua yang terpisah.

## Produk dan varian

Varian disimpan sebagai SKU produk tersendiri dengan `parent_product_id` dan
`variant_name`. Setiap varian tetap memiliki harga, biaya, stok, barcode, foto,
dan status aktif sendiri. Pendekatan ini membuat seluruh fitur lama seperti PO,
opname, paket, promosi, transfer, serta laporan tetap memakai `product_id` yang
sama dan tidak memerlukan jalur stok khusus.

## Multi-satuan dan barcode

- Produk memiliki `base_unit` dan barcode opsional.
- `product_units` menyimpan satuan penjualan alternatif, faktor konversi ke
  satuan dasar, harga jual, dan barcode sendiri.
- Katalog POS menampilkan satu baris jual untuk setiap satuan aktif.
- Barcode scanner dapat digunakan seperti keyboard: scan pada kolom pencarian
  lalu tekan Enter.
- Transaksi menyimpan snapshot nama satuan, faktor konversi, dan jumlah satuan
  dasar. Perubahan konfigurasi produk tidak mengubah histori penjualan.
- Pengurangan stok selalu memakai satuan dasar. Contoh: penjualan 2 dus dengan
  isi 12 mengurangi 24 pcs.

## Batch dan kedaluwarsa

Produk dapat mengaktifkan `tracks_batches`. Saldo awal dicatat sebagai batch
`SALDO-AWAL`; penerimaan PO meminta nomor batch dan tanggal kedaluwarsa. Stok
keluar dialokasikan otomatis dengan FEFO: batch bertanggal paling dekat dipakai
lebih dahulu, lalu batch tanpa tanggal. Batch yang sudah kedaluwarsa tidak dapat
dipakai untuk penjualan walaupun tetap ditampilkan agar staf dapat menindakinya.

`inventory_batch_movements` menghubungkan setiap perubahan batch ke
`product_stock_movements`, sehingga saldo produk dan jejak batch dapat diaudit
bersama. Halaman PO & Stok Opname menampilkan batch aktif beserta tanggal
kedaluwarsanya.

## Kelanjutan tahap ini

Serial number, gudang/bin, purchase invoice, hutang, landed cost, retur supplier,
dan transfer batch eksplisit diteruskan pada
`docs/33-advanced-inventory-procurement.md`.

## Keputusan antarmuka

Design Read: antarmuka operasional retail untuk owner dan staf inventori,
mengikuti bahasa visual POS yang sudah ada, dengan ENERGY 1 / RHYTHM 1 /
MOTION 1.

- Form produk tetap menjadi titik pengelolaan varian dan satuan agar pengguna
  tidak berpindah konteks untuk satu SKU.
- Barcode dan satuan diletakkan dekat identitas SKU karena ketiganya menentukan
  cara item dikenali di kasir.
- Batch ditampilkan di halaman penerimaan karena nomor batch berasal dari barang
  fisik yang datang, bukan dari transaksi penjualan.
- Tidak ada animasi atau dekorasi baru; fokus layar tetap pada input dan status
  stok yang dapat ditindak.

## Deployment

```bash
php artisan migrate --force
npm run build
```

Konfigurasi Nginx menaikkan buffer FastCGI untuk menampung header preload Vite
pada halaman POS production. Tanpa buffer tersebut, build production dapat
menghasilkan respons 502 walaupun controller selesai dengan status 200.

Test regresi retail berada di `tests/Feature/RetailVerticalTest.php`.
