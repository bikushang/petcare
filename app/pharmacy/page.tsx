'use client';

import { useMemo, useState } from 'react';
import {
  Pill, Plus, AlertTriangle, Package, Edit2, Trash2,
  Truck, ShoppingCart, HandHeart, Receipt, Barcode,
  ChevronDown, ChevronUp, X, Clock, TrendingDown, RotateCcw,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, Input, SearchInput, Select, DateInput, NumberInput, Textarea, Checkbox, Badge, Tabs } from '../components/ui';
import {
  useDB, MedStock, Supplier, Purchase, PurchaseItem, PharmacySale, SaleItem, Batch, StockAdjustment,
  newId,
} from '../lib/store';
import {
  localDateISO, daysBetween, num, numMin, round2,
  nextDocNumber, confirmDelete, confirmAction,
} from '../lib/helpers';
import { useSettings, formatMoney, lowStockThresholdOf } from '../lib/settings';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateInventoryForecast } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const categories = ['Medicine', 'Vaccine', 'Supplement', 'Consumable', 'Equipment', 'Food'] as const;
const purchaseStatuses = ['Draft', 'Ordered', 'Partially received', 'Received', 'Cancelled'] as const;
const saleStatuses = ['Completed', 'Pending', 'Refunded'] as const;
const paymentMethods = ['Cash', 'Card', 'Transfer', 'Insurance'] as const;

/** Roles allowed to dispense — the list used to be three hardcoded names. */
const DISPENSING_ROLES = ['Pharmacist', 'Veterinarian', 'Veterinary Nurse'];

/**
 * Pharmacy adjustments are written to the same `stockAdjustments` audit log as
 * the warehouse ones, so the values here are the shared `StockAdjustment`
 * types and only the labels are pharmacy-flavoured.
 */
type AdjustKind = 'Stock in' | 'Stock out' | 'Damaged' | 'Return to supplier';
const adjustKinds: { value: AdjustKind; label: string }[] = [
  { value: 'Stock in', label: 'Addition (restock)' },
  { value: 'Stock out', label: 'Removal (use / loss)' },
  { value: 'Damaged', label: 'Damage / write-off' },
  { value: 'Return to supplier', label: 'Return to supplier' },
];

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
  poNumber: '', supplierId: '', date: localDateISO(), receivedDate: '',
  items: [] as PurchaseItem[], subtotal: 0, tax: 0, discount: 0, total: 0,
  status: 'Draft' as Purchase['status'], notes: '',
});

const blankSaleForm = () => ({
  saleNumber: '', date: localDateISO(), customerName: '', petName: '', ownerId: '',
  items: [] as SaleItem[], subtotal: 0, tax: 0, discount: 0, total: 0,
  paymentMethod: 'Cash' as PharmacySale['paymentMethod'], status: 'Completed' as PharmacySale['status'],
  dispensedBy: '', notes: '',
});

/* ════════════════════════════════════════════════════════════════════
   Document money — one implementation, used by the footer and the save
   ────────────────────────────────────────────────────────────────────
   `total` used to be `subtotal - (discount + tax)`, so tax was subtracted
   and the modal footer disagreed with the record that got written. A
   discount or tax typed after the line items also never reached the
   stored total, because only `setPurItem` / `setSaleItem` recomputed it.
   ════════════════════════════════════════════════════════════════════ */

const purchaseLineTotal = (it: PurchaseItem) => round2(numMin(it.quantity, 0) * numMin(it.unitCost, 0));
const saleLineTotal = (it: SaleItem) =>
  round2(numMin(it.quantity, 0) * numMin(it.unitPrice, 0) - numMin(it.discount, 0));

function docMoney(items: { lineTotal: number }[], discount: number, tax: number) {
  const subtotal = round2(items.reduce((s, it) => s + num(it.lineTotal), 0));
  return { subtotal, total: round2(subtotal - numMin(discount, 0) + numMin(tax, 0)) };
}

/* ════════════════════════════════════════════════════════════════════
   Stock engine
   ────────────────────────────────────────────────────────────────────
   `stock` and `batches[]` were independent inputs that drifted apart
   permanently: no sale, adjustment, refund or receipt ever touched a
   batch row. Stock is now *derived* from the batch sum whenever batches
   exist, and every movement goes through these functions so additions,
   deductions and reversals all keep the two in step. Deductions are
   FEFO (first expiry, first out).
   ════════════════════════════════════════════════════════════════════ */

const FAR_FUTURE = '9999-12-31';

type StockPatch = { stock: number; batches?: Batch[] };

const batchSum = (batches: Batch[]) => batches.reduce((s, b) => s + numMin(b.quantity, 0), 0);

/** Units on hand: the batch sum when batches exist, otherwise the scalar. */
const availableOf = (m: MedStock) => {
  const batches = m.batches ?? [];
  return batches.length > 0 ? batchSum(batches) : numMin(m.stock, 0);
};

/** Earliest expiry that still has units behind it. */
const expiryOf = (m: MedStock) => {
  const dated = (m.batches ?? [])
    .filter((b) => b.expiry && numMin(b.quantity, 0) > 0)
    .map((b) => b.expiry);
  if (dated.length === 0) return m.expiry || '';
  return dated.reduce((a, b) => (b < a ? b : a));
};

/** Batch indices, earliest expiry first; undated batches last. */
const fefo = (batches: Batch[]) =>
  batches
    .map((_, i) => i)
    .sort((a, b) => {
      const ea = batches[a].expiry || FAR_FUTURE;
      const eb = batches[b].expiry || FAR_FUTURE;
      return ea === eb ? a - b : ea < eb ? -1 : 1;
    });

function deduct(batches: Batch[], qty: number) {
  let left = qty;
  for (const i of fefo(batches)) {
    if (left <= 0) break;
    const take = Math.min(batches[i].quantity, left);
    batches[i].quantity = round2(batches[i].quantity - take);
    left = round2(left - take);
  }
}

const workingBatches = (m: MedStock) =>
  (m.batches ?? []).map((b) => ({ ...b, quantity: numMin(b.quantity, 0) }));

/**
 * Apply a signed movement and return the patch to persist. A deduction
 * empties the earliest-expiring batch first; an addition with no nominated
 * batch goes back into the earliest-expiring batch, which is the exact
 * reverse of a deduction.
 */
function movementPatch(m: MedStock, delta: number): StockPatch {
  const batches = workingBatches(m);
  if (batches.length === 0) return { stock: Math.max(0, round2(numMin(m.stock, 0) + delta)) };
  if (delta < 0) deduct(batches, -delta);
  else if (delta > 0) batches[fefo(batches)[0]].quantity = round2(batches[fefo(batches)[0]].quantity + delta);
  return { stock: batchSum(batches), batches };
}

/** Book received purchase lines in, creating or topping up their batches. */
function receiptPatch(m: MedStock, lines: PurchaseItem[], receivedDate: string, supplierId: string): StockPatch {
  const batches = workingBatches(m);
  let unbatched = 0;
  lines.forEach((ln) => {
    const qty = numMin(ln.quantity, 0);
    if (qty <= 0) return;
    const number = (ln.batchNumber || '').trim();
    if (!number) {
      unbatched = round2(unbatched + qty);
      return;
    }
    const existing = batches.find((b) => b.batchNumber === number);
    if (existing) {
      existing.quantity = round2(existing.quantity + qty);
      if (!existing.expiry && ln.expiry) existing.expiry = ln.expiry;
      if (numMin(ln.unitCost, 0) > 0) existing.costPerUnit = numMin(ln.unitCost, 0);
    } else {
      batches.push({
        id: newId('b'),
        batchNumber: number,
        quantity: qty,
        expiry: ln.expiry || '',
        receivedDate,
        supplierId,
        costPerUnit: numMin(ln.unitCost, 0),
      });
    }
  });
  if (batches.length === 0) return { stock: Math.max(0, round2(numMin(m.stock, 0) + unbatched)) };
  if (unbatched > 0) {
    const i = fefo(batches)[0];
    batches[i].quantity = round2(batches[i].quantity + unbatched);
  }
  return { stock: batchSum(batches), batches };
}

/** Undo a receipt — take the units back out of the batches they went into. */
function receiptReversalPatch(m: MedStock, lines: PurchaseItem[]): StockPatch {
  let batches = workingBatches(m);
  const total = lines.reduce((s, ln) => s + numMin(ln.quantity, 0), 0);
  if (batches.length === 0) return { stock: Math.max(0, round2(numMin(m.stock, 0) - total)) };

  const touched: string[] = [];
  let spill = 0;
  lines.forEach((ln) => {
    const qty = numMin(ln.quantity, 0);
    if (qty <= 0) return;
    const number = (ln.batchNumber || '').trim();
    const target = number ? batches.find((b) => b.batchNumber === number) : undefined;
    if (!target) {
      spill = round2(spill + qty);
      return;
    }
    const take = Math.min(target.quantity, qty);
    target.quantity = round2(target.quantity - take);
    touched.push(target.batchNumber);
    spill = round2(spill + qty - take);
  });
  if (spill > 0) deduct(batches, spill);

  // Batch rows this receipt created and has now fully handed back go away.
  batches = batches.filter((b) => b.quantity > 0 || touched.indexOf(b.batchNumber) < 0);
  return { stock: batchSum(batches), batches };
}

/**
 * Sum line quantities per stock item. Two lines for the same medicine have to
 * net into a single `update`, otherwise both compute from the same render
 * snapshot and only the last deduction survives.
 */
function qtyByItem(lines: { stockItemId: string; quantity: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  lines.forEach((l) => {
    if (!l.stockItemId) return;
    out[l.stockItemId] = round2((out[l.stockItemId] || 0) + numMin(l.quantity, 0));
  });
  return out;
}

function linesByItem<T extends { stockItemId: string }>(lines: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  lines.forEach((l) => {
    if (!l.stockItemId) return;
    if (!out[l.stockItemId]) out[l.stockItemId] = [];
    out[l.stockItemId].push(l);
  });
  return out;
}

/** A sale only holds stock out of inventory while it is Completed. */
const holdsStock = (status?: PharmacySale['status']) => status === 'Completed';

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-coral/10 border border-coral/25">
      <AlertTriangle className="w-3.5 h-3.5 text-coral shrink-0 mt-0.5" />
      <p className="text-[11px] font-medium text-coral">{message}</p>
    </div>
  );
}

export default function PharmacyPage() {
  const { db, create, update, remove } = useDB();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('inventory');
  const [pageError, setPageError] = useState('');

  // Inventory state
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [medOpen, setMedOpen] = useState(false);
  const [editMed, setEditMed] = useState<MedStock | null>(null);
  const [medForm, setMedForm] = useState(blankMedForm());
  const [medError, setMedError] = useState('');
  const [expandedMed, setExpandedMed] = useState<string | null>(null);

  // Supplier state
  const [supOpen, setSupOpen] = useState(false);
  const [editSup, setEditSup] = useState<Supplier | null>(null);
  const [supForm, setSupForm] = useState(blankSupplierForm());
  const [supError, setSupError] = useState('');

  // Purchase state
  const [purOpen, setPurOpen] = useState(false);
  const [editPur, setEditPur] = useState<Purchase | null>(null);
  const [purForm, setPurForm] = useState(blankPurchaseForm());
  const [purError, setPurError] = useState('');

  // Sale state
  const [saleOpen, setSaleOpen] = useState(false);
  const [editSale, setEditSale] = useState<PharmacySale | null>(null);
  const [saleForm, setSaleForm] = useState(blankSaleForm());
  const [saleError, setSaleError] = useState('');

  // Adjust state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustMed, setAdjustMed] = useState<MedStock | null>(null);
  const [adjustForm, setAdjustForm] = useState({ qty: '', reason: '', performedBy: '', type: 'Stock in' as AdjustKind });
  const [adjustError, setAdjustError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const money = (n: number) => formatMoney(n, settings);
  const threshold = lowStockThresholdOf(settings);
  const todayISO = localDateISO();

  /** Staff who may dispense, from the database rather than a hardcoded list. */
  const dispensers = useMemo(() => {
    if (!db) return [] as { id: string; name: string }[];
    const preferred = db.staff.filter((s) => s.status === 'Active' && DISPENSING_ROLES.indexOf(s.role) >= 0);
    const pool = preferred.length > 0 ? preferred : db.staff.filter((s) => s.role !== 'Pet Owner');
    return pool.map((s) => ({ id: s.id, name: s.name }));
  }, [db]);

  // ---- Inventory ----
  const setMed = (k: string, v: string | number | boolean) => { setMedForm((f) => ({ ...f, [k]: v })); setMedError(''); };

  const items = useMemo(() => {
    if (!db) return [];
    const q = search.toLowerCase();
    return db.medStock.filter((m) => {
      const matchesFilter = filter === 'all' || m.category === filter;
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q) || (m.supplier || '').toLowerCase().includes(q) || (m.batch || '').toLowerCase().includes(q) || (m.barcode || '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [db, filter, search]);

  /**
   * One low-stock rule for the banner, the stat card and the row badge, using
   * the configured threshold when an item has no reorder level of its own.
   */
  const isLow = (m: MedStock) => availableOf(m) <= (m.reorderLevel > 0 ? m.reorderLevel : threshold);
  const daysToExpiry = (m: MedStock) => {
    const e = expiryOf(m);
    return e ? daysBetween(todayISO, e) : null;
  };

  const lowStock = db?.medStock.filter(isLow) ?? [];
  const expiringSoon = db?.medStock.filter((m) => {
    const d = daysToExpiry(m);
    return d !== null && d >= 0 && d <= 90;
  }) ?? [];
  const expired = db?.medStock.filter((m) => {
    const d = daysToExpiry(m);
    return d !== null && d < 0;
  }) ?? [];

  const openNewMed = () => {
    setEditMed(null);
    setMedError('');
    setMedForm({ ...blankMedForm(), barcode: `BC-${Date.now().toString().slice(-6)}`, qrCode: `QR-${Date.now().toString().slice(-6)}` });
    setMedOpen(true);
  };

  const openEditMed = (m: MedStock) => {
    setEditMed(m);
    setMedError('');
    setMedForm({
      name: m.name, category: m.category, stock: String(m.stock), unit: m.unit,
      reorderLevel: String(m.reorderLevel), reorderQty: String(m.reorderQty || 0),
      price: String(m.price), barcode: m.barcode || '', qrCode: m.qrCode || '',
      genericName: m.genericName || '', manufacturer: m.manufacturer || '', supplier: m.supplier || '',
      supplierId: m.supplierId || '', dosageForm: m.dosageForm || '', strength: m.strength || '',
      dosageInfo: m.dosageInfo || '', activeIngredients: m.activeIngredients || '',
      storageCondition: m.storageCondition || '', prescriptionRequired: m.prescriptionRequired || false,
      controlledDrug: m.controlledDrug || false,
      // Give every batch a stable id so the form rows can key on it.
      batches: (m.batches || []).map((b) => ({ ...b, id: b.id || newId('b') })),
      batch: m.batch || '', expiry: m.expiry || '',
    });
    setMedOpen(true);
  };

  const saveMed = async () => {
    if (!medForm.name.trim()) { setMedError('An item name is required.'); return; }
    if (!medForm.unit.trim()) { setMedError('A unit (tablet, ml, bag…) is required.'); return; }

    const batches = medForm.batches
      .filter((b) => b.batchNumber.trim() !== '' || numMin(b.quantity, 0) > 0)
      .map((b) => ({
        ...b,
        id: b.id || newId('b'),
        batchNumber: b.batchNumber.trim(),
        quantity: numMin(b.quantity, 0),
        costPerUnit: numMin(b.costPerUnit, 0),
      }));
    if (batches.some((b) => !b.batchNumber)) { setMedError('Every batch with a quantity needs a batch number.'); return; }

    // Stock is derived from the batch sum when batches exist, so the two can
    // never drift apart again.
    const stock = batches.length > 0 ? batchSum(batches) : numMin(medForm.stock, 0);
    const ordered = fefo(batches).map((i) => batches[i]);
    const lead = ordered.find((b) => b.quantity > 0) ?? ordered[0];

    const data = {
      name: medForm.name.trim(), category: medForm.category, stock,
      unit: medForm.unit.trim() || 'unit', reorderLevel: numMin(medForm.reorderLevel, 0),
      reorderQty: numMin(medForm.reorderQty, 0), price: numMin(medForm.price, 0),
      barcode: medForm.barcode, qrCode: medForm.qrCode, genericName: medForm.genericName,
      manufacturer: medForm.manufacturer, supplier: medForm.supplier, supplierId: medForm.supplierId,
      dosageForm: medForm.dosageForm, strength: medForm.strength, dosageInfo: medForm.dosageInfo,
      activeIngredients: medForm.activeIngredients, storageCondition: medForm.storageCondition,
      prescriptionRequired: medForm.prescriptionRequired, controlledDrug: medForm.controlledDrug,
      batches,
      batch: batches.length > 0 ? lead?.batchNumber || '' : medForm.batch,
      expiry: batches.length > 0 ? lead?.expiry || '' : medForm.expiry,
      createdAt: editMed?.createdAt || todayISO,
    };
    try {
      if (editMed) await update('medStock', editMed.id, data);
      else await create('medStock', { id: newId('stk'), ...data } as MedStock);
    } catch (err) {
      setMedError((err as Error).message || 'Could not save this item.');
      return;
    }
    setMedOpen(false);
    setEditMed(null);
  };

  const deleteMed = async (m: MedStock) => {
    if (!db) return;
    const onSales = db.pharmacySales.filter((s) => s.items.some((i) => i.stockItemId === m.id)).length;
    const onOrders = db.purchases.filter((p) => p.items.some((i) => i.stockItemId === m.id)).length;
    const refs = [onSales && `${onSales} sale${onSales > 1 ? 's' : ''}`, onOrders && `${onOrders} purchase order${onOrders > 1 ? 's' : ''}`]
      .filter(Boolean).join(' and ');
    if (!confirmDelete(`${m.name} (${availableOf(m)} ${m.unit} on hand)`, refs ? `It is referenced by ${refs}, which will keep showing its name.` : undefined)) return;
    try {
      await remove('medStock', m.id);
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that item.');
    }
  };

  const openAdjust = (m: MedStock) => {
    setAdjustMed(m);
    setAdjustError('');
    setAdjustForm({ qty: '', reason: '', performedBy: dispensers[0]?.name || '', type: 'Stock in' });
    setAdjustOpen(true);
  };

  /**
   * A stock adjustment now (a) gets the sign right — a return to supplier
   * leaves the shelf — (b) persists the type and reason as a `stockAdjustments`
   * audit record, and (c) refuses to take out more than is on hand instead of
   * clamping at zero and losing the shortfall.
   */
  const saveAdjust = async () => {
    if (!db || !adjustMed) return;
    const live = db.medStock.find((m) => m.id === adjustMed.id);
    if (!live) { setAdjustError('That item no longer exists — close and reopen the page.'); return; }

    const qty = num(adjustForm.qty, 0);
    if (qty <= 0) { setAdjustError('Enter a quantity greater than zero.'); return; }

    const adds = adjustForm.type === 'Stock in';
    if (!adds && !adjustForm.reason.trim()) {
      setAdjustError('A reason is required for any adjustment that removes stock.');
      return;
    }
    const have = availableOf(live);
    if (!adds && qty > have) {
      setAdjustError(`Only ${have} ${live.unit} on hand — adjust the quantity, this movement cannot be recorded.`);
      return;
    }

    const delta = adds ? qty : -qty;
    const patch = movementPatch(live, delta);
    const record = {
      adjustmentNumber: nextDocNumber('ADJ-', db.stockAdjustments.map((a) => a.adjustmentNumber), 1, 4),
      date: todayISO,
      itemId: live.id,
      itemName: live.name,
      warehouseId: '',
      warehouseName: 'Pharmacy',
      type: adjustForm.type,
      // Signed, so previousStock + quantity === newStock always balances.
      quantity: delta,
      previousStock: have,
      newStock: patch.stock,
      reason: adjustForm.reason.trim(),
      performedBy: adjustForm.performedBy,
      createdAt: todayISO,
    };
    try {
      await update('medStock', live.id, patch);
      await create('stockAdjustments', { id: newId('adj'), ...record } as StockAdjustment);
    } catch (err) {
      setAdjustError((err as Error).message || 'Could not record that adjustment.');
      return;
    }
    setAdjustOpen(false);
    setAdjustMed(null);
  };

  // ---- Suppliers ----
  const setSup = (k: string, v: string) => { setSupForm((f) => ({ ...f, [k]: v })); setSupError(''); };

  const openNewSup = () => {
    setEditSup(null);
    setSupError('');
    setSupForm({ ...blankSupplierForm(), code: nextDocNumber('SUP-', db?.suppliers.map((s) => s.code) ?? [], 1, 3) });
    setSupOpen(true);
  };

  const openEditSup = (s: Supplier) => {
    setEditSup(s);
    setSupError('');
    setSupForm({ name: s.name, code: s.code, contactPerson: s.contactPerson, phone: s.phone, email: s.email, address: s.address, category: s.category, paymentTerms: s.paymentTerms, leadTimeDays: String(s.leadTimeDays), notes: s.notes });
    setSupOpen(true);
  };

  const saveSup = async () => {
    if (!supForm.name.trim()) { setSupError('A supplier name is required.'); return; }
    if (!supForm.code.trim()) { setSupError('A supplier code is required.'); return; }
    const data = {
      name: supForm.name.trim(), code: supForm.code.trim(), contactPerson: supForm.contactPerson,
      phone: supForm.phone, email: supForm.email, address: supForm.address,
      category: supForm.category, paymentTerms: supForm.paymentTerms,
      leadTimeDays: numMin(supForm.leadTimeDays, 0), notes: supForm.notes,
      createdAt: editSup?.createdAt || todayISO,
    };
    try {
      if (editSup) {
        await update('suppliers', editSup.id, data);
        // Items carry a denormalised supplier name — keep it in step on rename.
        if (db && editSup.name !== data.name) {
          const stale = db.medStock.filter((m) => m.supplierId === editSup.id);
          for (const m of stale) await update('medStock', m.id, { supplier: data.name });
        }
      } else {
        await create('suppliers', { id: newId('sup'), ...data } as Supplier);
      }
    } catch (err) {
      setSupError((err as Error).message || 'Could not save this supplier.');
      return;
    }
    setSupOpen(false);
    setEditSup(null);
  };

  const deleteSup = async (s: Supplier) => {
    if (!db) return;
    const linked = db.medStock.filter((m) => m.supplierId === s.id);
    const orders = db.purchases.filter((p) => p.supplierId === s.id).length;
    const extra = [
      linked.length > 0 && `${linked.length} item${linked.length > 1 ? 's' : ''} will lose their supplier link`,
      orders > 0 && `${orders} purchase order${orders > 1 ? 's' : ''} will keep the name for the record`,
    ].filter(Boolean).join('; ');
    if (!confirmDelete(`supplier ${s.name}`, extra || undefined)) return;
    try {
      await remove('suppliers', s.id);
      for (const m of linked) await update('medStock', m.id, { supplierId: '', supplier: '' });
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that supplier.');
    }
  };

  // ---- Purchases ----
  const purMoney = docMoney(purForm.items, purForm.discount, purForm.tax);

  /** Every change recomputes the stored total, not just the line-item edits. */
  const setPur = (k: string, v: string | number) =>
    setPurForm((f) => {
      const next = { ...f, [k]: v };
      return { ...next, ...docMoney(next.items, num(next.discount), num(next.tax)) };
    });

  const setPurItem = (idx: number, k: keyof PurchaseItem, v: string | number) => {
    setPurError('');
    setPurForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [k]: v };
        updated.lineTotal = purchaseLineTotal(updated);
        return updated;
      });
      return { ...f, items, ...docMoney(items, f.discount, f.tax) };
    });
  };

  const addPurItem = () => setPurForm((f) => ({ ...f, items: [...f.items, { ...blankPurchaseItem(), id: newId('pi') }] }));
  const removePurItem = (idx: number) =>
    setPurForm((f) => {
      const items = f.items.filter((_, i) => i !== idx);
      return { ...f, items, ...docMoney(items, f.discount, f.tax) };
    });

  const onPurStockSelect = (idx: number, stockId: string) => {
    const med = db?.medStock.find((m) => m.id === stockId);
    setPurError('');
    setPurForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const lastCost = med && med.batches?.length ? numMin(med.batches[med.batches.length - 1].costPerUnit, 0) : 0;
        const updated: PurchaseItem = {
          ...it,
          stockItemId: stockId,
          itemName: med?.name || '',
          unit: med?.unit || '',
          unitCost: lastCost > 0 ? lastCost : numMin(it.unitCost, 0),
        };
        updated.lineTotal = purchaseLineTotal(updated);
        return updated;
      });
      return { ...f, items, ...docMoney(items, f.discount, f.tax) };
    });
  };

  const openNewPur = () => {
    setEditPur(null);
    setPurError('');
    setPurForm({ ...blankPurchaseForm(), poNumber: nextDocNumber('PO-', db?.purchases.map((p) => p.poNumber) ?? [], 1, 4) });
    setPurOpen(true);
  };

  const openEditPur = (p: Purchase) => {
    setEditPur(p);
    setPurError('');
    setPurForm({
      poNumber: p.poNumber, supplierId: p.supplierId, date: p.date, receivedDate: p.receivedDate,
      items: p.items.map((i) => ({ ...i, id: i.id || newId('pi') })),
      subtotal: p.subtotal, tax: p.tax, discount: p.discount,
      total: p.total, status: p.status, notes: p.notes,
    });
    setPurOpen(true);
  };

  /**
   * Saving a purchase order now actually receives the goods: marking it
   * "Received" increases stock and appends the batch number and expiry typed
   * on each line, and moving it back out of "Received" takes them off again.
   */
  const savePur = async () => {
    if (!db) return;
    const items = purForm.items;
    if (!purForm.poNumber.trim()) { setPurError('A PO number is required.'); return; }
    if (!purForm.supplierId) { setPurError('Choose the supplier this order goes to.'); return; }
    if (!purForm.date) { setPurError('An order date is required.'); return; }
    if (items.length === 0) { setPurError('Add at least one item to the order.'); return; }
    if (items.some((it) => !it.stockItemId)) { setPurError('Every line needs an item selected.'); return; }
    if (items.some((it) => numMin(it.quantity, 0) <= 0)) { setPurError('Every line needs a quantity greater than zero.'); return; }
    if (numMin(purForm.discount, 0) > purMoney.subtotal) { setPurError('The discount cannot be more than the subtotal.'); return; }

    const wasReceived = editPur?.status === 'Received';
    const isReceived = purForm.status === 'Received';
    const receivedDate = isReceived ? purForm.receivedDate || todayISO : purForm.receivedDate;

    // Plan every stock movement before writing anything: reverse the old
    // receipt, then book the new one, chaining patches per medicine so two
    // lines for the same item cannot both compute from the same snapshot.
    const plan: Record<string, StockPatch> = {};
    const medAfterPlan = (id: string): MedStock | null => {
      const base = db.medStock.find((m) => m.id === id);
      if (!base) return null;
      const p = plan[id];
      return p ? { ...base, stock: p.stock, batches: p.batches ?? base.batches } : base;
    };

    if (wasReceived && editPur) {
      const prev = linesByItem(editPur.items);
      const blocked: string[] = [];
      for (const id of Object.keys(prev)) {
        const med = medAfterPlan(id);
        if (!med) continue;
        const back = prev[id].reduce((s, l) => s + numMin(l.quantity, 0), 0);
        const have = availableOf(med);
        if (back > have) {
          blocked.push(`${med.name} (${have} ${med.unit} left, ${back} to take back)`);
          continue;
        }
        plan[id] = receiptReversalPatch(med, prev[id]);
      }
      if (blocked.length > 0) {
        setPurError(`These items have already been dispensed, so the receipt cannot be undone: ${blocked.join('; ')}.`);
        return;
      }
    }
    if (isReceived) {
      const next = linesByItem(items);
      for (const id of Object.keys(next)) {
        const med = medAfterPlan(id);
        if (!med) continue;
        plan[id] = receiptPatch(med, next[id], receivedDate, purForm.supplierId);
      }
    }

    const supplier = db.suppliers.find((s) => s.id === purForm.supplierId);
    const data = {
      poNumber: purForm.poNumber.trim(), supplierId: purForm.supplierId, supplierName: supplier?.name || '',
      date: purForm.date, receivedDate, items,
      subtotal: purMoney.subtotal, tax: numMin(purForm.tax, 0), discount: numMin(purForm.discount, 0),
      total: purMoney.total,
      status: purForm.status, notes: purForm.notes, createdAt: editPur?.createdAt || todayISO,
    };
    try {
      if (editPur) await update('purchases', editPur.id, data);
      else await create('purchases', { id: newId('pur'), ...data } as Purchase);
      for (const id of Object.keys(plan)) await update('medStock', id, plan[id]);
    } catch (err) {
      setPurError((err as Error).message || 'Could not save this order.');
      return;
    }
    setPurOpen(false);
    setEditPur(null);
  };

  const deletePur = async (p: Purchase) => {
    if (!db) return;
    const received = p.status === 'Received';
    if (!confirmDelete(`purchase order ${p.poNumber}`, received ? 'The stock it brought in will be taken back out of inventory.' : undefined)) return;
    try {
      if (received) {
        const prev = linesByItem(p.items);
        for (const id of Object.keys(prev)) {
          const med = db.medStock.find((m) => m.id === id);
          if (med) await update('medStock', id, receiptReversalPatch(med, prev[id]));
        }
      }
      await remove('purchases', p.id);
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that order.');
    }
  };

  // ---- Sales / Dispensing ----
  const saleMoney = docMoney(saleForm.items, saleForm.discount, saleForm.tax);

  const setSale = (k: string, v: string | number) =>
    setSaleForm((f) => {
      const next = { ...f, [k]: v };
      return { ...next, ...docMoney(next.items, num(next.discount), num(next.tax)) };
    });

  const setSaleItem = (idx: number, k: keyof SaleItem, v: string | number) => {
    setSaleError('');
    setSaleForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [k]: v };
        updated.lineTotal = saleLineTotal(updated);
        return updated;
      });
      return { ...f, items, ...docMoney(items, f.discount, f.tax) };
    });
  };

  const addSaleItem = () => setSaleForm((f) => ({ ...f, items: [...f.items, { ...blankSaleItem(), id: newId('si') }] }));
  const removeSaleItem = (idx: number) =>
    setSaleForm((f) => {
      const items = f.items.filter((_, i) => i !== idx);
      return { ...f, items, ...docMoney(items, f.discount, f.tax) };
    });

  const onSaleStockSelect = (idx: number, stockId: string) => {
    const med = db?.medStock.find((m) => m.id === stockId);
    setSaleError('');
    setSaleForm((f) => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated: SaleItem = {
          ...it,
          stockItemId: stockId,
          itemName: med?.name || '',
          unit: med?.unit || '',
          unitPrice: med ? numMin(med.price, 0) : numMin(it.unitPrice, 0),
        };
        updated.lineTotal = saleLineTotal(updated);
        return updated;
      });
      return { ...f, items, ...docMoney(items, f.discount, f.tax) };
    });
  };

  const openNewSale = () => {
    setEditSale(null);
    setSaleError('');
    setSaleForm({
      ...blankSaleForm(),
      saleNumber: nextDocNumber('PS-', db?.pharmacySales.map((s) => s.saleNumber) ?? [], 1, 4),
      dispensedBy: dispensers[0]?.name || '',
    });
    setSaleOpen(true);
  };

  const openEditSale = (s: PharmacySale) => {
    setEditSale(s);
    setSaleError('');
    setSaleForm({
      saleNumber: s.saleNumber, date: s.date, customerName: s.customerName, petName: s.petName,
      ownerId: s.ownerId, items: s.items.map((i) => ({ ...i, id: i.id || newId('si') })),
      subtotal: s.subtotal, tax: s.tax,
      discount: s.discount, total: s.total, paymentMethod: s.paymentMethod, status: s.status,
      dispensedBy: s.dispensedBy, notes: s.notes,
    });
    setSaleOpen(true);
  };

  /**
   * Stock now follows the *difference* between what the sale held before and
   * what it holds now, so creating a Pending sale and later completing it
   * deducts, editing a completed quantity from 2 to 20 adjusts by 18, and a
   * refund or a revert to Pending puts the units back. Quantities are
   * aggregated per medicine first, so two lines for the same item both land.
   */
  const saveSale = async () => {
    if (!db) return;
    const items = saleForm.items;
    if (!saleForm.saleNumber.trim()) { setSaleError('A sale number is required.'); return; }
    if (!saleForm.date) { setSaleError('A date is required.'); return; }
    if (items.length === 0) { setSaleError('Add at least one item to the sale.'); return; }
    if (items.some((it) => !it.stockItemId)) { setSaleError('Every line needs a medicine selected.'); return; }
    if (items.some((it) => numMin(it.quantity, 0) <= 0)) { setSaleError('Every line needs a quantity greater than zero.'); return; }
    if (items.some((it) => numMin(it.discount, 0) > numMin(it.quantity, 0) * numMin(it.unitPrice, 0))) {
      setSaleError('A line discount cannot be more than the line value.');
      return;
    }
    if (numMin(saleForm.discount, 0) > saleMoney.subtotal) { setSaleError('The discount cannot be more than the subtotal.'); return; }

    const before = holdsStock(editSale?.status) && editSale ? qtyByItem(editSale.items) : {};
    const after = holdsStock(saleForm.status) ? qtyByItem(items) : {};
    const ids = Object.keys(before).concat(Object.keys(after).filter((id) => !(id in before)));

    const patches: { id: string; patch: StockPatch }[] = [];
    const short: string[] = [];
    ids.forEach((id) => {
      const net = round2((after[id] || 0) - (before[id] || 0));
      if (net === 0) return;
      const med = db.medStock.find((m) => m.id === id);
      if (!med) return;
      const have = availableOf(med);
      if (net > have) {
        short.push(`${med.name} (${have} ${med.unit} on hand, ${net} more needed)`);
        return;
      }
      patches.push({ id, patch: movementPatch(med, -net) });
    });
    if (short.length > 0) {
      setSaleError(`Not enough stock to dispense: ${short.join('; ')}.`);
      return;
    }

    const data = {
      saleNumber: saleForm.saleNumber.trim(), date: saleForm.date, customerName: saleForm.customerName,
      petName: saleForm.petName, ownerId: saleForm.ownerId, items,
      subtotal: saleMoney.subtotal, tax: numMin(saleForm.tax, 0), discount: numMin(saleForm.discount, 0),
      total: saleMoney.total,
      paymentMethod: saleForm.paymentMethod, status: saleForm.status, dispensedBy: saleForm.dispensedBy,
      notes: saleForm.notes, createdAt: editSale?.createdAt || todayISO,
    };
    try {
      if (editSale) await update('pharmacySales', editSale.id, data);
      else await create('pharmacySales', { id: newId('sale'), ...data } as PharmacySale);
      for (const p of patches) await update('medStock', p.id, p.patch);
    } catch (err) {
      setSaleError((err as Error).message || 'Could not save this sale.');
      return;
    }
    setSaleOpen(false);
    setEditSale(null);
  };

  /** Put the dispensed units back, aggregated per medicine. */
  const restock = async (lines: SaleItem[]) => {
    if (!db) return;
    const agg = qtyByItem(lines);
    for (const id of Object.keys(agg)) {
      const med = db.medStock.find((m) => m.id === id);
      if (med) await update('medStock', id, movementPatch(med, agg[id]));
    }
  };

  const deleteSale = async (s: PharmacySale) => {
    if (!confirmDelete(`sale ${s.saleNumber}`, holdsStock(s.status) ? 'The dispensed stock will be returned to inventory.' : undefined)) return;
    try {
      if (holdsStock(s.status)) await restock(s.items);
      await remove('pharmacySales', s.id);
    } catch (err) {
      setPageError((err as Error).message || 'Could not delete that sale.');
    }
  };

  const refundSale = async (s: PharmacySale) => {
    if (!holdsStock(s.status)) return;
    const units = s.items.reduce((n, i) => n + numMin(i.quantity, 0), 0);
    if (!confirmAction(`Refund ${s.saleNumber} for ${money(num(s.total))} and return ${units} unit${units === 1 ? '' : 's'} to stock?`)) return;
    try {
      await update('pharmacySales', s.id, { status: 'Refunded' });
      await restock(s.items);
    } catch (err) {
      setPageError((err as Error).message || 'Could not refund that sale.');
    }
  };

  // ---- Stats ----
  const stats = useMemo(() => {
    if (!db) return { totalItems: 0, lowStock: 0, expiring: 0, expired: 0, suppliers: 0, openPOs: 0, salesToday: 0, revenueToday: 0 };
    const todaySales = db.pharmacySales.filter((s) => s.date === todayISO && s.status === 'Completed');
    return {
      totalItems: db.medStock.length,
      lowStock: lowStock.length,
      expiring: expiringSoon.length,
      expired: expired.length,
      suppliers: db.suppliers.length,
      openPOs: db.purchases.filter((p) => p.status === 'Ordered' || p.status === 'Partially received').length,
      salesToday: todaySales.length,
      revenueToday: round2(todaySales.reduce((s, sale) => s + num(sale.total), 0)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, todayISO, lowStock.length, expiringSoon.length, expired.length]);

  const tabs: { key: Tab; label: string; icon: typeof Pill }[] = [
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'suppliers', label: 'Suppliers', icon: Truck },
    { key: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { key: 'dispensing', label: 'Dispensing', icon: HandHeart },
    { key: 'sales', label: 'Sales', icon: Receipt },
  ];

  if (!db) return <Shell module="pharmacy" title="Pharmacy & Inventory"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const batchFormSum = batchSum(medForm.batches);

  return (
    <Shell module="pharmacy" title="Pharmacy & Inventory" subtitle="Medicines, vaccines, supplements, dispensing, suppliers, and pharmacy sales">
      {pageError && (
        <div className="mb-4 flex items-start justify-between gap-3 px-4 py-3 rounded-xl bg-coral/10 border border-coral/25">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
            <p className="text-xs text-coral font-medium">{pageError}</p>
          </div>
          <button onClick={() => setPageError('')} className="text-coral/60 hover:text-coral"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><Package className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-ink">{stats.totalItems}</div><div className="text-[11px] text-ink/50">Total items</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-coral" /></div><div><div className="text-2xl font-bold text-coral">{stats.lowStock}</div><div className="text-[11px] text-ink/50">Low stock alerts</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><div className="text-2xl font-bold text-amber-600">{stats.expiring + stats.expired}</div><div className="text-[11px] text-ink/50">Expiring / expired</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><Receipt className="w-5 h-5 text-sky-600" /></div><div><div className="text-2xl font-bold text-sky-700">{money(stats.revenueToday)}</div><div className="text-[11px] text-ink/50">Sales today ({stats.salesToday})</div></div></div></Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

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
            <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, generic, supplier, batch, barcode…" className="flex-1" />
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-line overflow-x-auto">
              {['all', ...categories].map((c) => (
                <button key={c} onClick={() => setFilter(c)} className={`px-3 h-8 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${filter === c ? 'bg-lilac text-plum' : 'text-ink/60 hover:bg-canvas'}`}>{c}</button>
              ))}
            </div>
            <AISuggestionButton onClick={() => setAiSuggestion(generateInventoryForecast(db.medStock.map((s) => ({ name: s.name, stock: availableOf(s), reorderLevel: s.reorderLevel, unit: s.unit, supplier: s.supplier }))))} label="AI Forecast" />
            <Button onClick={openNewMed}><Plus className="w-4 h-4" /> Add item</Button>
          </div>

          {items.length === 0 ? (
            <Card><EmptyState icon={Pill} title="No inventory items" hint="Add medicines, vaccines, supplements, and supplies to track stock levels." /></Card>
          ) : (
            <div className="space-y-2">
              {items.map((m) => {
                const onHand = availableOf(m);
                const low = isLow(m);
                const days = daysToExpiry(m);
                const exp = days !== null && days < 0;
                const expSoon = days !== null && days >= 0 && days <= 90;
                const expanded = expandedMed === m.id;
                const toggle = () => setExpandedMed(expanded ? null : m.id);
                return (
                  <Card key={m.id} className="group hover:ring-2 hover:ring-plum/20 transition-all">
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={toggle}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${low ? 'bg-coral/15' : 'bg-lilac'}`}>
                          <Pill className={`w-5 h-5 ${low ? 'text-coral' : 'text-plum'}`} />
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
                            {expiryOf(m) && <span className="text-[10px] text-ink/50">Exp: {expiryOf(m)}</span>}
                            {m.supplier && <span className="text-[10px] text-ink/50">{m.supplier}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-lg font-bold ${low ? 'text-coral' : 'text-ink'}`}>{onHand} <span className="text-xs font-normal text-ink/50">{m.unit}</span></div>
                          <div className="text-[11px] text-ink/50">{money(num(m.price))} / {m.unit}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggle(); }} className="text-ink/30 hover:text-ink mt-1" title={expanded ? 'Collapse' : 'Expand'}>
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
                        <button onClick={() => deleteMed(m)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
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
                                  <tr key={b.id || `${b.batchNumber}-${i}`} className="border-t border-line/50">
                                    <td className="py-1 text-ink/70 font-medium">{b.batchNumber}</td>
                                    <td className="text-right text-ink/70">{numMin(b.quantity, 0)} {m.unit}</td>
                                    <td className="text-left pl-3 text-ink/50">{b.expiry || '—'}</td>
                                    <td className="text-left pl-3 text-ink/50">{b.receivedDate || '—'}</td>
                                    <td className="text-right text-ink/70">{money(num(b.costPerUnit))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex justify-end mt-2 text-[11px] text-ink/50">
                              Batch total: <span className="font-semibold text-ink ml-1">{batchSum(m.batches)} {m.unit}</span>
                            </div>
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
              <ErrorNote message={medError} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Item name" required error={medError && !medForm.name.trim() ? 'Required' : undefined}><Input value={medForm.name} onChange={(e) => setMed('name', e.target.value)} placeholder="Amoxicillin 250mg" /></Field>
                <Field label="Category">
                  <Select value={medForm.category} onChange={(e) => setMed('category', e.target.value)}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Generic name"><Input value={medForm.genericName} onChange={(e) => setMed('genericName', e.target.value)} placeholder="Amoxicillin" /></Field>
                <Field label="Manufacturer"><Input value={medForm.manufacturer} onChange={(e) => setMed('manufacturer', e.target.value)} placeholder="Sandoz" /></Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Dosage form"><Input value={medForm.dosageForm} onChange={(e) => setMed('dosageForm', e.target.value)} placeholder="Oral tablet" /></Field>
                <Field label="Strength"><Input value={medForm.strength} onChange={(e) => setMed('strength', e.target.value)} placeholder="250 mg" /></Field>
                <Field label="Dosage info"><Input value={medForm.dosageInfo} onChange={(e) => setMed('dosageInfo', e.target.value)} placeholder="15 mg/kg PO q12h" /></Field>
                <Field label="Active ingredients"><Input value={medForm.activeIngredients} onChange={(e) => setMed('activeIngredients', e.target.value)} placeholder="Amoxicillin 200mg" /></Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Stock qty" hint={medForm.batches.length > 0 ? 'Derived from the batch quantities below' : undefined}>
                  {medForm.batches.length > 0 ? (
                    <NumberInput value={String(batchFormSum)} min={0} disabled />
                  ) : (
                    <NumberInput value={medForm.stock} onChange={(e) => setMed('stock', e.target.value)} placeholder="50" min={0} />
                  )}
                </Field>
                <Field label="Unit" required><Input value={medForm.unit} onChange={(e) => setMed('unit', e.target.value)} placeholder="tablet" /></Field>
                <Field label="Reorder level"><NumberInput value={medForm.reorderLevel} onChange={(e) => setMed('reorderLevel', e.target.value)} placeholder="20" min={0} /></Field>
                <Field label="Reorder qty"><NumberInput value={medForm.reorderQty} onChange={(e) => setMed('reorderQty', e.target.value)} placeholder="100" min={0} /></Field>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label={`Price (${settings.currencySymbol})`}><NumberInput value={medForm.price} onChange={(e) => setMed('price', e.target.value)} placeholder="0.50" min={0} step={0.01} /></Field>
                <Field label="Barcode"><Input className="font-mono" value={medForm.barcode} onChange={(e) => setMed('barcode', e.target.value)} placeholder="BC-001" /></Field>
                <Field label="QR code"><Input className="font-mono" value={medForm.qrCode} onChange={(e) => setMed('qrCode', e.target.value)} placeholder="QR-001" /></Field>
                <Field label="Storage"><Input value={medForm.storageCondition} onChange={(e) => setMed('storageCondition', e.target.value)} placeholder="Room temperature" /></Field>
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
                  <Checkbox checked={medForm.prescriptionRequired} onChange={(e) => setMed('prescriptionRequired', e.target.checked)} label="Prescription required" />
                  <Checkbox checked={medForm.controlledDrug} onChange={(e) => setMed('controlledDrug', e.target.checked)} label="Controlled drug" />
                </div>
              </div>

              {/* Batch tracking in form */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Batches</div>
                  <Button size="sm" variant="outline" onClick={() => setMedForm((f) => ({ ...f, batches: [...f.batches, { ...blankBatch(), id: newId('b') }] }))}><Plus className="w-3.5 h-3.5" /> Add batch</Button>
                </div>
                <div className="space-y-2">
                  {medForm.batches.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                      <Input className="w-32" value={b.batchNumber} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x) => x.id === b.id ? { ...x, batchNumber: e.target.value } : x) }))} placeholder="Batch No" />
                      <NumberInput value={String(b.quantity)} min={0} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x) => x.id === b.id ? { ...x, quantity: numMin(e.target.value, 0) } : x) }))} className="w-28" placeholder="Qty" />
                      <DateInput className="w-36" placeholder="Expiry" value={b.expiry} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x) => x.id === b.id ? { ...x, expiry: e.target.value } : x) }))} />
                      <DateInput className="w-36" placeholder="Received" value={b.receivedDate} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x) => x.id === b.id ? { ...x, receivedDate: e.target.value } : x) }))} />
                      <NumberInput value={String(b.costPerUnit)} min={0} step={0.01} onChange={(e) => setMedForm((f) => ({ ...f, batches: f.batches.map((x) => x.id === b.id ? { ...x, costPerUnit: numMin(e.target.value, 0) } : x) }))} className="w-28" placeholder="Cost" />
                      <button onClick={() => setMedForm((f) => ({ ...f, batches: f.batches.filter((x) => x.id !== b.id) }))} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0" title="Remove batch"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {medForm.batches.length > 0 && (
                  <div className="text-[11px] text-ink/50 mt-2">Stock qty will be saved as {batchFormSum} {medForm.unit || 'unit'}.</div>
                )}
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
              <ErrorNote message={adjustError} />
              <div className="text-sm text-ink/60">Current stock: <span className="font-bold text-ink">{adjustMed ? availableOf(adjustMed) : 0} {adjustMed?.unit}</span></div>
              <Field label="Adjustment type">
                <Select value={adjustForm.type} onChange={(e) => { setAdjustForm((f) => ({ ...f, type: e.target.value as AdjustKind })); setAdjustError(''); }}>
                  {adjustKinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </Select>
              </Field>
              <Field label="Quantity" required hint="Always a positive number — the type decides the direction.">
                <NumberInput value={adjustForm.qty} min={0} onChange={(e) => { setAdjustForm((f) => ({ ...f, qty: e.target.value })); setAdjustError(''); }} placeholder="10" />
              </Field>
              <Field label="Performed by">
                <Select value={adjustForm.performedBy} onChange={(e) => setAdjustForm((f) => ({ ...f, performedBy: e.target.value }))}>
                  <option value="">Select staff…</option>
                  {dispensers.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label="Reason" required={adjustForm.type !== 'Stock in'} hint="Kept as a stock-adjustment audit record.">
                <Textarea value={adjustForm.reason} onChange={(e) => { setAdjustForm((f) => ({ ...f, reason: e.target.value })); setAdjustError(''); }} placeholder="Reason for adjustment…" className="min-h-[50px]" />
              </Field>
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
                <Card key={s.id} className="group p-4 hover:ring-2 hover:ring-plum/20 transition-all">
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
                      <button onClick={() => openEditSup(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteSup(s)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={supOpen} onClose={() => { setSupOpen(false); setEditSup(null); }} title={editSup ? 'Edit supplier' : 'Add supplier'}>
            <div className="space-y-3">
              <ErrorNote message={supError} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" required><Input value={supForm.name} onChange={(e) => setSup('name', e.target.value)} placeholder="VetMed Supplies" /></Field>
                <Field label="Code" required><Input value={supForm.code} onChange={(e) => setSup('code', e.target.value)} placeholder="VMS-001" /></Field>
                <Field label="Contact person"><Input value={supForm.contactPerson} onChange={(e) => setSup('contactPerson', e.target.value)} placeholder="John Park" /></Field>
                <Field label="Category"><Input value={supForm.category} onChange={(e) => setSup('category', e.target.value)} placeholder="Pharmaceuticals" /></Field>
                <Field label="Phone"><Input type="tel" value={supForm.phone} onChange={(e) => setSup('phone', e.target.value)} placeholder="+1 415 555 0301" /></Field>
                <Field label="Email"><Input type="email" value={supForm.email} onChange={(e) => setSup('email', e.target.value)} placeholder="orders@…" /></Field>
              </div>
              <Field label="Address"><Input value={supForm.address} onChange={(e) => setSup('address', e.target.value)} placeholder="200 Industrial Blvd, San Jose, CA" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment terms"><Input value={supForm.paymentTerms} onChange={(e) => setSup('paymentTerms', e.target.value)} placeholder="Net 30" /></Field>
                <Field label="Lead time (days)"><NumberInput value={supForm.leadTimeDays} onChange={(e) => setSup('leadTimeDays', e.target.value)} placeholder="5" min={0} /></Field>
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
                <Card key={p.id} className="group hover:ring-2 hover:ring-plum/20 transition-all">
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
                        {p.receivedDate && <div className="text-[11px] text-plum">Received: {p.receivedDate}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-ink">{money(num(p.total))}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditPur(p)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deletePur(p)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={purOpen} onClose={() => { setPurOpen(false); setEditPur(null); }} title={editPur ? `Edit ${editPur.poNumber}` : 'New purchase order'} wide>
            <div className="space-y-3">
              <ErrorNote message={purError} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="PO number" required><Input value={purForm.poNumber} onChange={(e) => { setPur('poNumber', e.target.value); setPurError(''); }} /></Field>
                <Field label="Supplier" required>
                  <Select value={purForm.supplierId} onChange={(e) => { setPur('supplierId', e.target.value); setPurError(''); }}>
                    <option value="">Select supplier…</option>
                    {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="Date" required><DateInput value={purForm.date} onChange={(e) => setPur('date', e.target.value)} /></Field>
                <Field label="Status" hint={purForm.status === 'Received' ? 'Stock and batches will be booked in on save.' : undefined}>
                  <Select value={purForm.status} onChange={(e) => { setPur('status', e.target.value as Purchase['status']); setPurError(''); }}>
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
                    <div key={it.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                      <Select value={it.stockItemId} onChange={(e) => onPurStockSelect(idx, e.target.value)} className="w-40">
                        <option value="">Select item…</option>
                        {db.medStock.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </Select>
                      <Input className="w-28" value={it.batchNumber} onChange={(e) => setPurItem(idx, 'batchNumber', e.target.value)} placeholder="Batch No" />
                      <DateInput className="w-36" placeholder="Expiry" value={it.expiry} onChange={(e) => setPurItem(idx, 'expiry', e.target.value)} />
                      <NumberInput value={String(it.quantity)} min={0} onChange={(e) => setPurItem(idx, 'quantity', numMin(e.target.value, 0))} className="w-28" placeholder="Qty" />
                      <NumberInput value={String(it.unitCost)} min={0} step={0.01} onChange={(e) => setPurItem(idx, 'unitCost', numMin(e.target.value, 0))} className="w-28" placeholder="Cost" />
                      <span className="text-xs font-medium text-ink/70 w-20 text-right">{money(purchaseLineTotal(it))}</span>
                      <button onClick={() => removePurItem(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0" title="Remove line"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label={`Discount (${settings.currencySymbol})`}><NumberInput value={String(purForm.discount)} min={0} step={0.01} onChange={(e) => { setPur('discount', numMin(e.target.value, 0)); setPurError(''); }} /></Field>
                <Field label={`Tax (${settings.currencySymbol})`}><NumberInput value={String(purForm.tax)} min={0} step={0.01} onChange={(e) => setPur('tax', numMin(e.target.value, 0))} /></Field>
                <Field label="Received date"><DateInput value={purForm.receivedDate} onChange={(e) => setPur('receivedDate', e.target.value)} /></Field>
                <div className="flex items-end"><div className="text-sm font-bold text-ink">Total: {money(purMoney.total)}</div></div>
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
          <Card className="p-4 mb-4 bg-lilac/20 border-plum/20">
            <div className="flex items-start gap-3">
              <HandHeart className="w-5 h-5 text-plum shrink-0 mt-0.5" />
              <div className="text-xs text-ink/60">
                <p className="font-medium text-ink mb-1">Medicine dispensing</p>
                <p>Dispense medicines against prescriptions, record returns, and apply discounts. Stock is deducted from the earliest-expiring batch when a sale is Completed, and put back when it is refunded, reverted to Pending or deleted.</p>
              </div>
            </div>
          </Card>
          {db.pharmacySales.length === 0 ? (
            <Card><EmptyState icon={HandHeart} title="No dispensing records" hint="Dispense medicines to patients and walk-in customers." /></Card>
          ) : (
            <div className="space-y-2">
              {db.pharmacySales.map((s) => (
                <Card key={s.id} className="group hover:ring-2 hover:ring-plum/20 transition-all">
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.status === 'Refunded' ? 'bg-canvas' : 'bg-lilac'}`}>
                        <Receipt className={`w-5 h-5 ${s.status === 'Refunded' ? 'text-ink/40' : 'text-plum'}`} />
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
                      <div className="text-lg font-bold text-ink">{money(num(s.total))}</div>
                      {s.discount > 0 && <div className="text-[11px] text-plum">-{money(num(s.discount))} discount</div>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {s.status === 'Completed' && (
                        <button onClick={() => refundSale(s)} className="w-7 h-7 rounded-lg hover:bg-amber-100 text-ink/40 hover:text-amber-600 flex items-center justify-center transition-colors" title="Return / refund">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEditSale(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteSale(s)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={saleOpen} onClose={() => { setSaleOpen(false); setEditSale(null); }} title={editSale ? `Edit ${editSale.saleNumber}` : 'New dispensing / sale'} wide>
            <div className="space-y-3">
              <ErrorNote message={saleError} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Sale number" required><Input value={saleForm.saleNumber} onChange={(e) => { setSale('saleNumber', e.target.value); setSaleError(''); }} /></Field>
                <Field label="Date" required><DateInput value={saleForm.date} onChange={(e) => setSale('date', e.target.value)} /></Field>
                <Field label="Customer name"><Input value={saleForm.customerName} onChange={(e) => setSale('customerName', e.target.value)} placeholder="Eleanor Hayes" /></Field>
                <Field label="Pet name"><Input value={saleForm.petName} onChange={(e) => setSale('petName', e.target.value)} placeholder="Biscuit (optional)" /></Field>
              </div>

              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Items</div>
                  <Button size="sm" variant="outline" onClick={addSaleItem}><Plus className="w-3.5 h-3.5" /> Add item</Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {saleForm.items.map((it, idx) => {
                    const med = db.medStock.find((m) => m.id === it.stockItemId);
                    return (
                      <div key={it.id} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                        <Select value={it.stockItemId} onChange={(e) => onSaleStockSelect(idx, e.target.value)} className="w-40">
                          <option value="">Select item…</option>
                          {db.medStock.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                        <NumberInput value={String(it.quantity)} min={0} onChange={(e) => setSaleItem(idx, 'quantity', numMin(e.target.value, 0))} className="w-28" placeholder="Qty" />
                        <NumberInput value={String(it.unitPrice)} min={0} step={0.01} onChange={(e) => setSaleItem(idx, 'unitPrice', numMin(e.target.value, 0))} className="w-28" placeholder="Price" />
                        <NumberInput value={String(it.discount)} min={0} step={0.01} onChange={(e) => setSaleItem(idx, 'discount', numMin(e.target.value, 0))} className="w-28" placeholder="Disc" />
                        <span className="text-xs font-medium text-ink/70 w-20 text-right">{money(saleLineTotal(it))}</span>
                        {med && <span className="text-[10px] text-ink/40 w-24">{availableOf(med)} {med.unit} on hand</span>}
                        <button onClick={() => removeSaleItem(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0" title="Remove line"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label={`Discount (${settings.currencySymbol})`}><NumberInput value={String(saleForm.discount)} min={0} step={0.01} onChange={(e) => { setSale('discount', numMin(e.target.value, 0)); setSaleError(''); }} /></Field>
                <Field label={`Tax (${settings.currencySymbol})`}><NumberInput value={String(saleForm.tax)} min={0} step={0.01} onChange={(e) => setSale('tax', numMin(e.target.value, 0))} /></Field>
                <Field label="Payment method">
                  <Select value={saleForm.paymentMethod} onChange={(e) => setSale('paymentMethod', e.target.value as PharmacySale['paymentMethod'])}>
                    {paymentMethods.map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
                <Field label="Status" hint={saleForm.status === 'Completed' ? 'Completed sales deduct stock.' : 'No stock moves until this is Completed.'}>
                  <Select value={saleForm.status} onChange={(e) => { setSale('status', e.target.value as PharmacySale['status']); setSaleError(''); }}>
                    {saleStatuses.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dispensed by">
                  <Select value={saleForm.dispensedBy} onChange={(e) => setSale('dispensedBy', e.target.value)}>
                    <option value="">Select staff…</option>
                    {dispensers.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </Select>
                </Field>
                <div className="flex items-end justify-end">
                  <div className="text-right"><div className="text-[11px] text-ink/50">Total</div><div className="text-xl font-bold text-ink">{money(saleMoney.total)}</div></div>
                </div>
              </div>
              <Field label="Notes"><Textarea value={saleForm.notes} onChange={(e) => setSale('notes', e.target.value)} placeholder="Dispensing notes…" className="min-h-[40px]" /></Field>
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
            <Card className="p-4"><div className="text-[11px] text-ink/50 uppercase tracking-wide">Total revenue</div><div className="text-2xl font-bold text-plum mt-1">{money(round2(db.pharmacySales.filter((s) => s.status === 'Completed').reduce((sum, s) => sum + num(s.total), 0)))}</div></Card>
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
                        <td className="px-4 py-3 text-right font-medium text-ink">{money(num(s.total))}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            {s.status === 'Completed' && (
                              <button onClick={() => refundSale(s)} className="w-7 h-7 rounded-lg hover:bg-amber-100 text-ink/40 hover:text-amber-600 flex items-center justify-center transition-colors" title="Return / refund">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => openEditSale(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteSale(s)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
