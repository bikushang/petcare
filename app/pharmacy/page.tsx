'use client';

import { useMemo, useState } from 'react';
import {
  Pill, Plus, AlertTriangle, Package, Edit2, Trash2, Minus, Search,
  Truck, ShoppingCart, HandHeart, Receipt, Barcode, QrCode, ShieldCheck,
  ChevronDown, ChevronUp, X, Clock, TrendingDown, RotateCcw, FileText,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, inputCls, Select, DateInput, NumberInput, Textarea, Badge } from '../components/ui';
import {
  useDB, MedStock, Supplier, Purchase, PurchaseItem, PharmacySale, SaleItem, Batch,
  newId, today,
} from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateInventoryForecast } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const categories = ['Medicine', 'Vaccine', 'Supplement', 'Consumable', 'Equipment', 'Food'] as const;
const purchaseStatuses = ['Draft', 'Ordered', 'Partially received', 'Received', 'Cancelled'] as const;
const saleStatuses = ['Completed', 'Refunded', 'Pending'] as const;
const paymentMethods = ['Cash', 'Card', 'Transfer', 'Insurance'] as const;
const pharmacistNames = ['Nadia Hassan', 'Grace Tan', 'Oscar Mbeki'];

type Tab = 'inventory' | 'suppliers' | 'purchases' | 'dispensing' | 'sales';

const blankBatch = (): Batch => ({ id: '', batchNumber: '', quantity: 0, expiry: '', receivedDate: '', supplierId: '', costPerUnit: 0 });
const blankPurchaseItem = (): PurchaseItem => ({ id: '', stockItemId: '', itemName: '', batchNumber: '', expiry: '', quantity: 0, unit: '', unitCost: 0, lineTotal: 0 });
const blankSaleItem = (): SaleItem => ({ id: '', stockItemId: '', itemName: '', quantity: 0, unit: '', unitPrice: 0, discount: 0, lineTotal: 0 });

const blankMedForm = () => ({
  name: '', category: 'Medicine' as MedStock['category'], stock: '', unit: '', reorderLevel: '', reorderQty: '',
  price: '', barcode: '', qrCode: '', genericName: '', manufacturer: '', supplier: '', supplierId: '',
  dosageForm: '', strength: '', dosageInfo: '', activeIngredients: '', storageCondition: '',
  prescriptionRequired: false, controlledDrug: false,
  batches: [] as Batch[], batch: '', expiry: '',
});

const blankSupplierForm = () => ({
  name: '', code: '', contactPerson: '', phone: '', email: '', address: '', category: '',
  paymentTerms: '', leadTimeDays: '', notes: '',
});

const blankPurchaseForm = () => ({
  poNumber: '', supplierId: '', date: today(), receivedDate: '',
  items: [] as PurchaseItem[], subtotal: 0, tax: 0, discount: 0, total: 0,
  status: 'Draft' as Purchase['status'], notes: '',
});

const blankSaleForm = () => ({
  saleNumber: '', date: today(), customerName: '', petName: '', ownerId: '',
  items: [] as SaleItem[], subtotal: 0, tax: 0, discount: 0, total: 0,
  paymentMethod: 'Cash' as PharmacySale['paymentMethod'], status: 'Completed' as PharmacySale['status'],
  dispensedBy: pharmacistNames[0], notes: '',
});

export default function PharmacyPage() {
  const { db, create, update, remove } = useDB();
  const [tab, setTab] = useState<Tab>('inventory');

  // Inventory state
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [medOpen, setMedOpen] = useState(false);
  const [editMed, setEditMed] = useState<MedStock | null>(null);
  const [medForm, setMedForm] = useState(blankMedForm());
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  // Supplier state
  const [supOpen, setSupOpen] = useState(false);
  const [editSup, setEditSup] = useState<Supplier | null>(null);
  const [supForm, setSupForm] = useState(blankSupplierForm());

  // Purchase state
  const [purOpen, setPurOpen] = useState(false);
  const [editPur, setEditPur] = useState<Purchase | null>(null);
  const [purForm, setPurForm] = useState(blankPurchaseForm());

  // Sale state
  const [saleOpen, setSaleOpen] = useState(false);
  const [editSale, setEditSale] = useState<PharmacySale | null>(null);
  const [saleForm, setSaleForm] = useState(blankSaleForm());

  // Adjust state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustMed, setAdjustMed] = useState<MedStock | null>(null);
  const [adjustForm, setAdjustForm] = useState({ qty: '', reason: '', type: 'Addition' as 'Addition' | 'Removal' | 'Damage' | 'Return' });
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  // ---- Inventory ----
  const setMed = (k: string, v: string | number | boolean) => setMedForm((f) => ({ ...f, [k]: v }));

  const items = useMemo(() => {
    if (!db) return [];
    const q = search.toLowerCase();
    return db.medStock.filter((m) => {
      const matchesFilter = filter === 'all' || m.category === filter;
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q) || (m.supplier || '').toLowerCase().includes(q) || (m.batch || '').toLowerCase().includes(q) || (m.barcode || '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [db, filter, search]);

  const lowStock = db?.medStock.filter((m) => m.stock <= m.reorderLevel) ?? [];
  const expiringSoon = db?.medStock.filter((m) => {
    if (!m.expiry) return false;
    const days = Math.ceil((new Date(m.expiry).getTime() - Date.now()) / 86400000);
    return days <= 90 && days >= 0;
  }) ?? [];
  const expired = db?.medStock.filter((m) => {
    if (!m.expiry) return false;
    return new Date(m.expiry) < new Date();
  }) ?? [];

  const openNewMed = () => {
    setEditMed(null);
    setMedForm({ ...blankMedForm(), barcode: `BC-${Date.now().toString().slice(-6)}`, qrCode: `QR-${Date.now().toString().slice(-6)}` });
    setMedOpen(true);
  };

  const openEditMed = (m: MedStock) => {
    setEditMed(m);
    setMedForm({
      name: m.name, category: m.category, stock: String(m.stock), unit: m.unit,
      reorderLevel: String(m.reorderLevel), reorderQty: String(m.reorderQty || 0),
      price: String(m.price), barcode: m.barcode || '', qrCode: m.qrCode || '',
      genericName: m.genericName || '', manufacturer: m.manufacturer || '', supplier: m.supplier || '',
      supplierId: m.supplierId || '', dosageForm: m.dosageForm || '', strength: m.strength || '',
      dosageInfo: m.dosageInfo || '', activeIngredients: m.activeIngredients || '',
      storageCondition: m.storageCondition || '', prescriptionRequired: m.prescriptionRequired || false,
      controlledDrug: m.controlledDrug || false,
      batches: (m.batches || []).map((b) => ({ ...b })),
      batch: m.batch || '', expiry: m.expiry || '',
    });
    setMedOpen(true);
  };

  const saveMed = () => {
    if (!medForm.name) return;
    const data = {
      name: medForm.name, category: medForm.category, stock: parseInt(medForm.stock) || 0,
      unit: medForm.unit || 'unit', reorderLevel: parseInt(medForm.reorderLevel) || 0,
      reorderQty: parseInt(medForm.reorderQty) || 0, price: parseFloat(medForm.price) || 0,
      barcode: medForm.barcode, qrCode: medForm.qrCode, genericName: medForm.genericName,
      manufacturer: medForm.manufacturer, supplier: medForm.supplier, supplierId: medForm.supplierId,
      dosageForm: medForm.dosageForm, strength: medForm.strength, dosageInfo: medForm.dosageInfo,
      activeIngredients: medForm.activeIngredients, storageCondition: medForm.storageCondition,
      prescriptionRequired: medForm.prescriptionRequired, controlledDrug: medForm.controlledDrug,
      batches: medForm.batches, batch: medForm.batches[0]?.batchNumber || medForm.batch,
      expiry: medForm.batches[0]?.expiry || medForm.expiry,
      createdAt: editMed?.createdAt || today(),
    };
    if (editMed) {
      update('medStock', editMed.id, data);
    } else {
      create('medStock', { id: newId('stk'), ...data } as MedStock);
    }
    setMedOpen(false);
    setEditMed(null);
  };

  const deleteMed = (id: string) => remove('medStock', id);

  const openAdjust = (m: MedStock) => {
    setAdjustMed(m);
    setAdjustForm({ qty: '', reason: '', type: 'Addition' });
    setAdjustOpen(true);
  };

  const saveAdjust = () => {
    if (!adjustMed || !adjustForm.qty) return;
    const qty = parseInt(adjustForm.qty);
    const delta = adjustForm.type === 'Addition' || adjustForm.type === 'Return' ? qty : -qty;
    update('medStock', adjustMed.id, { stock: Math.max(0, adjustMed.stock + delta) });
    setAdjustOpen(false);
    setAdjustMed(null);
  };

  // ---- Suppliers ----
  const setSup = (k: string, v: string) => setSupForm((f) => ({ ...f, [k]: v }));

  const openNewSup = () => { setEditSup(null); setSupForm({ ...blankSupplierForm(), code: `SUP-${String((db?.suppliers.length || 0) + 1).padStart(3, '0')}` }); setSupOpen(true); };

  const openEditSup = (s: Supplier) => {
    setEditSup(s);
    setSupForm({ name: s.name, code: s.code, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, category: s.category, paymentTerms: s.paymentTerms, leadTimeDays: String(s.leadTimeDays), notes: s.notes });
    setSupOpen(true);
  };

  const saveSup = () => {
    if (!supForm.name) return;
    const data = {
      name: supForm.name, code: supForm.code, contactPerson: supForm.contactPerson,
      phone: supForm.phone, email: supForm.email, address: supForm.address,
      category: supForm.category, paymentTerms: supForm.paymentTerms,
      leadTimeDays: parseInt(supForm.leadTimeDays) || 0, notes: supForm.notes,
      createdAt: editSup?.createdAt || today(),
    };
    if (editSup) {
      update('suppliers', editSup.id, data);
    } else {
      create('suppliers', { id: newId('sup'), ...data } as Supplier);
    }
    setSupOpen(false);
    setEditSup(null);
  };

  const deleteSup = (id: string) => remove('suppliers', id);

  // ---- Purchases ----
  const setPur = (k: string, v: string | number) => setPurForm((f) => ({ ...f, [k]: v }));

  const recalcPur = (items: PurchaseItem[]) => {
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    return { ...purForm, items, subtotal, total: subtotal - (purForm.discount || 0) + (purForm.tax || 0) };
  };

  const setPurItem = (idx: number, k: keyof PurchaseItem, v: string | number) => {
    setPurForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [k]: v };
        updated.lineTotal = (updated.quantity || 0) * (updated.unitCost || 0);
        return updated;
      });
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      return { ...f, items, subtotal, total: subtotal - (f.discount + f.tax) };
    });
  };

  const addPurItem = () => setPurForm((f) => ({ ...f, items: [...f.items, { ...blankPurchaseItem(), id: newId('pi') }] }));
  const removePurItem = (idx: number) => setPurForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const onPurStockSelect = (idx: number, stockId: string) => {
    const med = db?.medStock.find((m) => m.id === stockId);
    if (!med) return;
    setPurItem(idx, 'stockItemId', stockId);
    setPurItem(idx, 'itemName', med.name);
    setPurItem(idx, 'unit', med.unit);
    setPurItem(idx, 'unitCost', med.batches[0]?.costPerUnit || 0);
  };

  const openNewPur = () => {
    setEditPur(null);
    setPurForm({ ...blankPurchaseForm(), poNumber: `PO-${String((db?.purchases.length || 0) + 1).padStart(4, '0')}` });
    setPurOpen(true);
  };

  const openEditPur = (p: Purchase) => {
    setEditPur(p);
    setPurForm({
      poNumber: p.poNumber, supplierId: p.supplierId, date: p.date, receivedDate: p.receivedDate,
      items: p.items.map((i) => ({ ...i })), subtotal: p.subtotal, tax: p.tax, discount: p.discount,
      total: p.total, status: p.status, notes: p.notes,
    });
    setPurOpen(true);
  };

  const savePur = () => {
    if (!purForm.items.length) return;
    const supplier = db?.suppliers.find((s) => s.id === purForm.supplierId);
    const data = {
      poNumber: purForm.poNumber, supplierId: purForm.supplierId, supplierName: supplier?.name || '',
      date: purForm.date, receivedDate: purForm.receivedDate, items: purForm.items,
      subtotal: purForm.subtotal, tax: purForm.tax, discount: purForm.discount, total: purForm.total,
      status: purForm.status, notes: purForm.notes, createdAt: editPur?.createdAt || today(),
    };
    if (editPur) {
      update('purchases', editPur.id, data);
    } else {
      create('purchases', { id: newId('pur'), ...data } as Purchase);
    }
    setPurOpen(false);
    setEditPur(null);
  };

  const deletePur = (id: string) => remove('purchases', id);

  // ---- Sales / Dispensing ----
  const setSale = (k: string, v: string | number) => setSaleForm((f) => ({ ...f, [k]: v }));

  const setSaleItem = (idx: number, k: keyof SaleItem, v: string | number) => {
    setSaleForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [k]: v };
        updated.lineTotal = (updated.quantity || 0) * (updated.unitPrice || 0) - (updated.discount || 0);
        return updated;
      });
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      return { ...f, items, subtotal, total: subtotal - f.discount + f.tax };
    });
  };

  const addSaleItem = () => setSaleForm((f) => ({ ...f, items: [...f.items, { ...blankSaleItem(), id: newId('si') }] }));
  const removeSaleItem = (idx: number) => setSaleForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const onSaleStockSelect = (idx: number, stockId: string) => {
    const med = db?.medStock.find((m) => m.id === stockId);
    if (!med) return;
    setSaleItem(idx, 'stockItemId', stockId);
    setSaleItem(idx, 'itemName', med.name);
    setSaleItem(idx, 'unit', med.unit);
    setSaleItem(idx, 'unitPrice', med.price);
  };

  const openNewSale = () => {
    setEditSale(null);
    setSaleForm({ ...blankSaleForm(), saleNumber: `PS-${String((db?.pharmacySales.length || 0) + 1).padStart(4, '0')}` });
    setSaleOpen(true);
  };

  const openEditSale = (s: PharmacySale) => {
    setEditSale(s);
    setSaleForm({
      saleNumber: s.saleNumber, date: s.date, customerName: s.customerName, petName: s.petName,
      ownerId: s.ownerId, items: s.items.map((i) => ({ ...i })), subtotal: s.subtotal, tax: s.tax,
      discount: s.discount, total: s.total, paymentMethod: s.paymentMethod, status: s.status,
      dispensedBy: s.dispensedBy, notes: s.notes,
    });
    setSaleOpen(true);
  };

  const saveSale = () => {
    if (!saleForm.items.length) return;
    const data = {
      saleNumber: saleForm.saleNumber, date: saleForm.date, customerName: saleForm.customerName,
      petName: saleForm.petName, ownerId: saleForm.ownerId, items: saleForm.items,
      subtotal: saleForm.subtotal, tax: saleForm.tax, discount: saleForm.discount, total: saleForm.total,
      paymentMethod: saleForm.paymentMethod, status: saleForm.status, dispensedBy: saleForm.dispensedBy,
      notes: saleForm.notes, createdAt: editSale?.createdAt || today(),
    };
    if (editSale) {
      update('pharmacySales', editSale.id, data);
    } else {
      create('pharmacySales', { id: newId('sale'), ...data } as PharmacySale);
    }
    // Deduct stock for completed sales
    if (saleForm.status === 'Completed' && !editSale) {
      saleForm.items.forEach((it) => {
        const med = db?.medStock.find((m) => m.id === it.stockItemId);
        if (med) update('medStock', med.id, { stock: Math.max(0, med.stock - it.quantity) });
      });
    }
    setSaleOpen(false);
    setEditSale(null);
  };

  const deleteSale = (id: string) => remove('pharmacySales', id);

  const refundSale = (s: PharmacySale) => {
    // Return stock
    s.items.forEach((it) => {
      const med = db?.medStock.find((m) => m.id === it.stockItemId);
      if (med) update('medStock', med.id, { stock: med.stock + it.quantity });
    });
    update('pharmacySales', s.id, { status: 'Refunded' });
  };

  // ---- Stats ----
  const stats = useMemo(() => {
    if (!db) return { totalItems: 0, lowStock: 0, expiring: 0, expired: 0, suppliers: 0, openPOs: 0, salesToday: 0, revenueToday: 0 };
    const t = today();
    const todaySales = db.pharmacySales.filter((s) => s.date === t && s.status === 'Completed');
    return {
      totalItems: db.medStock.length,
      lowStock: lowStock.length,
      expiring: expiringSoon.length,
      expired: expired.length,
      suppliers: db.suppliers.length,
      openPOs: db.purchases.filter((p) => p.status === 'Ordered' || p.status === 'Partially received').length,
      salesToday: todaySales.length,
      revenueToday: todaySales.reduce((s, sale) => s + sale.total, 0),
    };
  }, [db]);

  const tabs: { key: Tab; label: string; icon: typeof Pill }[] = [
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'suppliers', label: 'Suppliers', icon: Truck },
    { key: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { key: 'dispensing', label: 'Dispensing', icon: HandHeart },
    { key: 'sales', label: 'Sales', icon: Receipt },
  ];

  if (!db) return <Shell title="Pharmacy & Inventory"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  return (
    <Shell title="Pharmacy & Inventory" subtitle="Medicines, vaccines, supplements, dispensing, suppliers, and pharmacy sales">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center"><Package className="w-5 h-5 text-sage" /></div><div><div className="text-2xl font-bold text-ink">{stats.totalItems}</div><div className="text-[11px] text-ink/50">Total items</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-coral" /></div><div><div className="text-2xl font-bold text-coral">{stats.lowStock}</div><div className="text-[11px] text-ink/50">Low stock alerts</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><div className="text-2xl font-bold text-amber-600">{stats.expiring + stats.expired}</div><div className="text-[11px] text-ink/50">Expiring / expired</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><Receipt className="w-5 h-5 text-sky-600" /></div><div><div className="text-2xl font-bold text-sky-700">${stats.revenueToday.toFixed(0)}</div><div className="text-[11px] text-ink/50">Sales today ({stats.salesToday})</div></div></div></Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-sage text-sage' : 'border-transparent text-ink/50 hover:text-ink'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {aiSuggestion && (
        <div className="mb-5">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      {/* ====== INVENTORY TAB ====== */}
      {tab === 'inventory' && (
        <>
          {lowStock.length > 0 && (
            <div className="flex items-center gap-2.5 mb-4 px-4 py-3 rounded-xl bg-coral/10 border border-coral/20">
              <AlertTriangle className="w-4 h-4 text-coral shrink-0" />
              <p className="text-xs text-coral font-medium">
                {lowStock.length} item{lowStock.length > 1 ? 's are' : ' is'} below reorder level. Review and restock soon.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-white border border-line flex-1">
              <Search className="w-4 h-4 text-ink/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, generic, supplier, batch, barcode…" className="bg-transparent border-0 outline-none text-sm w-full placeholder:text-ink/40" />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-line overflow-x-auto">
              {['all', ...categories].map((c) => (
                <button key={c} onClick={() => setFilter(c)} className={`px-3 h-8 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${filter === c ? 'bg-mint text-sage' : 'text-ink/60 hover:bg-canvas'}`}>{c}</button>
              ))}
            </div>
            <AISuggestionButton onClick={() => setAiSuggestion(generateInventoryForecast(db.medStock.map((s) => ({ name: s.name, stock: s.stock, reorderLevel: s.reorderLevel, unit: s.unit, supplier: s.supplier }))))} label="AI Forecast" />
            <Button onClick={openNewMed}><Plus className="w-4 h-4" /> Add item</Button>
          </div>

          {items.length === 0 ? (
            <Card><EmptyState icon={Pill} title="No inventory items" hint="Add medicines, vaccines, supplements, and supplies to track stock levels." /></Card>
          ) : (
            <div className="space-y-2">
              {items.map((m) => {
                const low = m.stock <= m.reorderLevel;
                const exp = m.expiry && new Date(m.expiry) < new Date();
                const expSoon = m.expiry && !exp && Math.ceil((new Date(m.expiry).getTime() - Date.now()) / 86400000) <= 90;
                const expanded = expandedMed === m.id;
                return (
                  <Card key={m.id} className="group hover:ring-2 hover:ring-sage/20 transition-all">
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedMed(expanded ? null : m.id)}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${low ? 'bg-coral/15' : 'bg-mint'}`}>
                          <Pill className={`w-5 h-5 ${low ? 'text-coral' : 'text-sage'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-ink">{m.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/50">{m.category}</span>
                            {m.prescriptionRequired && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Rx</span>}
                            {m.controlledDrug && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral">Controlled</span>}
                            {low && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Low stock</span>}
                            {exp && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium">Expired</span>}
                            {expSoon && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Expiring soon</span>}
                          </div>
                          <div className="text-[11px] text-ink/50 mt-0.5">
                            {m.genericName && `${m.genericName} · `}{m.manufacturer && `${m.manufacturer} · `}{m.strength || m.unit}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {m.barcode && <span className="text-[10px] px-2 py-0.5 rounded bg-canvas/60 text-ink/60 flex items-center gap-0.5 font-mono"><Barcode className="w-2.5 h-2.5" /> {m.barcode}</span>}
                            {m.batch && <span className="text-[10px] text-ink/50">Batch: {m.batch}</span>}
                            {m.expiry && <span className="text-[10px] text-ink/50">Exp: {m.expiry}</span>}
                            {m.supplier && <span className="text-[10px] text-ink/50">{m.supplier}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-lg font-bold ${low ? 'text-coral' : 'text-ink'}`}>{m.stock} <span className="text-xs font-normal text-ink/50">{m.unit}</span></div>
                          <div className="text-[11px] text-ink/50">${m.price.toFixed(2)} / {m.unit}</div>
                        </div>
                        <button className="text-ink/30 hover:text-ink mt-1">
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openAdjust(m)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Stock adjustment">
                          <TrendingDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEditMed(m)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMed(m.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-line px-4 pb-4 pt-3 bg-canvas/30 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {m.dosageForm && <div><span className="text-ink/40">Form:</span> <span className="text-ink/70 font-medium">{m.dosageForm}</span></div>}
                          {m.strength && <div><span className="text-ink/40">Strength:</span> <span className="text-ink/70 font-medium">{m.strength}</span></div>}
                          {m.dosageInfo && <div><span className="text-ink/40">Dosage:</span> <span className="text-ink/70 font-medium">{m.dosageInfo}</span></div>}
                          {m.activeIngredients && <div><span className="text-ink/40">Active:</span> <span className="text-ink/70 font-medium">{m.activeIngredients}</span></div>}
                          {m.storageCondition && <div><span className="text-ink/40">Storage:</span> <span className="text-ink/70 font-medium">{m.storageCondition}</span></div>}
                          {m.reorderLevel > 0 && <div><span className="text-ink/40">Reorder at:</span> <span className="text-ink/70 font-medium">{m.reorderLevel} {m.unit}</span></div>}
                          {m.reorderQty > 0 && <div><span className="text-ink/40">Reorder qty:</span> <span className="text-ink/70 font-medium">{m.reorderQty} {m.unit}</span></div>}
                          {m.qrCode && <div><span className="text-ink/40">QR:</span> <span className="text-ink/70 font-medium font-mono">{m.qrCode}</span></div>}
                        </div>

                        {m.batches && m.batches.length > 0 && (
                          <div className="rounded-lg border border-line bg-white p-3">
                            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Batch Tracking</div>
                            <table className="w-full text-xs">
                              <thead><tr className="text-ink/40 text-[10px]"><th className="text-left py-1">Batch No</th><th className="text-right">Qty</th><th className="text-left pl-3">Expiry</th><th className="text-left pl-3">Received</th><th className="text-right">Cost/unit</th></tr></thead>
                              <tbody>
                                {m.batches.map((b, i) => (
                                  <tr key={i} className="border-t border-line/50">
                                    <td className="py-1 text-ink/70 font-medium">{b.batchNumber}</td>
                                    <td className="text-right text-ink/70">{b.quantity} {m.unit}</td>
                                    <td className="text-left pl-3 text-ink/50">{b.expiry}</td>
                                    <td className="text-left pl-3 text-ink/50">{b.receivedDate}</td>
                                    <td className="text-right text-ink/70">${b.costPerUnit.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add/Edit medicine modal */}
          <Modal open={medOpen} onClose={() => { setMedOpen(false); setEditMed(null); }} title={editMed ? 'Edit item' : 'Add inventory item'} wide>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Item name"><input className={inputCls} value={medForm.name} onChange={(e) => setMed('name', e.target.value)} placeholder="Amoxicillin 250mg" /></Field>
                <Field label="Category">
                  <Select value={medForm.category} onChange={(e) => setMed('category', e.target.value)}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Generic name"><input className={inputCls} value={medForm.genericName} onChange={(e) => setMed('genericName', e.target.value)} placeholder="Amoxicillin" /></Field>
                <Field label="Manufacturer"><input className={inputCls} value={medForm.manufacturer} onChange={(e) => setMed('manufacturer', e.target.value)} placeholder="Sandoz" /></Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Dosage form"><input className={inputCls} value={medForm.dosageForm} onChange={(e) => setMed('dosageForm', e.target.value)} placeholder="Oral tablet" /></Field>
                <Field label="Strength"><input className={inputCls} value={medForm.strength} onChange={(e) => setMed('strength', e.target.value)} placeholder="250 mg" /></Field>
                <Field label="Dosage info"><input className={inputCls} value={medForm.dosageInfo} onChange={(e) => setMed('dosageInfo', e.target.value)} placeholder="15 mg/kg PO q12h" /></Field>
                <Field label="Active ingredients"><input className={inputCls} value={medForm.activeIngredients} onChange={(e) => setMed('activeIngredients', e.target.value)} placeholder="Amoxicillin 200mg" /></Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Stock qty"><NumberInput value={medForm.stock} onChange={(e) => setMed('stock', e.target.value)} placeholder="50" /></Field>
                <Field label="Unit"><input className={inputCls} value={medForm.unit} onChange={(e) => setMed('unit', e.target.value)} placeholder="tablet" /></Field>
                <Field label="Reorder level"><NumberInput value={medForm.reorderLevel} onChange={(e) => setMed('reorderLevel', e.target.value)} placeholder="20" /></Field>
                <Field label="Reorder qty"><NumberInput value={medForm.reorderQty} onChange={(e) => setMed('reorderQty', e.target.value)} placeholder="100" /></Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Price ($)"><NumberInput value={medForm.price} onChange={(e) => setMed('price', e.target.value)} placeholder="0.50" /></Field>
                <Field label="Barcode"><input className={`${inputCls} font-mono`} value={medForm.barcode} onChange={(e) => setMed('barcode', e.target.value)} placeholder="BC-001" /></Field>
                <Field label="QR code"><input className={`${inputCls} font-mono`} value={medForm.qrCode} onChange={(e) => setMed('qrCode', e.target.value)} placeholder="QR-001" /></Field>
                <Field label="Storage"><input className={inputCls} value={medForm.storageCondition} onChange={(e) => setMed('storageCondition', e.target.value)} placeholder="Room temperature" /></Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Supplier">
                  <Select value={medForm.supplierId} onChange={(e) => {
                    const sup = db.suppliers.find((s) => s.id === e.target.value);
                    setMedForm((f) => ({ ...f, supplierId: e.target.value, supplier: sup?.name || '' }));
                  }}>
                    <option value="">Select supplier…</option>
                    {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={medForm.prescriptionRequired} onChange={(e) => setMed('prescriptionRequired', e.target.checked)} className="rounded" /> <span className="text-xs text-ink/70">Prescription required</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={medForm.controlledDrug} onChange={(e) => setMed('controlledDrug', e.target.checked)} className="rounded" /> <span className="text-xs text-ink/70">Controlled drug</span></label>
                </div>
              </div>

              {/* Batch tracking in form */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Batches</div>
                  <Button size="sm" variant="outline" onClick={() => setMedForm((f) => ({ ...f, batches: [...f.batches, { ...blankBatch(), id: newId('b') }] }))}><Plus className="w-3.5 h-3.5" /> Add batch</Button>
                </div>
                <div className="space-y-2">
                  {medForm.batches.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                      <input className={`${inputCls} h-8 text-xs w-32`} value={b.batchNumber} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x, i) => i === idx ? { ...x, batchNumber: e.target.value } : x) }))} placeholder="Batch No" />
                      <NumberInput value={String(b.quantity)} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x, i) => i === idx ? { ...x, quantity: parseInt(e.target.value) || 0 } : x) }))} className="w-20 h-8 text-xs" placeholder="Qty" />
                      <input className={`${inputCls} h-8 text-xs w-32`} type="date" value={b.expiry} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x, i) => i === idx ? { ...x, expiry: e.target.value } : x) }))} />
                      <input className={`${inputCls} h-8 text-xs w-32`} type="date" value={b.receivedDate} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x, i) => i === idx ? { ...x, receivedDate: e.target.value } : x) }))} />
                      <NumberInput value={String(b.costPerUnit)} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x, i) => i === idx ? { ...x, costPerUnit: parseFloat(e.target.value) || 0 } : x) }))} className="w-20 h-8 text-xs" placeholder="Cost" />
                      <button onClick={() => setMedForm((f) => ({ ...f, batches: f.batches.filter((_, i) => i !== idx) }))} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { setMedOpen(false); setEditMed(null); }}>Cancel</Button>
                <Button onClick={saveMed}><Package className="w-4 h-4" /> {editMed ? 'Save changes' : 'Add item'}</Button>
              </div>
            </div>
          </Modal>

          {/* Stock adjustment modal */}
          <Modal open={adjustOpen} onClose={() => { setAdjustOpen(false); setAdjustMed(null); }} title={`Stock adjustment — ${adjustMed?.name || ''}`}>
            <div className="space-y-3">
              <div className="text-sm text-ink/60">Current stock: <span className="font-bold text-ink">{adjustMed?.stock} {adjustMed?.unit}</span></div>
              <Field label="Adjustment type">
                <Select value={adjustForm.type} onChange={(e) => setAdjustForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
                  <option value="Addition">Addition (restock)</option>
                  <option value="Removal">Removal (use/loss)</option>
                  <option value="Damage">Damage / write-off</option>
                  <option value="Return">Return to supplier</option>
                </Select>
              </Field>
              <Field label="Quantity"><NumberInput value={adjustForm.qty} onChange={(e) => setAdjustForm((f) => ({ ...f, qty: e.target.value }))} placeholder="10" /></Field>
              <Field label="Reason"><Textarea value={adjustForm.reason} onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason for adjustment…" className="min-h-[50px]" /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setAdjustOpen(false); setAdjustMed(null); }}>Cancel</Button>
                <Button onClick={saveAdjust}>Apply adjustment</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ====== SUPPLIERS TAB ====== */}
      {tab === 'suppliers' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewSup}><Plus className="w-4 h-4" /> Add supplier</Button>
          </div>
          {db.suppliers.length === 0 ? (
            <Card><EmptyState icon={Truck} title="No suppliers" hint="Add suppliers to track purchases and reorder stock." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {db.suppliers.map((s) => (
                <Card key={s.id} className="group p-4 hover:ring-2 hover:ring-sage/20 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{s.name}</div>
                        <div className="text-[11px] text-ink/50">{s.code} · {s.category}</div>
                        {s.contactPerson && <div className="text-[11px] text-ink/50 mt-1">{s.contactPerson} · {s.phone}</div>}
                        {s.email && <div className="text-[11px] text-ink/50">{s.email}</div>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {s.paymentTerms && <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/60">{s.paymentTerms}</span>}
                          {s.leadTimeDays > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/60">{s.leadTimeDays}d lead time</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditSup(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteSup(s.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={supOpen} onClose={() => { setSupOpen(false); setEditSup(null); }} title={editSup ? 'Edit supplier' : 'Add supplier'}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name"><input className={inputCls} value={supForm.name} onChange={(e) => setSup('name', e.target.value)} placeholder="VetMed Supplies" /></Field>
                <Field label="Code"><input className={inputCls} value={supForm.code} onChange={(e) => setSup('code', e.target.value)} placeholder="VMS-001" /></Field>
                <Field label="Contact person"><input className={inputCls} value={supForm.contactPerson} onChange={(e) => setSup('contactPerson', e.target.value)} placeholder="John Park" /></Field>
                <Field label="Category"><input className={inputCls} value={supForm.category} onChange={(e) => setSup('category', e.target.value)} placeholder="Pharmaceuticals" /></Field>
                <Field label="Phone"><input className={inputCls} value={supForm.phone} onChange={(e) => setSup('phone', e.target.value)} placeholder="+1 415 555 0301" /></Field>
                <Field label="Email"><input className={inputCls} value={supForm.email} onChange={(e) => setSup('email', e.target.value)} placeholder="orders@…" /></Field>
              </div>
              <Field label="Address"><input className={inputCls} value={supForm.address} onChange={(e) => setSup('address', e.target.value)} placeholder="200 Industrial Blvd, San Jose, CA" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment terms"><input className={inputCls} value={supForm.paymentTerms} onChange={(e) => setSup('paymentTerms', e.target.value)} placeholder="Net 30" /></Field>
                <Field label="Lead time (days)"><NumberInput value={supForm.leadTimeDays} onChange={(e) => setSup('leadTimeDays', e.target.value)} placeholder="5" /></Field>
              </div>
              <Field label="Notes"><Textarea value={supForm.notes} onChange={(e) => setSup('notes', e.target.value)} placeholder="Notes about this supplier…" className="min-h-[50px]" /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setSupOpen(false); setEditSup(null); }}>Cancel</Button>
                <Button onClick={saveSup}>{editSup ? 'Save changes' : 'Add supplier'}</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ====== PURCHASES TAB ====== */}
      {tab === 'purchases' && (
        <>
          {stats.openPOs > 0 && (
            <div className="flex items-center gap-2.5 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">{stats.openPOs} purchase order{stats.openPOs > 1 ? 's are' : ' is'} open and awaiting delivery.</p>
            </div>
          )}
          <div className="flex justify-end mb-4">
            <Button onClick={openNewPur}><Plus className="w-4 h-4" /> New purchase order</Button>
          </div>
          {db.purchases.length === 0 ? (
            <Card><EmptyState icon={ShoppingCart} title="No purchase orders" hint="Create purchase orders to restock inventory from suppliers." /></Card>
          ) : (
            <div className="space-y-2">
              {db.purchases.map((p) => (
                <Card key={p.id} className="group hover:ring-2 hover:ring-sage/20 transition-all">
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{p.poNumber}</span>
                          <Badge status={p.status} />
                        </div>
                        <div className="text-[11px] text-ink/50 mt-0.5">{p.supplierName} · {p.date} · {p.items.length} item{p.items.length !== 1 ? 's' : ''}</div>
                        {p.receivedDate && <div className="text-[11px] text-sage">Received: {p.receivedDate}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-ink">${p.total.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditPur(p)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deletePur(p.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={purOpen} onClose={() => { setPurOpen(false); setEditPur(null); }} title={editPur ? `Edit ${editPur.poNumber}` : 'New purchase order'} wide>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="PO number"><input className={inputCls} value={purForm.poNumber} onChange={(e) => setPur('poNumber', e.target.value)} /></Field>
                <Field label="Supplier">
                  <Select value={purForm.supplierId} onChange={(e) => setPur('supplierId', e.target.value)}>
                    <option value="">Select supplier…</option>
                    {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="Date"><DateInput value={purForm.date} onChange={(e) => setPur('date', e.target.value)} /></Field>
                <Field label="Status">
                  <Select value={purForm.status} onChange={(e) => setPur('status', e.target.value as Purchase['status'])}>
                    {purchaseStatuses.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>

              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Items</div>
                  <Button size="sm" variant="outline" onClick={addPurItem}><Plus className="w-3.5 h-3.5" /> Add item</Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {purForm.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                      <Select value={it.stockItemId} onChange={(e) => onPurStockSelect(idx, e.target.value)} className="w-40">
                        <option value="">Select item…</option>
                        {db.medStock.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </Select>
                      <input className={`${inputCls} h-8 text-xs w-28`} value={it.batchNumber} onChange={(e) => setPurItem(idx, 'batchNumber', e.target.value)} placeholder="Batch No" />
                      <input className={`${inputCls} h-8 text-xs w-32`} type="date" value={it.expiry} onChange={(e) => setPurItem(idx, 'expiry', e.target.value)} />
                      <NumberInput value={String(it.quantity)} onChange={(e) => setPurItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs" placeholder="Qty" />
                      <NumberInput value={String(it.unitCost)} onChange={(e) => setPurItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" placeholder="Cost" />
                      <span className="text-xs font-medium text-ink/70 w-16 text-right">${(it.quantity * it.unitCost).toFixed(2)}</span>
                      <button onClick={() => removePurItem(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Discount ($)"><NumberInput value={String(purForm.discount)} onChange={(e) => setPur('discount', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Tax ($)"><NumberInput value={String(purForm.tax)} onChange={(e) => setPur('tax', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Received date"><DateInput value={purForm.receivedDate} onChange={(e) => setPur('receivedDate', e.target.value)} /></Field>
                <div className="flex items-end"><div className="text-sm font-bold text-ink">Total: ${(purForm.subtotal - purForm.discount + purForm.tax).toFixed(2)}</div></div>
              </div>
              <Field label="Notes"><Textarea value={purForm.notes} onChange={(e) => setPur('notes', e.target.value)} placeholder="Order notes…" className="min-h-[40px]" /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setPurOpen(false); setEditPur(null); }}>Cancel</Button>
                <Button onClick={savePur}>{editPur ? 'Save changes' : 'Create order'}</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ====== DISPENSING TAB ====== */}
      {tab === 'dispensing' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewSale}><HandHeart className="w-4 h-4" /> New dispensing</Button>
          </div>
          <Card className="p-4 mb-4 bg-mint/20 border-sage/20">
            <div className="flex items-start gap-3">
              <HandHeart className="w-5 h-5 text-sage shrink-0 mt-0.5" />
              <div className="text-xs text-ink/60">
                <p className="font-medium text-ink mb-1">Medicine dispensing</p>
                <p>Dispense medicines against prescriptions, record returns, and apply discounts. Stock is automatically deducted when a sale is completed. Use the Returns button on completed sales to return stock and refund.</p>
              </div>
            </div>
          </Card>
          {db.pharmacySales.length === 0 ? (
            <Card><EmptyState icon={HandHeart} title="No dispensing records" hint="Dispense medicines to patients and walk-in customers." /></Card>
          ) : (
            <div className="space-y-2">
              {db.pharmacySales.map((s) => (
                <Card key={s.id} className="group hover:ring-2 hover:ring-sage/20 transition-all">
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.status === 'Refunded' ? 'bg-canvas' : 'bg-mint'}`}>
                        <Receipt className={`w-5 h-5 ${s.status === 'Refunded' ? 'text-ink/40' : 'text-sage'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{s.saleNumber}</span>
                          <Badge status={s.status} />
                          {s.paymentMethod && <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/60">{s.paymentMethod}</span>}
                        </div>
                        <div className="text-[11px] text-ink/50 mt-0.5">{s.date} · {s.customerName}{s.petName && ` (${s.petName})`}</div>
                        <div className="text-[11px] text-ink/50">{s.items.length} item{s.items.length !== 1 ? 's' : ''}: {s.items.map((i) => `${i.itemName} x${i.quantity}`).join(', ')}</div>
                        {s.dispensedBy && <div className="text-[11px] text-ink/40 mt-0.5">Dispensed by {s.dispensedBy}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-ink">${s.total.toFixed(2)}</div>
                      {s.discount > 0 && <div className="text-[11px] text-sage">-${s.discount.toFixed(2)} discount</div>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {s.status === 'Completed' && (
                        <button onClick={() => refundSale(s)} className="w-7 h-7 rounded-lg hover:bg-amber-100 text-ink/40 hover:text-amber-600 flex items-center justify-center transition-colors" title="Return / refund">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEditSale(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteSale(s.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={saleOpen} onClose={() => { setSaleOpen(false); setEditSale(null); }} title={editSale ? `Edit ${editSale.saleNumber}` : 'New dispensing / sale'} wide>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Sale number"><input className={inputCls} value={saleForm.saleNumber} onChange={(e) => setSale('saleNumber', e.target.value)} /></Field>
                <Field label="Date"><DateInput value={saleForm.date} onChange={(e) => setSale('date', e.target.value)} /></Field>
                <Field label="Customer name"><input className={inputCls} value={saleForm.customerName} onChange={(e) => setSale('customerName', e.target.value)} placeholder="Eleanor Hayes" /></Field>
                <Field label="Pet name"><input className={inputCls} value={saleForm.petName} onChange={(e) => setSale('petName', e.target.value)} placeholder="Biscuit (optional)" /></Field>
              </div>

              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Items</div>
                  <Button size="sm" variant="outline" onClick={addSaleItem}><Plus className="w-3.5 h-3.5" /> Add item</Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {saleForm.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                      <Select value={it.stockItemId} onChange={(e) => onSaleStockSelect(idx, e.target.value)} className="w-40">
                        <option value="">Select item…</option>
                        {db.medStock.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </Select>
                      <NumberInput value={String(it.quantity)} onChange={(e) => setSaleItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs" placeholder="Qty" />
                      <NumberInput value={String(it.unitPrice)} onChange={(e) => setSaleItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" placeholder="Price" />
                      <NumberInput value={String(it.discount)} onChange={(e) => setSaleItem(idx, 'discount', parseFloat(e.target.value) || 0)} className="w-20 h-8 text-xs" placeholder="Disc" />
                      <span className="text-xs font-medium text-ink/70 w-16 text-right">${((it.quantity * it.unitPrice) - it.discount).toFixed(2)}</span>
                      <button onClick={() => removeSaleItem(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Discount ($)"><NumberInput value={String(saleForm.discount)} onChange={(e) => setSale('discount', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Tax ($)"><NumberInput value={String(saleForm.tax)} onChange={(e) => setSale('tax', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Payment method">
                  <Select value={saleForm.paymentMethod} onChange={(e) => setSale('paymentMethod', e.target.value as PharmacySale['paymentMethod'])}>
                    {paymentMethods.map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
                <Field label="Dispensed by">
                  <Select value={saleForm.dispensedBy} onChange={(e) => setSale('dispensedBy', e.target.value)}>
                    {pharmacistNames.map((n) => <option key={n}>{n}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <Field label="Notes"><Textarea value={saleForm.notes} onChange={(e) => setSale('notes', e.target.value)} placeholder="Dispensing notes…" className="min-h-[40px]" /></Field>
                <div className="text-right pl-4"><div className="text-[11px] text-ink/50">Total</div><div className="text-xl font-bold text-ink">${(saleForm.subtotal - saleForm.discount + saleForm.tax).toFixed(2)}</div></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setSaleOpen(false); setEditSale(null); }}>Cancel</Button>
                <Button onClick={saveSale}>{editSale ? 'Save changes' : 'Complete sale'}</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ====== SALES TAB ====== */}
      {tab === 'sales' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <Card className="p-4"><div className="text-[11px] text-ink/50 uppercase tracking-wide">Total revenue</div><div className="text-2xl font-bold text-sage mt-1">${db.pharmacySales.filter((s) => s.status === 'Completed').reduce((sum, s) => sum + s.total, 0).toFixed(2)}</div></Card>
            <Card className="p-4"><div className="text-[11px] text-ink/50 uppercase tracking-wide">Total sales</div><div className="text-2xl font-bold text-ink mt-1">{db.pharmacySales.filter((s) => s.status === 'Completed').length}</div></Card>
            <Card className="p-4"><div className="text-[11px] text-ink/50 uppercase tracking-wide">Refunds</div><div className="text-2xl font-bold text-coral mt-1">{db.pharmacySales.filter((s) => s.status === 'Refunded').length}</div></Card>
          </div>
          {db.pharmacySales.length === 0 ? (
            <Card><EmptyState icon={Receipt} title="No pharmacy sales" hint="Completed sales and dispensing records will appear here." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-ink/50 uppercase tracking-wide border-b border-line">
                      <th className="px-4 py-3 font-medium">Sale #</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium text-center">Items</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {db.pharmacySales.map((s) => (
                      <tr key={s.id} className="hover:bg-canvas/60 group">
                        <td className="px-4 py-3 font-medium text-ink font-mono text-xs">{s.saleNumber}</td>
                        <td className="px-4 py-3 text-ink/60 text-xs">{s.date}</td>
                        <td className="px-4 py-3 text-ink/70">{s.customerName}{s.petName && <span className="text-ink/40"> ({s.petName})</span>}</td>
                        <td className="px-4 py-3 text-center text-ink/60">{s.items.length}</td>
                        <td className="px-4 py-3 text-ink/60 text-xs">{s.paymentMethod || '—'}</td>
                        <td className="px-4 py-3"><Badge status={s.status} /></td>
                        <td className="px-4 py-3 text-right font-medium text-ink">${s.total.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            {s.status === 'Completed' && (
                              <button onClick={() => refundSale(s)} className="w-7 h-7 rounded-lg hover:bg-amber-100 text-ink/40 hover:text-amber-600 flex items-center justify-center transition-colors" title="Return / refund">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => openEditSale(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteSale(s.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </Shell>
  );
}
