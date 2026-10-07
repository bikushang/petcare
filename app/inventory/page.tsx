'use client';

import { useMemo, useState } from 'react';
import {
  Warehouse as WarehouseIcon, Plus, Edit2, Trash2, Search, Package,
  ArrowRightLeft, AlertTriangle, ClipboardList, TrendingDown, Boxes,
  Building2, Phone, MapPin, User as UserIcon, X, FileText,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Button, EmptyState, Modal, Field, inputCls, Select, DateInput,
  NumberInput, Textarea, Badge, StatCard,
} from '../components/ui';
import {
  useDB, Warehouse, InventoryItem, StockTransfer, StockAdjustment,
  TransferItem, Supplier, newId, today,
} from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateInventoryForecast } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const invCategories = [
  'Medicines', 'Surgical equipment', 'Pet food', 'Accessories',
  'Cleaning supplies', 'Laboratory equipment',
] as const;

const warehouseStatuses = ['Active', 'Inactive', 'Full'] as const;
const transferStatuses = ['Draft', 'In transit', 'Received', 'Cancelled'] as const;
const adjustmentTypes = [
  'Stock in', 'Stock out', 'Damaged', 'Lost',
  'Return to supplier', 'Return from customer', 'Correction', 'Recount',
] as const;

type Tab = 'items' | 'warehouses' | 'transfers' | 'adjustments';

const blankWarehouseForm = () => ({
  name: '', code: '', branch: '', address: '', manager: '', phone: '',
  capacity: '', status: 'Active' as Warehouse['status'], notes: '',
});

const blankItemForm = () => ({
  name: '', category: 'Medicines' as InventoryItem['category'], sku: '',
  barcode: '', unit: '', reorderLevel: '', reorderQty: '', unitCost: '',
  unitPrice: '', warehouseId: '', stock: '', reserved: '', damaged: '',
  supplier: '', supplierId: '', notes: '',
});

const blankTransferForm = () => ({
  transferNumber: '', date: today(), fromWarehouseId: '', toWarehouseId: '',
  items: [] as TransferItem[], status: 'Draft' as StockTransfer['status'], notes: '',
});

const blankAdjustmentForm = () => ({
  adjustmentNumber: '', date: today(), itemId: '', type: 'Stock in' as StockAdjustment['type'],
  quantity: '', reason: '', performedBy: '',
});

export default function InventoryPage() {
  const { db, create, update, remove } = useDB();
  const [tab, setTab] = useState<Tab>('items');

  // Items state
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(blankItemForm());

  // Warehouse state
  const [whOpen, setWhOpen] = useState(false);
  const [editWh, setEditWh] = useState<Warehouse | null>(null);
  const [whForm, setWhForm] = useState(blankWarehouseForm());

  // Transfer state
  const [trfOpen, setTrfOpen] = useState(false);
  const [editTrf, setEditTrf] = useState<StockTransfer | null>(null);
  const [trfForm, setTrfForm] = useState(blankTransferForm());

  // Adjustment state
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState(blankAdjustmentForm());
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  // ── Items ──
  const setItem = (k: string, v: string) => setItemForm((f) => ({ ...f, [k]: v }));

  const items = useMemo(() => {
    if (!db) return [];
    const q = search.toLowerCase();
    return db.inventoryItems.filter((m) => {
      const matchesFilter = filter === 'all' || m.category === filter;
      const matchesSearch = !q ||
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.barcode.toLowerCase().includes(q) ||
        m.supplier.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [db, filter, search]);

  const lowStockItems = db?.inventoryItems.filter((i) => i.stock <= i.reorderLevel) ?? [];
  const damagedItems = db?.inventoryItems.filter((i) => i.damaged > 0) ?? [];
  const totalValuation = db?.inventoryItems.reduce((s, i) => s + i.stock * i.unitCost, 0) ?? 0;

  const openNewItem = () => {
    setEditItem(null);
    setItemForm({
      ...blankItemForm(),
      barcode: `BC-${Date.now().toString().slice(-6)}`,
      warehouseId: db?.warehouses[0]?.id || '',
    });
    setItemOpen(true);
  };

  const openEditItem = (m: InventoryItem) => {
    setEditItem(m);
    setItemForm({
      name: m.name, category: m.category, sku: m.sku, barcode: m.barcode,
      unit: m.unit, reorderLevel: String(m.reorderLevel), reorderQty: String(m.reorderQty),
      unitCost: String(m.unitCost), unitPrice: String(m.unitPrice),
      warehouseId: m.warehouseId, stock: String(m.stock), reserved: String(m.reserved),
      damaged: String(m.damaged), supplier: m.supplier, supplierId: m.supplierId, notes: m.notes,
    });
    setItemOpen(true);
  };

  const saveItem = () => {
    if (!itemForm.name) return;
    const wh = db?.warehouses.find((w) => w.id === itemForm.warehouseId);
    const data = {
      name: itemForm.name, category: itemForm.category, sku: itemForm.sku,
      barcode: itemForm.barcode, unit: itemForm.unit || 'unit',
      reorderLevel: parseInt(itemForm.reorderLevel) || 0,
      reorderQty: parseInt(itemForm.reorderQty) || 0,
      unitCost: parseFloat(itemForm.unitCost) || 0,
      unitPrice: parseFloat(itemForm.unitPrice) || 0,
      warehouseId: itemForm.warehouseId, warehouseName: wh?.name || '',
      stock: parseInt(itemForm.stock) || 0, reserved: parseInt(itemForm.reserved) || 0,
      damaged: parseInt(itemForm.damaged) || 0,
      supplier: itemForm.supplier, supplierId: itemForm.supplierId, notes: itemForm.notes,
      createdAt: editItem?.createdAt || today(),
    };
    if (editItem) {
      update('inventoryItems', editItem.id, data);
    } else {
      create('inventoryItems', { id: newId('inv'), ...data } as InventoryItem);
    }
    setItemOpen(false);
    setEditItem(null);
  };

  const deleteItem = (id: string) => remove('inventoryItems', id);

  // ── Warehouses ──
  const setWh = (k: string, v: string) => setWhForm((f) => ({ ...f, [k]: v }));

  const openNewWh = () => {
    setEditWh(null);
    setWhForm({ ...blankWarehouseForm(), code: `WH-${String((db?.warehouses.length || 0) + 1).padStart(2, '0')}` });
    setWhOpen(true);
  };

  const openEditWh = (w: Warehouse) => {
    setEditWh(w);
    setWhForm({
      name: w.name, code: w.code, branch: w.branch, address: w.address,
      manager: w.manager, phone: w.phone, capacity: String(w.capacity),
      status: w.status, notes: w.notes,
    });
    setWhOpen(true);
  };

  const saveWh = () => {
    if (!whForm.name) return;
    const data = {
      name: whForm.name, code: whForm.code, branch: whForm.branch,
      address: whForm.address, manager: whForm.manager, phone: whForm.phone,
      capacity: parseInt(whForm.capacity) || 0, status: whForm.status,
      notes: whForm.notes, createdAt: editWh?.createdAt || today(),
    };
    if (editWh) {
      update('warehouses', editWh.id, data);
    } else {
      create('warehouses', { id: newId('wh'), ...data } as Warehouse);
    }
    setWhOpen(false);
    setEditWh(null);
  };

  const deleteWh = (id: string) => remove('warehouses', id);

  // ── Transfers ──
  const setTrf = (k: string, v: string) => setTrfForm((f) => ({ ...f, [k]: v }));

  const addTrfItem = () =>
    setTrfForm((f) => ({ ...f, items: [...f.items, { id: newId('ti'), itemId: '', itemName: '', quantity: 0, unit: '' }] }));

  const removeTrfItem = (idx: number) =>
    setTrfForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const setTrfItem = (idx: number, k: keyof TransferItem, v: string | number) =>
    setTrfForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)),
    }));

  const onTrfItemSelect = (idx: number, itemId: string) => {
    const item = db?.inventoryItems.find((i) => i.id === itemId);
    if (!item) return;
    setTrfItem(idx, 'itemId', itemId);
    setTrfItem(idx, 'itemName', item.name);
    setTrfItem(idx, 'unit', item.unit);
  };

  const openNewTrf = () => {
    setEditTrf(null);
    setTrfForm({
      ...blankTransferForm(),
      transferNumber: `TRF-${String((db?.stockTransfers.length || 0) + 1).padStart(4, '0')}`,
    });
    setTrfOpen(true);
  };

  const openEditTrf = (t: StockTransfer) => {
    setEditTrf(t);
    setTrfForm({
      transferNumber: t.transferNumber, date: t.date,
      fromWarehouseId: t.fromWarehouseId, toWarehouseId: t.toWarehouseId,
      items: t.items.map((i) => ({ ...i })), status: t.status, notes: t.notes,
    });
    setTrfOpen(true);
  };

  const saveTrf = () => {
    if (!trfForm.items.length) return;
    const fromWh = db?.warehouses.find((w) => w.id === trfForm.fromWarehouseId);
    const toWh = db?.warehouses.find((w) => w.id === trfForm.toWarehouseId);
    const data = {
      transferNumber: trfForm.transferNumber, date: trfForm.date,
      fromWarehouseId: trfForm.fromWarehouseId, fromWarehouseName: fromWh?.name || '',
      toWarehouseId: trfForm.toWarehouseId, toWarehouseName: toWh?.name || '',
      items: trfForm.items, status: trfForm.status, notes: trfForm.notes,
      createdAt: editTrf?.createdAt || today(),
    };
    if (editTrf) {
      update('stockTransfers', editTrf.id, data);
    } else {
      create('stockTransfers', { id: newId('trf'), ...data } as StockTransfer);
    }
    setTrfOpen(false);
    setEditTrf(null);
  };

  const deleteTrf = (id: string) => remove('stockTransfers', id);

  // ── Adjustments ──
  const setAdj = (k: string, v: string) => setAdjForm((f) => ({ ...f, [k]: v }));

  const openNewAdj = () => {
    setAdjForm({
      ...blankAdjustmentForm(),
      adjustmentNumber: `ADJ-${String((db?.stockAdjustments.length || 0) + 1).padStart(4, '0')}`,
    });
    setAdjOpen(true);
  };

  const saveAdj = () => {
    if (!adjForm.itemId || !adjForm.quantity) return;
    const item = db?.inventoryItems.find((i) => i.id === adjForm.itemId);
    if (!item) return;
    const qty = parseInt(adjForm.quantity);
    const isPositive = adjForm.type === 'Stock in' || adjForm.type === 'Return from customer' || adjForm.type === 'Recount';
    const delta = isPositive ? qty : -qty;
    const newStock = Math.max(0, item.stock + delta);
    const data = {
      adjustmentNumber: adjForm.adjustmentNumber, date: adjForm.date,
      itemId: adjForm.itemId, itemName: item.name,
      warehouseId: item.warehouseId, warehouseName: item.warehouseName,
      type: adjForm.type, quantity: qty, previousStock: item.stock, newStock,
      reason: adjForm.reason, performedBy: adjForm.performedBy, createdAt: today(),
    };
    create('stockAdjustments', { id: newId('adj'), ...data } as StockAdjustment);
    update('inventoryItems', item.id, { stock: newStock });
    if (adjForm.type === 'Damaged') {
      update('inventoryItems', item.id, { damaged: item.damaged + qty });
    }
    setAdjOpen(false);
  };

  // ── Render helpers ──
  const tabBtn = (t: Tab, label: string, Icon: typeof Package) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-sage text-white' : 'text-ink/60 hover:bg-mint/50 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!db) return <Shell title="Inventory & Warehouse"><div className="p-6 text-ink/50">Loading inventory…</div></Shell>;

  return (
    <Shell title="Inventory & Warehouse">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Inventory & Warehouse</h1>
            <p className="text-sm text-ink/50 mt-0.5">Track stock across warehouses, transfers, and adjustments</p>
          </div>
          <div className="flex gap-2">
            {tab === 'items' && <AISuggestionButton onClick={() => setAiSuggestion(generateInventoryForecast(db.inventoryItems.map((i) => ({ name: i.name, stock: i.stock, reorderLevel: i.reorderLevel, unit: i.unit, supplier: i.supplier }))))} label="AI Forecast" />}
            {tab === 'items' && <Button onClick={openNewItem}><Plus className="w-4 h-4" /> New Item</Button>}
            {tab === 'warehouses' && <Button onClick={openNewWh}><Plus className="w-4 h-4" /> New Warehouse</Button>}
            {tab === 'transfers' && <Button onClick={openNewTrf}><Plus className="w-4 h-4" /> New Transfer</Button>}
            {tab === 'adjustments' && <Button onClick={openNewAdj}><Plus className="w-4 h-4" /> New Adjustment</Button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Boxes} label="Total Items" value={db.inventoryItems.length} sub="across all categories" tone="sage" />
          <StatCard icon={Building2} label="Warehouses" value={db.warehouses.length} sub="active locations" tone="sky" />
          <StatCard icon={AlertTriangle} label="Low Stock" value={lowStockItems.length} sub="below reorder level" tone="amber" />
          <StatCard icon={TrendingDown} label="Damaged Units" value={db.inventoryItems.reduce((s, i) => s + i.damaged, 0)} sub="needs attention" tone="coral" />
        </div>

        {/* Valuation bar */}
        <Card className="p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint text-sage flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink/50 font-medium">Inventory Valuation (at cost)</div>
              <div className="text-lg font-semibold text-ink">{fmtMoney(totalValuation)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-ink/50 font-medium">Total Adjustments</div>
            <div className="text-lg font-semibold text-ink">{db.stockAdjustments.length} records</div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 p-1 bg-canvas rounded-xl border border-line w-fit">
          {tabBtn('items', 'Items', Package)}
          {tabBtn('warehouses', 'Warehouses', WarehouseIcon)}
          {tabBtn('transfers', 'Transfers', ArrowRightLeft)}
          {tabBtn('adjustments', 'Adjustments', ClipboardList)}
        </div>

        {aiSuggestion && (
          <div className="mb-5">
            <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
          </div>
        )}

        {/* ── Items Tab ── */}
        {tab === 'items' && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items, SKU, barcode…"
                  className={`${inputCls} pl-9`}
                />
              </div>
              <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
                <option value="all">All categories</option>
                {invCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            {items.length === 0 ? (
              <EmptyState icon={Package} title="No inventory items" hint="Add items to start tracking stock across warehouses." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                      <th className="py-2.5 pr-4 font-semibold">Item</th>
                      <th className="py-2.5 pr-4 font-semibold">Category</th>
                      <th className="py-2.5 pr-4 font-semibold">SKU</th>
                      <th className="py-2.5 pr-4 font-semibold">Warehouse</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Stock</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Reorder</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Unit Cost</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Value</th>
                      <th className="py-2.5 pr-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => {
                      const low = m.stock <= m.reorderLevel && m.reorderLevel > 0;
                      return (
                        <tr key={m.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-ink">{m.name}</div>
                            {m.supplier && <div className="text-[11px] text-ink/45">{m.supplier}</div>}
                          </td>
                          <td className="py-3 pr-4 text-ink/70">{m.category}</td>
                          <td className="py-3 pr-4 text-ink/60 font-mono text-xs">{m.sku || '—'}</td>
                          <td className="py-3 pr-4 text-ink/60">{m.warehouseName || '—'}</td>
                          <td className="py-3 pr-4 text-right">
                            <span className={low ? 'text-amber-600 font-semibold' : 'text-ink'}>
                              {m.stock} {m.unit}
                            </span>
                            {m.damaged > 0 && <span className="block text-[10px] text-coral">{m.damaged} damaged</span>}
                          </td>
                          <td className="py-3 pr-4 text-right text-ink/60">{m.reorderLevel} {m.unit}</td>
                          <td className="py-3 pr-4 text-right text-ink/60">{fmtMoney(m.unitCost)}</td>
                          <td className="py-3 pr-4 text-right text-ink font-medium">{fmtMoney(m.stock * m.unitCost)}</td>
                          <td className="py-3 pr-2 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEditItem(m)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-sage hover:bg-mint transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteItem(m.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Warehouses Tab ── */}
        {tab === 'warehouses' && (
          <div>
            {db.warehouses.length === 0 ? (
              <Card className="p-4">
                <EmptyState icon={WarehouseIcon} title="No warehouses" hint="Add a warehouse to start organizing stock by location." />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {db.warehouses.map((w) => {
                  const itemCount = db.inventoryItems.filter((i) => i.warehouseId === w.id).length;
                  const totalUnits = db.inventoryItems.filter((i) => i.warehouseId === w.id).reduce((s, i) => s + i.stock, 0);
                  return (
                    <Card key={w.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-mint text-sage flex items-center justify-center">
                            <WarehouseIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-ink text-sm">{w.name}</div>
                            <div className="text-[11px] text-ink/45 font-mono">{w.code}</div>
                          </div>
                        </div>
                        <Badge status={w.status} />
                      </div>
                      <div className="space-y-1.5 text-xs text-ink/60">
                        {w.branch && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-ink/40" /> {w.branch}</div>}
                        {w.manager && <div className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-ink/40" /> {w.manager}</div>}
                        {w.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-ink/40" /> {w.phone}</div>}
                        {w.address && <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-ink/40 mt-0.5" /> <span className="leading-relaxed">{w.address}</span></div>}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                        <div className="text-[11px] text-ink/50">
                          <span className="font-semibold text-ink">{itemCount}</span> items · <span className="font-semibold text-ink">{totalUnits}</span> units
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditWh(w)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-sage hover:bg-mint transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteWh(w.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Transfers Tab ── */}
        {tab === 'transfers' && (
          <Card className="p-4">
            {db.stockTransfers.length === 0 ? (
              <EmptyState icon={ArrowRightLeft} title="No stock transfers" hint="Move stock between warehouses with transfer records." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                      <th className="py-2.5 pr-4 font-semibold">Transfer #</th>
                      <th className="py-2.5 pr-4 font-semibold">Date</th>
                      <th className="py-2.5 pr-4 font-semibold">From</th>
                      <th className="py-2.5 pr-4 font-semibold">To</th>
                      <th className="py-2.5 pr-4 font-semibold">Items</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 pr-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.stockTransfers.map((t) => (
                      <tr key={t.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-ink font-mono text-xs">{t.transferNumber}</td>
                        <td className="py-3 pr-4 text-ink/60">{t.date}</td>
                        <td className="py-3 pr-4 text-ink/70">{t.fromWarehouseName}</td>
                        <td className="py-3 pr-4 text-ink/70">{t.toWarehouseName}</td>
                        <td className="py-3 pr-4 text-ink/60">{t.items.length} item(s)</td>
                        <td className="py-3 pr-4"><Badge status={t.status} /></td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEditTrf(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-sage hover:bg-mint transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteTrf(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Adjustments Tab ── */}
        {tab === 'adjustments' && (
          <Card className="p-4">
            {db.stockAdjustments.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No stock adjustments" hint="Record stock ins, outs, damages, and corrections." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                      <th className="py-2.5 pr-4 font-semibold">Adj #</th>
                      <th className="py-2.5 pr-4 font-semibold">Date</th>
                      <th className="py-2.5 pr-4 font-semibold">Item</th>
                      <th className="py-2.5 pr-4 font-semibold">Warehouse</th>
                      <th className="py-2.5 pr-4 font-semibold">Type</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Qty</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Prev</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">New</th>
                      <th className="py-2.5 pr-4 font-semibold">Reason</th>
                      <th className="py-2.5 pr-4 font-semibold">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.stockAdjustments.map((a) => (
                      <tr key={a.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-ink/70">{a.adjustmentNumber}</td>
                        <td className="py-3 pr-4 text-ink/60">{a.date}</td>
                        <td className="py-3 pr-4 font-medium text-ink">{a.itemName}</td>
                        <td className="py-3 pr-4 text-ink/60">{a.warehouseName}</td>
                        <td className="py-3 pr-4"><Badge status={a.type} /></td>
                        <td className="py-3 pr-4 text-right text-ink font-medium">{a.quantity > 0 ? '+' : ''}{a.quantity}</td>
                        <td className="py-3 pr-4 text-right text-ink/60">{a.previousStock}</td>
                        <td className="py-3 pr-4 text-right text-ink font-semibold">{a.newStock}</td>
                        <td className="py-3 pr-4 text-ink/60 max-w-[200px] truncate">{a.reason}</td>
                        <td className="py-3 pr-4 text-ink/60">{a.performedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Item Modal ── */}
        <Modal open={itemOpen} onClose={() => setItemOpen(false)} title={editItem ? 'Edit Item' : 'New Inventory Item'} wide>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Item Name"><input className={inputCls} value={itemForm.name} onChange={(e) => setItem('name', e.target.value)} placeholder="e.g. Surgical Drill Set" /></Field>
            <Field label="Category">
              <Select value={itemForm.category} onChange={(e) => setItem('category', e.target.value)}>
                {invCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="SKU"><input className={inputCls} value={itemForm.sku} onChange={(e) => setItem('sku', e.target.value)} placeholder="SE-001" /></Field>
            <Field label="Barcode"><input className={inputCls} value={itemForm.barcode} onChange={(e) => setItem('barcode', e.target.value)} /></Field>
            <Field label="Unit"><input className={inputCls} value={itemForm.unit} onChange={(e) => setItem('unit', e.target.value)} placeholder="set, bag, unit…" /></Field>
            <Field label="Warehouse">
              <Select value={itemForm.warehouseId} onChange={(e) => setItem('warehouseId', e.target.value)}>
                <option value="">— Select —</option>
                {db.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Stock"><NumberInput value={itemForm.stock} onChange={(e) => setItem('stock', e.target.value)} placeholder="0" /></Field>
            <Field label="Reserved"><NumberInput value={itemForm.reserved} onChange={(e) => setItem('reserved', e.target.value)} placeholder="0" /></Field>
            <Field label="Damaged"><NumberInput value={itemForm.damaged} onChange={(e) => setItem('damaged', e.target.value)} placeholder="0" /></Field>
            <Field label="Reorder Level"><NumberInput value={itemForm.reorderLevel} onChange={(e) => setItem('reorderLevel', e.target.value)} placeholder="0" /></Field>
            <Field label="Reorder Qty"><NumberInput value={itemForm.reorderQty} onChange={(e) => setItem('reorderQty', e.target.value)} placeholder="0" /></Field>
            <Field label="Unit Cost"><NumberInput value={itemForm.unitCost} onChange={(e) => setItem('unitCost', e.target.value)} placeholder="0.00" /></Field>
            <Field label="Unit Price"><NumberInput value={itemForm.unitPrice} onChange={(e) => setItem('unitPrice', e.target.value)} placeholder="0.00" /></Field>
            <Field label="Supplier">
              <Select value={itemForm.supplierId} onChange={(e) => {
                const sup = db.suppliers.find((s) => s.id === e.target.value);
                setItemForm((f) => ({ ...f, supplierId: e.target.value, supplier: sup?.name || '' }));
              }}>
                <option value="">— None —</option>
                {db.suppliers.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Notes"><Textarea value={itemForm.notes} onChange={(e) => setItem('notes', e.target.value)} placeholder="Optional notes…" /></Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setItemOpen(false)}>Cancel</Button>
            <Button onClick={saveItem}>{editItem ? 'Save' : 'Add Item'}</Button>
          </div>
        </Modal>

        {/* ── Warehouse Modal ── */}
        <Modal open={whOpen} onClose={() => setWhOpen(false)} title={editWh ? 'Edit Warehouse' : 'New Warehouse'}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Warehouse Name"><input className={inputCls} value={whForm.name} onChange={(e) => setWh('name', e.target.value)} placeholder="e.g. Northgate Main Store" /></Field>
            <Field label="Code"><input className={inputCls} value={whForm.code} onChange={(e) => setWh('code', e.target.value)} placeholder="WH-NG-01" /></Field>
            <Field label="Branch">
              <Select value={whForm.branch} onChange={(e) => setWh('branch', e.target.value)}>
                <option value="">— Select —</option>
                <option value="Northgate">Northgate</option>
                <option value="Riverside">Riverside</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={whForm.status} onChange={(e) => setWh('status', e.target.value)}>
                {warehouseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Manager"><input className={inputCls} value={whForm.manager} onChange={(e) => setWh('manager', e.target.value)} /></Field>
            <Field label="Phone"><input className={inputCls} value={whForm.phone} onChange={(e) => setWh('phone', e.target.value)} /></Field>
            <Field label="Capacity"><NumberInput value={whForm.capacity} onChange={(e) => setWh('capacity', e.target.value)} placeholder="0" /></Field>
            <div className="col-span-2">
              <Field label="Address"><Textarea value={whForm.address} onChange={(e) => setWh('address', e.target.value)} placeholder="Street address…" /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes"><Textarea value={whForm.notes} onChange={(e) => setWh('notes', e.target.value)} /></Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setWhOpen(false)}>Cancel</Button>
            <Button onClick={saveWh}>{editWh ? 'Save' : 'Add Warehouse'}</Button>
          </div>
        </Modal>

        {/* ── Transfer Modal ── */}
        <Modal open={trfOpen} onClose={() => setTrfOpen(false)} title={editTrf ? 'Edit Transfer' : 'New Stock Transfer'} wide>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Transfer #"><input className={inputCls} value={trfForm.transferNumber} onChange={(e) => setTrf('transferNumber', e.target.value)} /></Field>
            <Field label="Date"><DateInput value={trfForm.date} onChange={(e) => setTrf('date', e.target.value)} /></Field>
            <Field label="From Warehouse">
              <Select value={trfForm.fromWarehouseId} onChange={(e) => setTrf('fromWarehouseId', e.target.value)}>
                <option value="">— Select —</option>
                {db.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="To Warehouse">
              <Select value={trfForm.toWarehouseId} onChange={(e) => setTrf('toWarehouseId', e.target.value)}>
                <option value="">— Select —</option>
                {db.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={trfForm.status} onChange={(e) => setTrf('status', e.target.value)}>
                {transferStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Items</span>
              <Button size="sm" variant="outline" onClick={addTrfItem}><Plus className="w-3.5 h-3.5" /> Add Item</Button>
            </div>
            {trfForm.items.length === 0 ? (
              <p className="text-sm text-ink/40 py-4 text-center bg-canvas rounded-xl">No items added yet.</p>
            ) : (
              <div className="space-y-2">
                {trfForm.items.map((it, idx) => (
                  <div key={it.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={it.itemId} onChange={(e) => onTrfItemSelect(idx, e.target.value)}>
                        <option value="">— Select item —</option>
                        {db.inventoryItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </Select>
                    </div>
                    <div className="w-24">
                      <NumberInput value={String(it.quantity)} onChange={(e) => setTrfItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty" />
                    </div>
                    <div className="w-20 text-xs text-ink/50 py-2">{it.unit || 'unit'}</div>
                    <button onClick={() => removeTrfItem(idx)} className="w-9 h-10 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Field label="Notes"><Textarea value={trfForm.notes} onChange={(e) => setTrf('notes', e.target.value)} placeholder="Optional transfer notes…" /></Field>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setTrfOpen(false)}>Cancel</Button>
            <Button onClick={saveTrf}>{editTrf ? 'Save' : 'Create Transfer'}</Button>
          </div>
        </Modal>

        {/* ── Adjustment Modal ── */}
        <Modal open={adjOpen} onClose={() => setAdjOpen(false)} title="New Stock Adjustment">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adjustment #"><input className={inputCls} value={adjForm.adjustmentNumber} onChange={(e) => setAdj('adjustmentNumber', e.target.value)} /></Field>
            <Field label="Date"><DateInput value={adjForm.date} onChange={(e) => setAdj('date', e.target.value)} /></Field>
            <div className="col-span-2">
              <Field label="Item">
                <Select value={adjForm.itemId} onChange={(e) => setAdj('itemId', e.target.value)}>
                  <option value="">— Select item —</option>
                  {db.inventoryItems.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.warehouseName})</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Adjustment Type">
              <Select value={adjForm.type} onChange={(e) => setAdj('type', e.target.value)}>
                {adjustmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Quantity"><NumberInput value={adjForm.quantity} onChange={(e) => setAdj('quantity', e.target.value)} placeholder="0" /></Field>
            <Field label="Performed By"><input className={inputCls} value={adjForm.performedBy} onChange={(e) => setAdj('performedBy', e.target.value)} placeholder="Staff name" /></Field>
            <div className="col-span-2">
              <Field label="Reason"><Textarea value={adjForm.reason} onChange={(e) => setAdj('reason', e.target.value)} placeholder="Reason for adjustment…" /></Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Cancel</Button>
            <Button onClick={saveAdj}>Record Adjustment</Button>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
