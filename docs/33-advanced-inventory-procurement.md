# Inventori Lanjutan dan Procurement

Tahap ini melanjutkan fondasi retail dengan satu ledger stok produk yang sama.
Gudang, batch, dan serial memberi dimensi fisik pada stok; purchase invoice,
pembayaran, landed cost, dan retur supplier melengkapi siklus procurement.

## Gudang dan bin

Setiap toko memiliki gudang `UTAMA` dan bin `DEFAULT` sebagai lokasi kompatibel
untuk stok lama. Pengguna dapat menambah gudang dan bin dari halaman Inventori &
Pembelian. Setiap mutasi stok menghasilkan saldo dan histori lokasi per produk,
bin, serta batch bila produk melacak batch.

Saldo produk tetap menjadi total cepat yang dipakai modul lama. Saldo lokasi,
batch, dan serial merupakan rincian yang harus merekonsiliasi total tersebut.

## Serial number

- Opsi **Lacak serial number per unit** tersedia pada produk.
- Penerimaan PO meminta tepat satu serial unik untuk setiap unit yang diterima.
- POS meminta serial tersedia sejumlah stok satuan dasar yang dijual dan
  menyimpan snapshot serial pada item transaksi.
- Return pelanggan hanya dapat memulihkan serial yang berasal dari item
  transaksi tersebut dan masih berstatus terjual.
- Void mengembalikan serial ke batch dan bin asal.
- Retur supplier memindahkan serial dari `in_stock` menjadi `returned`.
- Transfer antartoko memakai serial yang dipilih dan memperbarui kepemilikan
  toko, produk tujuan, batch tujuan, serta bin tujuan.

Produk serial tidak dapat dijual melalui paket atau promosi yang tidak memiliki
input pemilihan serial. Validasi server menolak transaksi tersebut agar identitas
unit tidak hilang.

## Purchase invoice dan hutang supplier

Purchase invoice dibuat dari kuantitas PO yang sudah diterima tetapi belum
ditagihkan. Kombinasi nomor invoice supplier dijaga unik per supplier dan toko.
Saldo hutang dihitung dari:

`subtotal + landed cost - retur supplier - pembayaran`

Status invoice berubah otomatis menjadi `unpaid`, `partial`, atau `paid`.
Pembayaran disimpan sebagai ledger terpisah dengan tanggal, metode, referensi,
dan pengguna pencatat.

## Landed cost

Biaya seperti pengiriman, asuransi, atau bea dapat dialokasikan berdasarkan
nilai atau kuantitas item. Setiap alokasi:

1. menambah saldo hutang invoice;
2. menyimpan rincian alokasi per item; dan
3. memperbarui harga modal produk berdasarkan biaya per unit hasil alokasi.

## Retur supplier

Retur dibuat dari item purchase invoice. Pengguna memilih jumlah, batch, bin,
dan serial bila relevan. Proses ini mengurangi stok fisik dan nilai hutang.
Jumlah retur tidak boleh melebihi jumlah invoice yang belum pernah diretur.

## Transfer batch eksplisit antartoko

Transfer produk batch mewajibkan alokasi batch, bin asal, bin tujuan, dan jumlah.
Saldo bin diverifikasi sebelum dokumen dibuat. Untuk produk berserial, pilihan
serial harus tepat sama dengan alokasi batch dan bin.

Saat dikirim, stok asal berkurang dan serial menjadi `in_transit`. Saat diterima,
batch bernomor dan bertanggal kedaluwarsa sama dibuat atau diperbarui di produk
tujuan, kemudian serial dipindahkan ke batch serta bin tujuan.

## Batas tahap

- QRIS belum diimplementasikan dan tetap ditahan sampai payment gateway dipilih.
- Approval bertingkat untuk invoice, retur supplier, dan pembayaran belum ada.
- Aging hutang tersedia dari tanggal jatuh tempo dan saldo invoice, tetapi belum
  memiliki laporan bucket 30/60/90 hari khusus.
- Koreksi serial manual dan cycle count per bin belum memiliki workflow khusus.

## Deployment dan verifikasi

```bash
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder --force
php artisan db:seed --class=MenuSeeder --force
npm run build
php artisan test
```

Regresi utama berada di `tests/Feature/AdvancedInventoryProcurementTest.php`.
