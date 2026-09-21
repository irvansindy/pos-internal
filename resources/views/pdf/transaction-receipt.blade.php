<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Helvetica, sans-serif; color: #111; font-size: 10px; margin: 12px; }
        h1 { font-size: 16px; text-align: center; margin: 0 0 3px; }
        .center { text-align: center; } .muted { color: #666; } .line { border-top: 1px dashed #777; margin: 9px 0; }
        table { width: 100%; border-collapse: collapse; } td { padding: 2px 0; vertical-align: top; }
        .right { text-align: right; } .strong { font-weight: bold; } .total { font-size: 12px; }
    </style>
</head>
<body>
    <h1>{{ $transaction->team->name }}</h1>
    <div class="center muted">{{ $transaction->invoice_number }}<br>{{ $transaction->created_at->format('d/m/Y H:i') }}</div>
    <div class="line"></div>
    <table>
        @foreach ($transaction->items as $item)
            <tr><td colspan="2" class="strong">{{ $item->product_name }}</td></tr>
            <tr><td>{{ $item->quantity }} x Rp{{ number_format((float) $item->unit_price, 0, ',', '.') }}</td><td class="right">Rp{{ number_format((float) $item->line_total, 0, ',', '.') }}</td></tr>
        @endforeach
    </table>
    <div class="line"></div>
    <table>
        <tr><td>Subtotal</td><td class="right">Rp{{ number_format((float) $transaction->subtotal, 0, ',', '.') }}</td></tr>
        @if ((float) $transaction->discount_total > 0)<tr><td>Diskon</td><td class="right">-Rp{{ number_format((float) $transaction->discount_total, 0, ',', '.') }}</td></tr>@endif
        @if ((float) $transaction->tax_total > 0)<tr><td>Pajak</td><td class="right">Rp{{ number_format((float) $transaction->tax_total, 0, ',', '.') }}</td></tr>@endif
        <tr class="strong total"><td>Total</td><td class="right">Rp{{ number_format((float) $transaction->grand_total, 0, ',', '.') }}</td></tr>
        <tr><td>Bayar ({{ strtoupper((string) $transaction->payment_method) }})</td><td class="right">Rp{{ number_format((float) $transaction->paid_amount, 0, ',', '.') }}</td></tr>
        <tr><td>Kembalian</td><td class="right">Rp{{ number_format((float) $transaction->change_amount, 0, ',', '.') }}</td></tr>
    </table>
    <div class="line"></div>
    <div>Kasir: {{ $transaction->cashier?->name ?? '-' }}</div>
    @if ($transaction->customer_name)<div>Pelanggan: {{ $transaction->customer_name }}</div>@endif
    @if ($transaction->diningTable)<div>Meja: {{ $transaction->diningTable->name }}</div>@endif
    <p class="center strong">Terima kasih</p>
</body>
</html>
