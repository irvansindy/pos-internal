<p>Halo {{ $transaction->customer_name ?: 'Pelanggan' }},</p>
<p>Terima kasih sudah bertransaksi di {{ $transaction->team->name }}. Struk {{ $transaction->invoice_number }} terlampir dalam format PDF.</p>
<p>Salam,<br>{{ $transaction->team->name }}</p>
