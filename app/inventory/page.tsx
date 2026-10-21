'use client';

import { useMemo, useState } from 'react';
import {
  Warehouse as WarehouseIcon, Plus, Edit2, Trash2, Package,
  ArrowRightLeft, AlertTriangle, ClipboardList, TrendingDown, Boxes,
  Building2, Phone, MapPin, User as UserIcon, X, FileText,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Button, EmptyState, Modal, Field, Input, SearchInput, Select, DateInput,
  NumberInput, Textarea, Badge, StatCard,
} from '../components/ui';
import {
  useDB, Warehouse, InventoryItem, StockTransfer, StockAdjustment,
  TransferItem, Supplier, newId,
} from '../lib/store';
import {
  localDateISO, num, numMin, round2, nextDocNumber, confirmDelete,
} from '../lib/helpers';
import { useSettings, formatMoney, lowStockThresholdOf } from '../lib/settings';
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

/**
 * A recount or a correction states what is **actually on the shelf**, so the
 * quantity is an absolute figure, not something to add or subtract. Treating
 * 'Recount' as an addition turned a stock-take of 45 against a system figure
 * of 50 into 95.
 */
const ABSOLUTE_TYPES: StockAdjustment['type'][] = ['Recount', 'Correction'];
const INCREASE_TYPES: StockAdjustment['type'][] = ['Stock in', 'Return from customer'];

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
  transferNumber: '', date: localDateISO(), fromWarehouseId: '', toWarehouseId: '',
  items: [] as TransferItem[], status: 'Draft' as StockTransfer['status'], notes: '',
});

const blankAdjustmentForm = () => ({
  adjustmentNumber: '', date: localDateISO(), itemId: '', type: 'Stock in' as StockAdjustment['type'],
  quantity: '', reason: '', performedBy: '',
});

/** Units that can actually be sold or moved: reserved stock is committed. */
const availableOf = (i: InventoryItem) => Math.max(0, round2(numMin(i.stock, 0) - numMin(i.reserved, 0)));

/** One low-stock rule, shared by the stat card and the table. */
const isLowStock = (i: InventoryItem, threshold: number) =>
  availableOf(i) <= (numMin(i.reorderLevel, 0) > 0 ? numMin(i.reorderLevel, 0) : threshold);

/** Does an item in the destination warehouse represent the same product? */
const sameProduct = (a: InventoryItem, b: InventoryItem) =>
  a.sku && b.sku ? a.sku.trim().toLowerCase() === b.sku.trim().toLowerCase()
    : a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.category === b.category;

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-coral/10 border border-coral/25 mb-4">
      <AlertTriangle className="w-3.5 h-3.5 text-coral shrink-0 mt-0.5" />
      <p className="text-[11px] font-medium text-coral">{message}</p>
    </div>
  );
}

export default function InventoryPage() {
  const { db, create, update, remove } = useDB();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('items');
  const [pageError, setPageError] = useState('');

  // Items state
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState(blankItemForm());
  const [itemError, setItemError] = useState('');

  // Warehouse state
  const [whOpen, setWhOpen] = useState(false);
  const [editWh, setEditWh] = useState<Warehouse | null>(null);
  const [whForm, setWhForm] = useState(blankWarehouseForm());
  const [whError, setWhError] = useState('');

  // Transfer state
  const [trfOpen, setTrfOpen] = useState(false);
  const [editTrf, setEditTrf] = useState<StockTransfer | null>(null);
  const [trfForm, setTrfForm] = useState(blankTransferForm());
  const [trfError, setTrfError] = useState('');

  // Adjustment state
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState(blankAdjustmentForm());
  const [adjError, setAdjError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const fmtMoney = (n: number) => formatMoney(n, settings);
  const threshold = lowStockThresholdOf(settings);
  const todayISO = localDateISO();

  /** Staff list for "performed by" — was a free-text field. */
  const staffNames = useMemo(
    () => (db?.staff ?? []).filter((s) => s.role !== 'Pet Owner').map((s) => ({ id: s.id, name: s.name })),
    [db],
  );

  // ── Items ──
  const setItem = (k: string, v: string) => { setItemForm((f) => ({ ...f, [k]: v })); setItemError(''); };

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

  const lowStockItems = db?.inventoryItems.filter((i) => isLowStock(i, threshold)) ?? [];
  const grossValuation = round2(db?.inventoryItems.reduce((s, i) => s + numMin(i.stock, 0) * numMin(i.unitCost, 0), 0) ?? 0);
  const reservedValuation = round2(db?.inventoryItems.reduce((s, i) => s + numMin(i.reserved, 0) * numMin(i.unitCost, 0), 0) ?? 0);
  const availableValuation = round2(grossValuation - reservedValuation);
  const reservedUnits = db?.inventoryItems.reduce((s, i) => s + numMin(i.reserved, 0), 0) ?? 0;
  const activeWarehouses = db?.warehouses.filter((w) => w.status === 'Active').length ?? 0;

  const openNewItem = () => {
    setEditItem(null);
    setItemError('');
    setItemForm({
      ...blankItemForm(),
      barcode: `BC-${Date.now().toString().slice(-6)}`,
      warehouseId: db?.warehouses[0]?.id || '',
    });
    setItemOpen(true);
  };

  const openEditItem = (m: InventoryItem) => {
    setEditItem(m);
    setItemError('');
    setItemForm({
      name: m.name, category: m.category, sku: m.sku, barcode: m.barcode,
      unit: m.unit, reorderLevel: String(m.reorderLevel), reorderQty: String(m.reorderQty),
      unitCost: String(m.unitCost), unitPrice: String(m.unitPrice),
      warehouseId: m.warehouseId, stock: String(m.stock), reserved: String(m.reserved),
      damaged: String(m.damaged), supplier: m.supplier, supplierId: m.supplierId, notes: m.notes,
    });
    setItemOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) { setItemError('An item name is required.'); return; }
    if (!itemForm.warehouseId) { setItemError('Choose the warehouse this item is stored in.'); return; }
    const stock = numMin(itemForm.stock, 0);
    const reserved = numMin(itemForm.reserved, 0);
    if (reserved > stock) { setItemError('Reserved units cannot be more than the stock on hand.'); return; }

    const wh = db?.warehouses.find((w) => w.id === itemForm.warehouseId);
    const data = {
      name: itemForm.name.trim(), category: itemForm.category, sku: itemForm.sku,
      barcode: itemForm.barcode, unit: itemForm.unit || 'unit',
      reorderLevel: numMin(itemForm.reorderLevel, 0),
      reorderQty: numMin(itemForm.reorderQty, 0),
      unitCost: numMin(itemForm.unitCost, 0),
      unitPrice: numMin(itemForm.unitPrice, 0),
      warehouseId: itemForm.warehouseId, warehouseName: wh?.name || '',
      stock, reserved,
      damaged: numMin(itemForm.damaged, 0),
      supplier: itemForm.supplier, supplierId: itemForm.supplierId, notes: itemForm.notes,
      createdAt: editItem?.createdAt || todayISO,
    };
    try {
      if (editItem) await update('inventoryItems', editItem.id, data);
      else await create('inventoryItems', { id: newId('inv'), ...data } as InventoryItem);
    } catch (err) {
      setItemError((err as Error).message || 'Could not save this item.');
      return;
    }
    setItemOpen(false);
    setEditItem(null);
  };

  const deleteItem = async (m: InventoryItem) => {
    if (!confirmDelete(`${m.name} (${numMin(m.stock, 0)} ${m.unit} in ${m.warehouseName || 'no warehouse'})`)) return;
    try {
      await remove('inventoryItems', m.id);
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that item.');
    }
  };

  // ── Warehouses ──
  const setWh = (k: string, v: string) => { setWhForm((f) => ({ ...f, [k]: v })); setWhError(''); };

  const openNewWh = () => {
    setEditWh(null);
    setWhError('');
    setWhForm({ ...blankWarehouseForm(), code: nextDocNumber('WH-', db?.warehouses.map((w) => w.code) ?? [], 1, 2) });
    setWhOpen(true);
  };

  const openEditWh = (w: Warehouse) => {
    setEditWh(w);
    setWhError('');
    setWhForm({
      name: w.name, code: w.code, branch: w.branch, address: w.address,
      manager: w.manager, phone: w.phone, capacity: String(w.capacity),
      status: w.status, notes: w.notes,
    });
    setWhOpen(true);
  };

  const saveWh = async () => {
    if (!whForm.name.trim()) { setWhError('A warehouse name is required.'); return; }
    if (!whForm.code.trim()) { setWhError('A warehouse code is required.'); return; }
    const data = {
      name: whForm.name.trim(), code: whForm.code.trim(), branch: whForm.branch,
      address: whForm.address, manager: whForm.manager, phone: whForm.phone,
      capacity: numMin(whForm.capacity, 0), status: whForm.status,
      notes: whForm.notes, createdAt: editWh?.createdAt || todayISO,
    };
    try {
      if (editWh) {
        await update('warehouses', editWh.id, data);
        // Items carry a denormalised warehouseName — repoint it on rename
        // instead of leaving every row showing the old location.
        if (db && editWh.name !== data.name) {
          const stale = db.inventoryItems.filter((i) => i.warehouseId === editWh.id);
          for (const i of stale) await update('inventoryItems', i.id, { warehouseName: data.name });
        }
      } else {
        await create('warehouses', { id: newId('wh'), ...data } as Warehouse);
      }
    } catch (err) {
      setWhError((err as Error).message || 'Could not save this warehouse.');
      return;
    }
    setWhOpen(false);
    setEditWh(null);
  };

  /** Deleting a warehouse used to orphan its items, which kept showing its name. */
  const deleteWh = async (w: Warehouse) => {
    if (!db) return;
    const held = db.inventoryItems.filter((i) => i.warehouseId === w.id);
    if (held.length > 0) {
      setPageError(`${w.name} still holds ${held.length} item${held.length > 1 ? 's' : ''}. Transfer or delete them first, otherwise the items would be left pointing at a warehouse that no longer exists.`);
      return;
    }
    const openTransfers = db.stockTransfers.filter(
      (t) => (t.fromWarehouseId === w.id || t.toWarehouseId === w.id) && t.status !== 'Received' && t.status !== 'Cancelled',
    ).length;
    if (!confirmDelete(`warehouse ${w.name}`, openTransfers > 0 ? `${openTransfers} open transfer${openTransfers > 1 ? 's' : ''} reference it.` : undefined)) return;
    try {
      await remove('warehouses', w.id);
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that warehouse.');
    }
  };

  // ── Transfers ──
  const setTrf = (k: string, v: string) => { setTrfForm((f) => ({ ...f, [k]: v })); setTrfError(''); };

  const addTrfItem = () =>
    setTrfForm((f) => ({ ...f, items: [...f.items, { id: newId('ti'), itemId: '', itemName: '', quantity: 0, unit: '' }] }));

  const removeTrfItem = (idx: number) =>
    setTrfForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const setTrfItem = (idx: number, k: keyof TransferItem, v: string | number) => {
    setTrfError('');
    setTrfForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)),
    }));
  };

  const onTrfItemSelect = (idx: number, itemId: string) => {
    const item = db?.inventoryItems.find((i) => i.id === itemId);
    setTrfError('');
    setTrfForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx
        ? { ...it, itemId, itemName: item?.name || '', unit: item?.unit || '' }
        : it)),
    }));
  };

  const openNewTrf = () => {
    setEditTrf(null);
    setTrfError('');
    setTrfForm({
      ...blankTransferForm(),
      transferNumber: nextDocNumber('TRF-', db?.stockTransfers.map((t) => t.transferNumber) ?? [], 1, 4),
    });
    setTrfOpen(true);
  };

  const openEditTrf = (t: StockTransfer) => {
    setEditTrf(t);
    setTrfError('');
    setTrfForm({
      transferNumber: t.transferNumber, date: t.date,
      fromWarehouseId: t.fromWarehouseId, toWarehouseId: t.toWarehouseId,
      items: t.items.map((i) => ({ ...i, id: i.id || newId('ti') })), status: t.status, notes: t.notes,
    });
    setTrfOpen(true);
  };

  /**
   * Saving a transfer wrote the paperwork and moved nothing. It now moves the
   * stock on the transition into 'Received' (and takes it back on the way out
   * of 'Received'), creating the destination item when that warehouse has
   * never carried the product before.
   */
  const saveTrf = async () => {
    if (!db) return;
    const lines = trfForm.items;
    if (!trfForm.transferNumber.trim()) { setTrfError('A transfer number is required.'); return; }
    if (!trfForm.date) { setTrfError('A transfer date is required.'); return; }
    if (!trfForm.fromWarehouseId) { setTrfError('Choose the warehouse the stock leaves.'); return; }
    if (!trfForm.toWarehouseId) { setTrfError('Choose the warehouse the stock arrives at.'); return; }
    if (trfForm.fromWarehouseId === trfForm.toWarehouseId) { setTrfError('A transfer needs two different warehouses.'); return; }
    if (lines.length === 0) { setTrfError('Add at least one item to the transfer.'); return; }
    if (lines.some((it) => !it.itemId)) { setTrfError('Every line needs an item selected.'); return; }
    if (lines.some((it) => numMin(it.quantity, 0) <= 0)) { setTrfError('Every line needs a quantity greater than zero.'); return; }

    const offSite = lines
      .map((it) => db.inventoryItems.find((i) => i.id === it.itemId))
      .filter((i): i is InventoryItem => !!i && i.warehouseId !== trfForm.fromWarehouseId);
    if (offSite.length > 0) {
      setTrfError(`${offSite.map((i) => i.name).join(', ')} ${offSite.length > 1 ? 'are' : 'is'} not stored in the source warehouse.`);
      return;
    }

    const fromWh = db.warehouses.find((w) => w.id === trfForm.fromWarehouseId);
    const toWh = db.warehouses.find((w) => w.id === trfForm.toWarehouseId);

    const wasReceived = editTrf?.status === 'Received';
    const isReceived = trfForm.status === 'Received';

    // Plan the movement first, aggregated per item id, so two lines for the
    // same product net into one write instead of overwriting each other.
    const deltas: Record<string, number> = {};
    const creations: Record<string, { template: InventoryItem; warehouseId: string; warehouseName: string; qty: number }> = {};

    const planMove = (from: string, to: string, toName: string, moveLines: TransferItem[], sign: 1 | -1) => {
      moveLines.forEach((ln) => {
        const qty = round2(numMin(ln.quantity, 0) * sign);
        if (qty === 0) return;
        const src = db.inventoryItems.find((i) => i.id === ln.itemId);
        if (!src) return;
        deltas[src.id] = round2((deltas[src.id] || 0) - qty);
        const dest = db.inventoryItems.find((i) => i.warehouseId === to && i.id !== src.id && sameProduct(i, src));
        if (dest) {
          deltas[dest.id] = round2((deltas[dest.id] || 0) + qty);
        } else {
          const key = `${to}::${(src.sku || src.name).toLowerCase()}`;
          if (!creations[key]) creations[key] = { template: src, warehouseId: to, warehouseName: toName, qty: 0 };
          creations[key].qty = round2(creations[key].qty + qty);
        }
      });
    };

    if (wasReceived && editTrf) {
      planMove(
        editTrf.fromWarehouseId, editTrf.toWarehouseId, editTrf.toWarehouseName,
        editTrf.items, -1,
      );
    }
    if (isReceived) {
      planMove(trfForm.fromWarehouseId, trfForm.toWarehouseId, toWh?.name || '', lines, 1);
    }

    const blocked: string[] = [];
    for (const id of Object.keys(deltas)) {
      if (deltas[id] >= 0) continue;
      const live = db.inventoryItems.find((i) => i.id === id);
      if (!live) continue;
      if (round2(numMin(live.stock, 0) + deltas[id]) < numMin(live.reserved, 0)) {
        blocked.push(`${live.name} in ${live.warehouseName || 'its warehouse'} (${availableOf(live)} ${live.unit} available, ${-deltas[id]} needed)`);
      }
    }
    if (blocked.length > 0) {
      setTrfError(`Not enough unreserved stock to move: ${blocked.join('; ')}.`);
      return;
    }

    const data = {
      transferNumber: trfForm.transferNumber.trim(), date: trfForm.date,
      fromWarehouseId: trfForm.fromWarehouseId, fromWarehouseName: fromWh?.name || '',
      toWarehouseId: trfForm.toWarehouseId, toWarehouseName: toWh?.name || '',
      items: lines, status: trfForm.status, notes: trfForm.notes,
      createdAt: editTrf?.createdAt || todayISO,
    };
    try {
      if (editTrf) await update('stockTransfers', editTrf.id, data);
      else await create('stockTransfers', { id: newId('trf'), ...data } as StockTransfer);

      for (const id of Object.keys(deltas)) {
        if (deltas[id] === 0) continue;
        const live = db.inventoryItems.find((i) => i.id === id);
        if (!live) continue;
        await update('inventoryItems', id, { stock: Math.max(0, round2(numMin(live.stock, 0) + deltas[id])) });
      }
      for (const key of Object.keys(creations)) {
        const c = creations[key];
        if (c.qty <= 0) continue;
        await create('inventoryItems', {
          ...c.template,
          id: newId('inv'),
          warehouseId: c.warehouseId,
          warehouseName: c.warehouseName,
          stock: c.qty,
          reserved: 0,
          damaged: 0,
          createdAt: todayISO,
        } as InventoryItem);
      }
    } catch (err) {
      setTrfError((err as Error).message || 'Could not save this transfer.');
      return;
    }
    setTrfOpen(false);
    setEditTrf(null);
  };

  const deleteTrf = async (t: StockTransfer) => {
    if (!db) return;
    const received = t.status === 'Received';
    if (!confirmDelete(`transfer ${t.transferNumber}`, received ? 'The stock it moved will be returned to the source warehouse.' : undefined)) return;
    try {
      if (received) {
        // Reverse the movement before dropping the record.
        const back: Record<string, number> = {};
        t.items.forEach((ln) => {
          const qty = numMin(ln.quantity, 0);
          if (qty <= 0) return;
          const src = db.inventoryItems.find((i) => i.id === ln.itemId);
          if (!src) return;
          back[src.id] = round2((back[src.id] || 0) + qty);
          const dest = db.inventoryItems.find((i) => i.warehouseId === t.toWarehouseId && i.id !== src.id && sameProduct(i, src));
          if (dest) back[dest.id] = round2((back[dest.id] || 0) - qty);
        });
        for (const id of Object.keys(back)) {
          const live = db.inventoryItems.find((i) => i.id === id);
          if (!live || back[id] === 0) continue;
          await update('inventoryItems', id, { stock: Math.max(0, round2(numMin(live.stock, 0) + back[id])) });
        }
      }
      await remove('stockTransfers', t.id);
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that transfer.');
    }
  };

  // ── Adjustments ──
  const setAdj = (k: string, v: string) => { setAdjForm((f) => ({ ...f, [k]: v })); setAdjError(''); };

  const openNewAdj = () => {
    setAdjError('');
    setAdjForm({
      ...blankAdjustmentForm(),
      adjustmentNumber: nextDocNumber('ADJ-', db?.stockAdjustments.map((a) => a.adjustmentNumber) ?? [], 1, 4),
      performedBy: staffNames[0]?.name || '',
    });
    setAdjOpen(true);
  };

  const adjTarget = db?.inventoryItems.find((i) => i.id === adjForm.itemId) ?? null;
  const adjIsAbsolute = ABSOLUTE_TYPES.indexOf(adjForm.type) >= 0;

  /** Signed change this adjustment represents, given the item's current stock. */
  const adjDelta = (item: InventoryItem, type: StockAdjustment['type'], qty: number) => {
    if (ABSOLUTE_TYPES.indexOf(type) >= 0) return round2(qty - numMin(item.stock, 0));
    return INCREASE_TYPES.indexOf(type) >= 0 ? qty : -qty;
  };

  const saveAdj = async () => {
    if (!db) return;
    if (!adjForm.adjustmentNumber.trim()) { setAdjError('An adjustment number is required.'); return; }
    if (!adjForm.itemId) { setAdjError('Choose the item being adjusted.'); return; }
    if (!adjForm.date) { setAdjError('A date is required.'); return; }

    const item = db.inventoryItems.find((i) => i.id === adjForm.itemId);
    if (!item) { setAdjError('That item no longer exists — reopen this form.'); return; }

    const qty = num(adjForm.quantity, -1);
    if (qty < 0) { setAdjError('Enter a quantity of zero or more.'); return; }
    if (!adjIsAbsolute && qty <= 0) { setAdjError('Enter a quantity greater than zero.'); return; }
    if (!adjForm.reason.trim()) { setAdjError('A reason is required so the movement can be audited.'); return; }

    const previousStock = numMin(item.stock, 0);
    const delta = adjDelta(item, adjForm.type, qty);
    if (delta === 0) { setAdjError('That would not change the stock figure.'); return; }
    // No clamping: an adjustment whose own arithmetic does not balance is
    // worse than a blocked one.
    if (previousStock + delta < 0) {
      setAdjError(`Only ${previousStock} ${item.unit} on hand — this movement would take the stock negative.`);
      return;
    }
    const newStock = round2(previousStock + delta);

    const data = {
      adjustmentNumber: adjForm.adjustmentNumber.trim(), date: adjForm.date,
      itemId: adjForm.itemId, itemName: item.name,
      warehouseId: item.warehouseId, warehouseName: item.warehouseName,
      type: adjForm.type,
      // Signed, so previousStock + quantity === newStock always balances.
      quantity: delta,
      previousStock, newStock,
      reason: adjForm.reason.trim(), performedBy: adjForm.performedBy, createdAt: todayISO,
    };
    try {
      // One patch, so the damaged counter cannot be written from a stale read.
      const patch: Partial<InventoryItem> = { stock: newStock };
      if (adjForm.type === 'Damaged') patch.damaged = round2(numMin(item.damaged, 0) + qty);
      if (numMin(item.reserved, 0) > newStock) patch.reserved = newStock;
      await update('inventoryItems', item.id, patch);
      await create('stockAdjustments', { id: newId('adj'), ...data } as StockAdjustment);
    } catch (err) {
      setAdjError((err as Error).message || 'Could not record that adjustment.');
      return;
    }
    setAdjOpen(false);
  };

  // ── Render helpers ──
  const tabBtn = (t: Tab, label: string, Icon: typeof Package) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-plum text-white' : 'text-ink/60 hover:bg-lilac/50 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  if (!db) return <Shell module="inventory" title="Inventory & Warehouse"><div className="p-6 text-ink/50">Loading inventory…</div></Shell>;

  const trfSourceItems = db.inventoryItems.filter((i) => !trfForm.fromWarehouseId || i.warehouseId === trfForm.fromWarehouseId);

  return (
    <Shell module="inventory" title="Inventory & Warehouse">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Inventory & Warehouse</h1>
            <p className="text-sm text-ink/50 mt-0.5">Track stock across warehouses, transfers, and adjustments</p>
          </div>
          <div className="flex gap-2">
            {tab === 'items' && <AISuggestionButton onClick={() => setAiSuggestion(generateInventoryForecast(db.inventoryItems.map((i) => ({ name: i.name, stock: availableOf(i), reorderLevel: i.reorderLevel, unit: i.unit, supplier: i.supplier }))))} label="AI Forecast" />}
            {tab === 'items' && <Button onClick={openNewItem}><Plus className="w-4 h-4" /> New Item</Button>}
            {tab === 'warehouses' && <Button onClick={openNewWh}><Plus className="w-4 h-4" /> New Warehouse</Button>}
            {tab === 'transfers' && <Button onClick={openNewTrf}><Plus className="w-4 h-4" /> New Transfer</Button>}
            {tab === 'adjustments' && <Button onClick={openNewAdj}><Plus className="w-4 h-4" /> New Adjustment</Button>}
          </div>
        </div>

        {pageError && (
          <div className="mb-5 flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-coral/10 border border-coral/25">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
              <p className="text-xs text-coral font-medium">{pageError}</p>
            </div>
            <button onClick={() => setPageError('')} className="text-coral/60 hover:text-coral" title="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Boxes} label="Total Items" value={db.inventoryItems.length} sub="across all categories" tone="plum" />
          <StatCard icon={Building2} label="Active Warehouses" value={activeWarehouses} sub={`of ${db.warehouses.length} location${db.warehouses.length === 1 ? '' : 's'}`} tone="sky" />
          <StatCard icon={AlertTriangle} label="Low Stock" value={lowStockItems.length} sub="available at or below reorder level" tone="amber" />
          <StatCard icon={TrendingDown} label="Damaged Units" value={db.inventoryItems.reduce((s, i) => s + numMin(i.damaged, 0), 0)} sub="needs attention" tone="coral" />
        </div>

        {/* Valuation bar */}
        <Card className="p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink/50 font-medium">Available Valuation (at cost)</div>
              <div className="text-lg font-semibold text-ink">{fmtMoney(availableValuation)}</div>
              <div className="text-[11px] text-ink/45">{fmtMoney(grossValuation)} gross · {reservedUnits} unit{reservedUnits === 1 ? '' : 's'} reserved ({fmtMoney(reservedValuation)})</div>
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
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items, SKU, barcode…"
                className="flex-1 min-w-[200px]"
              />
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
                      <th className="py-2.5 pr-4 font-semibold text-right">Available</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Reorder</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Unit Cost</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Value</th>
                      <th className="py-2.5 pr-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => {
                      const available = availableOf(m);
                      const low = isLowStock(m, threshold);
                      return (
                        <tr key={m.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-ink">{m.name}</div>
                            {m.supplier && <div className="text-[11px] text-ink/45">{m.supplier}</div>}
                          </td>
                          <td className="py-3 pr-4 text-ink/70">{m.category}</td>
                          <td className="py-3 pr-4 text-ink/60 font-mono text-xs">{m.sku || '—'}</td>
                          <td className="py-3 pr-4 text-ink/60">{m.warehouseName || '—'}</td>
                          <td className="py-3 pr-4 text-right text-ink">
                            {numMin(m.stock, 0)} {m.unit}
                            {m.damaged > 0 && <span className="block text-[10px] text-coral">{m.damaged} damaged</span>}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className={low ? 'text-amber-600 font-semibold' : 'text-ink'}>
                              {available} {m.unit}
                            </span>
                            {m.reserved > 0 && <span className="block text-[10px] text-ink/45">{m.reserved} reserved</span>}
                          </td>
                          <td className="py-3 pr-4 text-right text-ink/60">{m.reorderLevel} {m.unit}</td>
                          <td className="py-3 pr-4 text-right text-ink/60">{fmtMoney(numMin(m.unitCost, 0))}</td>
                          <td className="py-3 pr-4 text-right text-ink font-medium">
                            {fmtMoney(round2(available * numMin(m.unitCost, 0)))}
                            {m.reserved > 0 && <span className="block text-[10px] text-ink/45">{fmtMoney(round2(numMin(m.stock, 0) * numMin(m.unitCost, 0)))} gross</span>}
                          </td>
                          <td className="py-3 pr-2 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEditItem(m)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-plum hover:bg-lilac transition-colors" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteItem(m)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors" title="Delete">
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
                  const held = db.inventoryItems.filter((i) => i.warehouseId === w.id);
                  const totalUnits = held.reduce((s, i) => s + numMin(i.stock, 0), 0);
                  return (
                    <Card key={w.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
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
                          <span className="font-semibold text-ink">{held.length}</span> items · <span className="font-semibold text-ink">{totalUnits}</span> units
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditWh(w)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-plum hover:bg-lilac transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteWh(w)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors" title="Delete">
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
                      <th className="py-2.5 pr-4 font-semibold text-right">Units</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 pr-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.stockTransfers.map((t) => (
                      <tr key={t.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-ink font-mono text-xs">{t.transferNumber}</td>
                        <td className="py-3 pr-4 text-ink/60">{t.date}</td>
                        <td className="py-3 pr-4 text-ink/70">{t.fromWarehouseName || '—'}</td>
                        <td className="py-3 pr-4 text-ink/70">{t.toWarehouseName || '—'}</td>
                        <td className="py-3 pr-4 text-ink/60">{t.items.length} item(s)</td>
                        <td className="py-3 pr-4 text-right text-ink/60">{t.items.reduce((s, i) => s + numMin(i.quantity, 0), 0)}</td>
                        <td className="py-3 pr-4"><Badge status={t.status} /></td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEditTrf(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-plum hover:bg-lilac transition-colors" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteTrf(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors" title="Delete">
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
                      <th className="py-2.5 pr-4 font-semibold text-right">Change</th>
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
                        <td className="py-3 pr-4 text-ink/60">{a.warehouseName || '—'}</td>
                        <td className="py-3 pr-4"><Badge status={a.type} /></td>
                        <td className={`py-3 pr-4 text-right font-medium ${a.quantity < 0 ? 'text-coral' : 'text-ink'}`}>{a.quantity > 0 ? '+' : ''}{a.quantity}</td>
                        <td className="py-3 pr-4 text-right text-ink/60">{a.previousStock}</td>
                        <td className="py-3 pr-4 text-right text-ink font-semibold">{a.newStock}</td>
                        <td className="py-3 pr-4 text-ink/60 max-w-[200px] truncate">{a.reason}</td>
                        <td className="py-3 pr-4 text-ink/60">{a.performedBy || '—'}</td>
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
          <ErrorNote message={itemError} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Item Name" required><Input value={itemForm.name} onChange={(e) => setItem('name', e.target.value)} placeholder="e.g. Surgical Drill Set" /></Field>
            <Field label="Category">
              <Select value={itemForm.category} onChange={(e) => setItem('category', e.target.value)}>
                {invCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="SKU" hint="Used to match the same product across warehouses."><Input className="font-mono" value={itemForm.sku} onChange={(e) => setItem('sku', e.target.value)} placeholder="SE-001" /></Field>
            <Field label="Barcode"><Input className="font-mono" value={itemForm.barcode} onChange={(e) => setItem('barcode', e.target.value)} /></Field>
            <Field label="Unit"><Input value={itemForm.unit} onChange={(e) => setItem('unit', e.target.value)} placeholder="set, bag, unit…" /></Field>
            <Field label="Warehouse" required>
              <Select value={itemForm.warehouseId} onChange={(e) => setItem('warehouseId', e.target.value)}>
                <option value="">— Select —</option>
                {db.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Stock"><NumberInput value={itemForm.stock} onChange={(e) => setItem('stock', e.target.value)} placeholder="0" min={0} /></Field>
            <Field label="Reserved" hint="Committed units, excluded from availability and valuation."><NumberInput value={itemForm.reserved} onChange={(e) => setItem('reserved', e.target.value)} placeholder="0" min={0} /></Field>
            <Field label="Damaged"><NumberInput value={itemForm.damaged} onChange={(e) => setItem('damaged', e.target.value)} placeholder="0" min={0} /></Field>
            <Field label="Reorder Level"><NumberInput value={itemForm.reorderLevel} onChange={(e) => setItem('reorderLevel', e.target.value)} placeholder="0" min={0} /></Field>
            <Field label="Reorder Qty"><NumberInput value={itemForm.reorderQty} onChange={(e) => setItem('reorderQty', e.target.value)} placeholder="0" min={0} /></Field>
            <Field label="Unit Cost"><NumberInput value={itemForm.unitCost} onChange={(e) => setItem('unitCost', e.target.value)} placeholder="0.00" min={0} step={0.01} /></Field>
            <Field label="Unit Price"><NumberInput value={itemForm.unitPrice} onChange={(e) => setItem('unitPrice', e.target.value)} placeholder="0.00" min={0} step={0.01} /></Field>
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
          <ErrorNote message={whError} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Warehouse Name" required><Input value={whForm.name} onChange={(e) => setWh('name', e.target.value)} placeholder="e.g. Vetnora Main Store" /></Field>
            <Field label="Code" required><Input className="font-mono" value={whForm.code} onChange={(e) => setWh('code', e.target.value)} placeholder="WH-NG-01" /></Field>
            <Field label="Branch">
              <Select value={whForm.branch} onChange={(e) => setWh('branch', e.target.value)}>
                <option value="">— Select —</option>
                <option value="Vetnora">Vetnora</option>
                <option value="Riverside">Riverside</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={whForm.status} onChange={(e) => setWh('status', e.target.value)}>
                {warehouseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Manager"><Input value={whForm.manager} onChange={(e) => setWh('manager', e.target.value)} /></Field>
            <Field label="Phone"><Input type="tel" value={whForm.phone} onChange={(e) => setWh('phone', e.target.value)} /></Field>
            <Field label="Capacity"><NumberInput value={whForm.capacity} onChange={(e) => setWh('capacity', e.target.value)} placeholder="0" min={0} /></Field>
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
          <ErrorNote message={trfError} />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Transfer #" required><Input className="font-mono" value={trfForm.transferNumber} onChange={(e) => setTrf('transferNumber', e.target.value)} /></Field>
            <Field label="Date" required><DateInput value={trfForm.date} onChange={(e) => setTrf('date', e.target.value)} /></Field>
            <Field label="From Warehouse" required>
              <Select value={trfForm.fromWarehouseId} onChange={(e) => { setTrf('fromWarehouseId', e.target.value); setTrfForm((f) => ({ ...f, items: [] })); }}>
                <option value="">— Select —</option>
                {db.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="To Warehouse" required>
              <Select value={trfForm.toWarehouseId} onChange={(e) => setTrf('toWarehouseId', e.target.value)}>
                <option value="">— Select —</option>
                {db.warehouses.filter((w) => w.id !== trfForm.fromWarehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="Status" hint={trfForm.status === 'Received' ? 'Stock moves between the warehouses on save.' : 'Stock only moves once this is Received.'}>
              <Select value={trfForm.status} onChange={(e) => setTrf('status', e.target.value)}>
                {transferStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Items</span>
              <Button size="sm" variant="outline" onClick={addTrfItem} disabled={!trfForm.fromWarehouseId}><Plus className="w-3.5 h-3.5" /> Add Item</Button>
            </div>
            {!trfForm.fromWarehouseId ? (
              <p className="text-sm text-ink/40 py-4 text-center bg-canvas rounded-xl">Choose the source warehouse first.</p>
            ) : trfForm.items.length === 0 ? (
              <p className="text-sm text-ink/40 py-4 text-center bg-canvas rounded-xl">No items added yet.</p>
            ) : (
              <div className="space-y-2">
                {trfForm.items.map((it, idx) => {
                  const src = db.inventoryItems.find((i) => i.id === it.itemId);
                  return (
                    <div key={it.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select value={it.itemId} onChange={(e) => onTrfItemSelect(idx, e.target.value)}>
                          <option value="">— Select item —</option>
                          {trfSourceItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                      </div>
                      <div className="w-24">
                        <NumberInput value={String(it.quantity)} min={0} onChange={(e) => setTrfItem(idx, 'quantity', numMin(e.target.value, 0))} placeholder="Qty" />
                      </div>
                      <div className="w-32 text-xs text-ink/50 py-2">
                        {it.unit || 'unit'}{src ? ` · ${availableOf(src)} avail.` : ''}
                      </div>
                      <button onClick={() => removeTrfItem(idx)} className="w-9 h-10 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors" title="Remove line">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
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
          <ErrorNote message={adjError} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adjustment #" required><Input className="font-mono" value={adjForm.adjustmentNumber} onChange={(e) => setAdj('adjustmentNumber', e.target.value)} /></Field>
            <Field label="Date" required><DateInput value={adjForm.date} onChange={(e) => setAdj('date', e.target.value)} /></Field>
            <div className="col-span-2">
              <Field label="Item" required>
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
            <Field
              label={adjIsAbsolute ? 'Counted quantity' : 'Quantity'}
              required
              hint={adjIsAbsolute ? 'Stock is set to this figure, not increased by it.' : 'Positive number — the type decides the direction.'}
            >
              <NumberInput value={adjForm.quantity} min={0} onChange={(e) => setAdj('quantity', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Performed By">
              <Select value={adjForm.performedBy} onChange={(e) => setAdj('performedBy', e.target.value)}>
                <option value="">— Select staff —</option>
                {staffNames.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-end">
              {adjTarget && adjForm.quantity !== '' && (
                <div className="text-[11px] text-ink/55 pb-2.5">
                  {numMin(adjTarget.stock, 0)} → <span className="font-semibold text-ink">{Math.max(0, round2(numMin(adjTarget.stock, 0) + adjDelta(adjTarget, adjForm.type, numMin(adjForm.quantity, 0))))}</span> {adjTarget.unit}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <Field label="Reason" required hint="Stored on the adjustment record for the audit trail."><Textarea value={adjForm.reason} onChange={(e) => setAdj('reason', e.target.value)} placeholder="Reason for adjustment…" /></Field>
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
