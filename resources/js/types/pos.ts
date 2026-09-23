// ─── Catalogue ────────────────────────────────────────────────────────────────

export interface PosCategory {
    id: number | string;
    name: string;
}

export interface PosItem {
    id: number | string;
    item_id: number;
    item_type: 'product' | 'package' | 'promotion';
    unit_id?: number | null;
    unit_name?: string;
    unit_conversion?: number;
    barcode?: string | null;
    sku: string;
    name: string;
    image_url?: string | null;
    price: string;
    stock: number;
    min_stock: number;
    tracks_serials?: boolean;
    available_serials?: { id: number; serial_number: string }[];
    category?: PosCategory | null;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
    product: PosItem;
    quantity: number;
    serial_ids: number[];
}

// ─── Voucher ──────────────────────────────────────────────────────────────────

export interface AppliedVoucher {
    id: number;
    code: string;
    name: string;
    type: 'fixed' | 'percent';
    value: string;
    discount_total: number;
}

export interface VoucherSummary {
    id: number;
    code: string;
    name: string;
    type: 'fixed' | 'percent';
    value: string;
}

export interface AvailableVoucher extends VoucherSummary {
    min_purchase: string;
    max_discount: string | null;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentMethod {
    value: string;
    label: string;
}

export interface PosCustomer {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    points_balance: number;
}

export interface PosDiningTable {
    id: number;
    name: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved';
}

// ─── Recent Transactions ──────────────────────────────────────────────────────

export interface RecentTransactionItem {
    id: number;
    product_name: string;
    product_sku: string | null;
    unit_price: string;
    quantity: number;
    unit_name?: string | null;
    unit_conversion?: number;
    base_quantity?: number | null;
    discount_total: string;
    line_total: string;
}

export interface RecentTransaction {
    id: number;
    invoice_number: string;
    customer_name: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
    customer_id?: number | null;
    dining_table_id?: number | null;
    status: 'pending' | 'completed' | 'void';
    payment_status: 'unpaid' | 'partial' | 'paid';
    payment_method: string | null;
    subtotal: string;
    discount_total: string;
    points_redeemed?: number;
    points_discount_total?: string;
    tax_total?: string;
    grand_total: string;
    paid_amount: string;
    change_amount: string;
    created_at: string;
    void_reason?: string | null;
    cashier?: { id: number; name: string } | null;
    voucher?: VoucherSummary | null;
    items: RecentTransactionItem[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
    transactions_today?: number;
    revenue_today?: number;
    transactions_month?: number;
    revenue_month?: number;
    pending_transactions?: number;
    total_products?: number;
    low_stock_products?: number;
    total_members?: number;
}

export interface DashboardTopProduct {
    product_name: string;
    total_qty: number;
    total_revenue: number;
}
