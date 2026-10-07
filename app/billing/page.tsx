'use client';

import { useMemo, useState } from 'react';
import {
  Receipt, Plus, TrendingUp, DollarSign, AlertCircle, Eye, CheckCircle2, RotateCcw,
  Trash2, FileText, Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Calendar,
  Tag, Building2, Percent, X,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Badge, Button, StatCard, EmptyState, Modal, Field, inputCls, Select, NumberInput, DateInput, Textarea } from '../components/ui';
import { useDB, type Invoice, type Expense, type InvoiceItem, type Payment, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateBusinessInsight, generateRevenueForecast } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

type Tab = 'invoices' | 'accounting';
type DocFilter = 'all' | 'Invoice' | 'Estimate' | 'Credit Note' | 'Receipt' | 'Refund';

const DOC_TYPES: Invoice['docType'][] = ['Invoice', 'Estimate', 'Receipt', 'Credit Note', 'Refund'];
const ITEM_CATEGORIES: InvoiceItem['category'][] = ['Consultation', 'Surgery', 'Medication', 'Lab', 'Vaccination', 'Grooming', 'Boarding', 'Product', 'Other'];
const PAYMENT_METHODS: Payment['method'][] = ['Cash', 'Card', 'Transfer', 'Insurance', 'Credit', 'Coupon'];
const EXPENSE_CATEGORIES: Expense['category'][] = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Equipment', 'Maintenance', 'Marketing', 'Insurance', 'Professional fees', 'Travel', 'Bank charges', 'Taxes', 'Other'];

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt0 = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function blankItem(): InvoiceItem {
  return {
    description: '', qty: 1, unitPrice: 0, taxRate: 5, discount: 0, taxable: true,
    category: 'Consultation', reference: '', referenceId: '', cost: 0, notes: '',
    serviceDate: '', practitionerId: '', practitionerName: '',
  };
}

function blankExpense(): Expense {
  return {
    id: '', number: '', date: today(), category: 'Other', description: '', vendor: '',
    vendorId: '', amount: 0, tax: 0, total: 0, paymentMethod: 'Transfer', status: 'Paid',
    recurring: false, recurrencePattern: 'None', receiptNumber: '', notes: '', createdBy: '', createdAt: '',
  };
}

export default function BillingPage() {
  const { db, create, update, remove } = useDB();
  const [tab, setTab] = useState<Tab>('invoices');
  const [docFilter, setDocFilter] = useState<DocFilter>('all');

  // Invoice modal state
  const [invModal, setInvModal] = useState(false);
  const [detailInv, setDetailInv] = useState<Invoice | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invForm, setInvForm] = useState({
    docType: 'Invoice' as Invoice['docType'],
    ownerId: '',
    petId: '',
    date: today(),
    dueDate: '',
    notes: '',
    terms: 'Payment due within 14 days',
    discount: '0',
    discountType: 'Fixed' as 'Fixed' | 'Percent' | '',
    taxRate: '5',
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash' as Payment['method'], reference: '', notes: '' });

  // Expense modal state
  const [expModal, setExpModal] = useState(false);
  const [detailExp, setDetailExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState<Expense>(blankExpense());
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const invoices = db?.invoices ?? [];
  const expenses = db?.expenses ?? [];
  const owners = db?.owners ?? [];
  const pets = db?.pets ?? [];

  const ownerName = (id: string) => owners.find((o) => o.id === id)?.name ?? 'Unknown';
  const petName = (id: string) => pets.find((p) => p.id === id)?.name ?? 'Unknown';

  // === Calculations ===
  const calcSubtotal = (its: InvoiceItem[]) => its.reduce((s, it) => s + it.qty * it.unitPrice * (1 - it.discount / 100), 0);
  const calcDiscountAmount = (subtotal: number, discount: number, type: string) =>
    type === 'Percent' ? subtotal * (discount / 100) : discount;
  const calcTaxTotal = (its: InvoiceItem[], afterDiscount: number) => {
    const taxableBase = its.reduce((s, it) => {
      if (!it.taxable) return s;
      const lineNet = it.qty * it.unitPrice * (1 - it.discount / 100);
      return s + lineNet;
    }, 0);
    const ratio = afterDiscount > 0 ? afterDiscount / calcSubtotal(its) : 1;
    return taxableBase * ratio;
  };

  const invoiceTotals = (inv: Invoice) => {
    const subtotal = calcSubtotal(inv.items);
    const discountAmt = calcDiscountAmount(subtotal, inv.discount, inv.discountType);
    const afterDiscount = subtotal - discountAmt;
    const taxTotal = inv.taxTotal || calcTaxTotal(inv.items, afterDiscount) * 0.05;
    const total = afterDiscount + taxTotal;
    return { subtotal, discountAmt, afterDiscount, taxTotal, total };
  };

  const filteredInvoices = invoices.filter((i) => docFilter === 'all' || i.docType === docFilter);

  const invoiceStats = useMemo(() => {
    let revenue = 0, collected = 0, outstanding = 0, overdue = 0;
    invoices.forEach((i) => {
      if (i.docType === 'Credit Note' || i.docType === 'Refund') return;
      const t = invoiceTotals(i).total;
      revenue += t;
      collected += i.amountPaid;
      if (i.balance > 0) outstanding += i.balance;
      if (i.status === 'Overdue') overdue += i.balance;
    });
    return { revenue, collected, outstanding, overdue };
  }, [invoices]);

  const expenseStats = useMemo(() => {
    let total = 0, paid = 0, pending = 0;
    expenses.forEach((e) => {
      total += e.total;
      if (e.status === 'Paid') paid += e.total;
      else pending += e.total;
    });
    return { total, paid, pending };
  }, [expenses]);

  const profit = invoiceStats.collected - expenseStats.total;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.total));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((i) => {
      if (i.docType === 'Credit Note' || i.docType === 'Refund') return;
      const m = i.date?.slice(0, 7);
      if (m) map.set(m, (map.get(m) ?? 0) + i.amountPaid);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [invoices]);

  if (!db) return <Shell title="Billing"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  // === Invoice actions ===
  const setInv = (k: string, v: string) => setInvForm((f) => ({ ...f, [k]: v }));

  const openCreateInvoice = (docType: Invoice['docType'] = 'Invoice') => {
    setEditingId(null);
    setInvForm({
      docType, ownerId: '', petId: '', date: today(), dueDate: '',
      notes: '', terms: docType === 'Estimate' ? 'Estimate valid for 30 days' : 'Payment due within 14 days',
      discount: '0', discountType: 'Fixed', taxRate: '5',
    });
    setItems([blankItem()]);
    setInvModal(true);
  };

  const openEditInvoice = (inv: Invoice) => {
    setEditingId(inv.id);
    setInvForm({
      docType: inv.docType, ownerId: inv.ownerId, petId: inv.petId,
      date: inv.date, dueDate: inv.dueDate, notes: inv.notes, terms: inv.terms,
      discount: String(inv.discount), discountType: inv.discountType, taxRate: '5',
    });
    setItems(inv.items.length > 0 ? inv.items : [blankItem()]);
    setInvModal(true);
  };

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((its) => [...its, blankItem()]);
  const removeItem = (idx: number) => setItems((its) => its.filter((_, i) => i !== idx));

  const previewTotals = (() => {
    const subtotal = calcSubtotal(items);
    const discountAmt = calcDiscountAmount(subtotal, parseFloat(invForm.discount) || 0, invForm.discountType);
    const afterDiscount = subtotal - discountAmt;
    const taxTotal = (parseFloat(invForm.taxRate) || 0) / 100 * afterDiscount;
    return { subtotal, discountAmt, afterDiscount, taxTotal, total: afterDiscount + taxTotal };
  })();

  const saveInvoice = () => {
    if (!invForm.ownerId || items.length === 0 || items.every((it) => !it.description)) return;
    const subtotal = previewTotals.subtotal;
    const discountAmt = previewTotals.discountAmt;
    const taxTotal = previewTotals.taxTotal;
    const total = previewTotals.total;
    const num = editingId
      ? db.invoices.find((i) => i.id === editingId)!.number
      : `${invForm.docType === 'Estimate' ? 'EST' : invForm.docType === 'Credit Note' ? 'CN' : 'INV'}-${String(1044 + db.invoices.length).padStart(4, '0')}`;

    const payload: Invoice = {
      id: editingId ?? newId('inv'),
      number: num,
      docType: invForm.docType,
      ownerId: invForm.ownerId,
      petId: invForm.petId,
      date: invForm.date,
      dueDate: invForm.dueDate,
      items,
      subtotal,
      discount: parseFloat(invForm.discount) || 0,
      discountType: invForm.discountType,
      coupon: [],
      taxes: [{ name: 'VAT', rate: parseFloat(invForm.taxRate) || 0, amount: taxTotal }],
      taxTotal,
      total,
      amountPaid: editingId ? db.invoices.find((i) => i.id === editingId)!.amountPaid : 0,
      balance: total - (editingId ? db.invoices.find((i) => i.id === editingId)!.amountPaid : 0),
      status: editingId ? db.invoices.find((i) => i.id === editingId)!.status : 'Pending',
      method: editingId ? db.invoices.find((i) => i.id === editingId)!.method : '',
      payments: editingId ? db.invoices.find((i) => i.id === editingId)!.payments : [],
      notes: invForm.notes,
      terms: invForm.terms,
      linkedInvoiceId: '', linkedEstimateId: '', createdBy: '', createdAt: '',
    };

    if (editingId) {
      update('invoices', editingId, payload);
    } else {
      create('invoices', payload);
    }
    setInvModal(false);
    setItems([]);
  };

  const markPaid = (id: string) => {
    const inv = db.invoices.find((i) => i.id === id);
    if (!inv) return;
    const t = invoiceTotals(inv).total;
    update('invoices', id, {
      status: 'Paid',
      amountPaid: t,
      balance: 0,
      method: inv.method || 'Cash',
      payments: [...(inv.payments || []), {
        id: newId('pay'), date: today(), amount: t, method: inv.method || 'Cash',
        reference: '', notes: 'Marked as paid', receivedBy: '',
      }],
    });
  };

  const convertEstimate = (id: string) => {
    const est = db.invoices.find((i) => i.id === id);
    if (!est) return;
    const newNum = `INV-${String(1044 + db.invoices.length).padStart(4, '0')}`;
    create('invoices', {
      ...est,
      id: newId('inv'),
      number: newNum,
      docType: 'Invoice',
      status: 'Sent',
      linkedEstimateId: id,
    } as Invoice);
    update('invoices', id, { status: 'Converted' });
  };

  const deleteInvoice = (id: string) => remove('invoices', id);

  const recordPayment = () => {
    if (!payModal || !payForm.amount) return;
    const amt = parseFloat(payForm.amount);
    const inv = payModal;
    const newPay: Payment = {
      id: newId('pay'), date: today(), amount: amt,
      method: payForm.method, reference: payForm.reference, notes: payForm.notes, receivedBy: '',
    };
    const newPaid = inv.amountPaid + amt;
    const newBalance = Math.max(0, invoiceTotals(inv).total - newPaid);
    update('invoices', inv.id, {
      amountPaid: newPaid,
      balance: newBalance,
      status: newBalance === 0 ? 'Paid' : 'Partial',
      method: payForm.method,
      payments: [...inv.payments, newPay],
    });
    setPayModal(null);
    setPayForm({ amount: '', method: 'Cash', reference: '', notes: '' });
  };

  // === Expense actions ===
  const setExp = (k: keyof Expense, v: string | number | boolean) =>
    setExpForm((f) => ({ ...f, [k]: v }));

  const openCreateExpense = () => {
    setDetailExp(null);
    setExpForm({ ...blankExpense(), id: newId('exp'), number: `EXP-${String(1016 + db.expenses.length).padStart(4, '0')}` });
    setExpModal(true);
  };

  const openEditExpense = (e: Expense) => {
    setDetailExp(null);
    setExpForm(e);
    setExpModal(true);
  };

  const saveExpense = () => {
    if (!expForm.description || !expForm.amount) return;
    const amount = parseFloat(String(expForm.amount)) || 0;
    const tax = parseFloat(String(expForm.tax)) || 0;
    const payload = { ...expForm, amount, tax, total: amount + tax };
    if (db.expenses.find((e) => e.id === expForm.id)) {
      update('expenses', expForm.id, payload);
    } else {
      create('expenses', { ...payload, createdAt: today() });
    }
    setExpModal(false);
  };

  const deleteExpense = (id: string) => remove('expenses', id);

  // === Render ===
  return (
    <Shell title="Billing" subtitle="Invoices, estimates, payments, expenses & accounting">
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-canvas rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('invoices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'invoices' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}
        >
          <Receipt className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Invoices & Estimates
        </button>
        <button
          onClick={() => setTab('accounting')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'accounting' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}
        >
          <Wallet className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Accounting
        </button>
      </div>

      {tab === 'invoices' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon={TrendingUp} label="Total revenue" value={fmt0(invoiceStats.revenue)} tone="sage" />
            <StatCard icon={DollarSign} label="Collected" value={fmt0(invoiceStats.collected)} sub="Payments received" tone="sky" />
            <StatCard icon={AlertCircle} label="Outstanding" value={fmt0(invoiceStats.outstanding)} sub="Awaiting payment" tone="amber" />
            <StatCard icon={Receipt} label="Overdue" value={fmt0(invoiceStats.overdue)} tone="coral" />
          </div>

          {/* Doc filter + new buttons */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div className="flex gap-1 bg-canvas rounded-lg p-1">
              {(['all', 'Invoice', 'Estimate', 'Credit Note'] as DocFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setDocFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${docFilter === f ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}
                >
                  {f === 'all' ? 'All' : f === 'Credit Note' ? 'Credit Notes' : f + 's'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <AISuggestionButton onClick={() => { const rev = db.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0); const out = db.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.balance, 0); const comp = db.appointments.filter(a => a.status === 'Completed').length; setAiSuggestion(generateBusinessInsight(rev, out, db.appointments.length, comp, db.staff.length, db.pets.length)); }} label="AI Insights" />
              <Button variant="outline" onClick={() => openCreateInvoice('Estimate')}><FileText className="w-4 h-4" /> New estimate</Button>
              <Button onClick={() => openCreateInvoice('Invoice')}><Plus className="w-4 h-4" /> New invoice</Button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-ink/60">{filteredInvoices.length} documents</p>
          </div>

          {filteredInvoices.length === 0 ? (
            <Card><EmptyState icon={Receipt} title="No documents yet" hint="Create an invoice or estimate to get started" /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-ink/50 uppercase tracking-wide border-b border-line">
                      <th className="px-4 py-3 font-medium">Number</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Pet</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium text-right">Paid</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredInvoices.map((i) => {
                      const t = invoiceTotals(i);
                      return (
                        <tr key={i.id} className="hover:bg-canvas/60 group">
                          <td className="px-4 py-3 font-medium text-ink cursor-pointer" onClick={() => setDetailInv(i)}>{i.number}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              i.docType === 'Invoice' ? 'bg-sky-50 text-sky-700' :
                              i.docType === 'Estimate' ? 'bg-violet-50 text-violet-700' :
                              i.docType === 'Credit Note' ? 'bg-amber-50 text-amber-700' :
                              'bg-ink/5 text-ink/60'
                            }`}>{i.docType}</span>
                          </td>
                          <td className="px-4 py-3 text-ink/70">{ownerName(i.ownerId)}</td>
                          <td className="px-4 py-3 text-ink/70">{petName(i.petId)}</td>
                          <td className="px-4 py-3 text-ink/50 text-xs">{i.date}</td>
                          <td className="px-4 py-3 text-right font-semibold text-ink">{fmt(t.total)}</td>
                          <td className="px-4 py-3 text-right text-ink/60">{fmt(i.amountPaid)}</td>
                          <td className="px-4 py-3"><Badge status={i.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button onClick={() => setDetailInv(i)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEditInvoice(i)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              {i.docType === 'Estimate' && i.status !== 'Converted' && (
                                <button onClick={() => convertEstimate(i.id)} className="w-7 h-7 rounded-lg hover:bg-mint text-ink/40 hover:text-sage flex items-center justify-center transition-colors" title="Convert to invoice">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {(i.status === 'Pending' || i.status === 'Overdue' || i.status === 'Partial' || i.status === 'Sent') && (
                                <button onClick={() => { setPayModal(i); setPayForm({ amount: String(i.balance.toFixed(2)), method: 'Cash', reference: '', notes: '' }); }} className="w-7 h-7 rounded-lg hover:bg-mint text-ink/40 hover:text-sage flex items-center justify-center transition-colors" title="Record payment">
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {(i.status === 'Pending' || i.status === 'Overdue' || i.status === 'Sent') && (
                                <button onClick={() => markPaid(i.id)} className="w-7 h-7 rounded-lg hover:bg-mint text-ink/40 hover:text-sage flex items-center justify-center transition-colors" title="Mark paid">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => deleteInvoice(i.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
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
            </Card>
          )}
        </>
      )}

      {tab === 'accounting' && (
        <>
          {/* P&L stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon={ArrowUpRight} label="Revenue" value={fmt0(invoiceStats.collected)} sub="Collected payments" tone="sage" />
            <StatCard icon={ArrowDownRight} label="Expenses" value={fmt0(expenseStats.total)} sub="Total spend" tone="coral" />
            <StatCard icon={PiggyBank} label="Net profit" value={fmt0(profit)} sub={profit >= 0 ? 'Profit' : 'Loss'} tone={profit >= 0 ? 'sky' : 'coral'} />
            <StatCard icon={AlertCircle} label="Pending bills" value={fmt0(expenseStats.pending)} sub="Unpaid expenses" tone="amber" />
          </div>

          {/* Revenue trend mini chart */}
          {revenueByMonth.length > 1 && (
            <Card className="mb-5">
              <div className="text-sm font-semibold text-ink mb-3">Revenue trend (collected)</div>
              <div className="flex items-end gap-3 h-32">
                {revenueByMonth.map(([m, v]) => {
                  const max = Math.max(...revenueByMonth.map(([, x]) => x), 1);
                  const h = Math.max(4, (v / max) * 100);
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-ink/40">{fmt0(v)}</div>
                      <div className="w-full bg-sage/80 rounded-t-md transition-all" style={{ height: `${h}%` }} />
                      <div className="text-[10px] text-ink/50">{m.slice(5)}/{m.slice(2, 4)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Expense by category breakdown */}
          {expensesByCategory.length > 0 && (
            <Card className="mb-5">
              <div className="text-sm font-semibold text-ink mb-3">Expenses by category</div>
              <div className="space-y-2">
                {expensesByCategory.map(([cat, amt]) => {
                  const pct = expenseStats.total > 0 ? (amt / expenseStats.total) * 100 : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-ink/60 flex-shrink-0">{cat}</div>
                      <div className="flex-1 bg-canvas rounded-full h-5 overflow-hidden">
                        <div className="bg-coral/70 h-full rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 3)}%` }}>
                          {pct > 12 && <span className="text-[9px] text-white font-medium">{pct.toFixed(0)}%</span>}
                        </div>
                      </div>
                      <div className="w-20 text-right text-xs font-medium text-ink">{fmt(amt)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Expense table */}
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-ink/60">{db.expenses.length} expenses</p>
            <Button onClick={openCreateExpense}><Plus className="w-4 h-4" /> New expense</Button>
          </div>

          {db.expenses.length === 0 ? (
            <Card><EmptyState icon={Wallet} title="No expenses recorded" hint="Add expenses to track your profit & loss" /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-ink/50 uppercase tracking-wide border-b border-line">
                      <th className="px-4 py-3 font-medium">Number</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Vendor</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Tax</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {db.expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-canvas/60 group cursor-pointer" onClick={() => setDetailExp(e)}>
                        <td className="px-4 py-3 font-medium text-ink">{e.number}</td>
                        <td className="px-4 py-3 text-ink/50 text-xs">{e.date}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ink/5 text-ink/60">{e.category}</span>
                        </td>
                        <td className="px-4 py-3 text-ink/70">{e.description}</td>
                        <td className="px-4 py-3 text-ink/60">{e.vendor}</td>
                        <td className="px-4 py-3 text-right text-ink/70">{fmt(e.amount)}</td>
                        <td className="px-4 py-3 text-right text-ink/50">{fmt(e.tax)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-ink">{fmt(e.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            e.status === 'Paid' ? 'bg-mint text-sage' :
                            e.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-sky-50 text-sky-700'
                          }`}>{e.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end" onClick={(ev) => ev.stopPropagation()}>
                            <button onClick={() => openEditExpense(e)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteExpense(e.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* ===== Invoice create/edit modal ===== */}
      {aiSuggestion && (
        <div className="mb-4">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      <Modal open={invModal} onClose={() => setInvModal(false)} title={editingId ? 'Edit document' : `New ${invForm.docType.toLowerCase()}`} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Document type">
              <Select value={invForm.docType} onChange={(e) => setInv('docType', e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <DateInput value={invForm.date} onChange={(e) => setInv('date', e.target.value)} />
            </Field>
            <Field label="Due date">
              <DateInput value={invForm.dueDate} onChange={(e) => setInv('dueDate', e.target.value)} />
            </Field>
            <Field label="Owner">
              <Select value={invForm.ownerId} onChange={(e) => { setInv('ownerId', e.target.value); setInv('petId', ''); }}>
                <option value="">Select owner…</option>
                {db.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Pet">
              <Select value={invForm.petId} onChange={(e) => setInv('petId', e.target.value)}>
                <option value="">Select pet…</option>
                {db.pets.filter((p) => p.ownerId === invForm.ownerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Tax rate (%)">
              <NumberInput value={invForm.taxRate} onChange={(e) => setInv('taxRate', e.target.value)} />
            </Field>
            <Field label={`Discount (${invForm.discountType === 'Percent' ? '%' : '$'})`}>
              <div className="flex gap-1">
                <NumberInput value={invForm.discount} onChange={(e) => setInv('discount', e.target.value)} />
                <Select value={invForm.discountType} onChange={(e) => setInv('discountType', e.target.value)} className="w-20">
                  <option value="Fixed">$</option>
                  <option value="Percent">%</option>
                </Select>
              </div>
            </Field>
          </div>

          {/* Line items */}
          <div className="border-t border-line pt-3">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Line items</div>
              <Button variant="outline" onClick={addItem}><Plus className="w-3.5 h-3.5" /> Add item</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg bg-canvas">
                  <input className={`${inputCls} col-span-4`} placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                  <Select value={it.category} onChange={(e) => updateItem(idx, { category: e.target.value as InvoiceItem['category'] })} className="col-span-2">
                    {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <NumberInput className="col-span-1" placeholder="Qty" value={String(it.qty)} onChange={(e) => updateItem(idx, { qty: parseInt(e.target.value) || 1 })} />
                  <NumberInput className="col-span-2" placeholder="Unit price" value={String(it.unitPrice)} onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                  <NumberInput className="col-span-1" placeholder="Tax%" value={String(it.taxRate)} onChange={(e) => updateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })} />
                  <div className="col-span-1 text-right text-xs font-medium text-ink pt-2">{fmt(it.qty * it.unitPrice)}</div>
                  <div className="col-span-1 flex justify-end pt-1">
                    <button onClick={() => removeItem(idx)} className="text-ink/40 hover:text-coral"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals preview */}
            <div className="flex justify-end mt-3">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{fmt(previewTotals.subtotal)}</span></div>
                <div className="flex justify-between text-ink/60"><span>Discount</span><span>-{fmt(previewTotals.discountAmt)}</span></div>
                <div className="flex justify-between text-ink/60"><span>Tax</span><span>{fmt(previewTotals.taxTotal)}</span></div>
                <div className="flex justify-between font-semibold text-ink border-t border-line pt-1"><span>Total</span><span>{fmt(previewTotals.total)}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Notes">
              <Textarea value={invForm.notes} onChange={(e) => setInv('notes', e.target.value)} placeholder="Internal notes…" />
            </Field>
            <Field label="Terms">
              <Textarea value={invForm.terms} onChange={(e) => setInv('terms', e.target.value)} placeholder="Payment terms…" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setInvModal(false)}>Cancel</Button>
            <Button onClick={saveInvoice}>{editingId ? 'Save changes' : `Create ${invForm.docType.toLowerCase()}`}</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Invoice detail modal ===== */}
      <Modal open={!!detailInv} onClose={() => setDetailInv(null)} title="Document details" wide>
        {detailInv && (() => {
          const t = invoiceTotals(detailInv);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-ink">{detailInv.number}</div>
                  <div className="text-xs text-ink/50 mt-0.5">
                    {detailInv.docType} · {detailInv.date}{detailInv.dueDate ? ` · Due ${detailInv.dueDate}` : ''}
                  </div>
                </div>
                <Badge status={detailInv.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-canvas p-3">
                  <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Client</div>
                  <div className="text-ink font-medium">{ownerName(detailInv.ownerId)}</div>
                </div>
                <div className="rounded-lg bg-canvas p-3">
                  <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Pet</div>
                  <div className="text-ink font-medium">{petName(detailInv.petId)}</div>
                </div>
                <div className="rounded-lg bg-canvas p-3">
                  <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Payment method</div>
                  <div className="text-ink font-medium">{detailInv.method || '—'}</div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-line pt-3">
                <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Line items</div>
                <div className="space-y-1">
                  {detailInv.items.map((it, idx) => (
                    <div key={idx} className="flex items-start justify-between px-3 py-2 rounded-lg bg-canvas text-xs">
                      <div>
                        <div className="text-ink/80 font-medium">{it.description}</div>
                        <div className="text-ink/40 text-[10px] mt-0.5">{it.category} · Qty {it.qty} × {fmt(it.unitPrice)}</div>
                      </div>
                      <span className="font-medium text-ink">{fmt(it.qty * it.unitPrice)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 ml-auto w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{fmt(t.subtotal)}</span></div>
                  {t.discountAmt > 0 && <div className="flex justify-between text-ink/60"><span>Discount</span><span>-{fmt(t.discountAmt)}</span></div>}
                  <div className="flex justify-between text-ink/60"><span>Tax</span><span>{fmt(t.taxTotal)}</span></div>
                  <div className="flex justify-between font-semibold text-ink border-t border-line pt-1"><span>Total</span><span>{fmt(t.total)}</span></div>
                  <div className="flex justify-between text-sage text-xs"><span>Paid</span><span>{fmt(detailInv.amountPaid)}</span></div>
                  <div className="flex justify-between font-semibold text-coral"><span>Balance</span><span>{fmt(detailInv.balance)}</span></div>
                </div>
              </div>

              {/* Payments history */}
              {detailInv.payments && detailInv.payments.length > 0 && (
                <div className="border-t border-line pt-3">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Payment history</div>
                  <div className="space-y-1">
                    {detailInv.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas text-xs">
                        <div>
                          <span className="text-ink/80 font-medium">{fmt(p.amount)}</span>
                          <span className="text-ink/40 ml-2">{p.method}</span>
                          <span className="text-ink/40 ml-2">{p.date}</span>
                        </div>
                        {p.reference && <span className="text-ink/40 text-[10px]">Ref: {p.reference}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailInv.notes && (
                <div className="rounded-lg bg-canvas p-3 text-xs text-ink/60">
                  <span className="font-semibold text-ink/80">Notes: </span>{detailInv.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={() => { openEditInvoice(detailInv); setDetailInv(null); }}>
                  <FileText className="w-4 h-4" /> Edit
                </Button>
                {detailInv.docType === 'Estimate' && detailInv.status !== 'Converted' && (
                  <Button variant="outline" onClick={() => { convertEstimate(detailInv.id); setDetailInv(null); }}>
                    <RotateCcw className="w-4 h-4" /> Convert to invoice
                  </Button>
                )}
                {(detailInv.status === 'Pending' || detailInv.status === 'Overdue' || detailInv.status === 'Sent' || detailInv.status === 'Partial') && (
                  <>
                    <Button variant="outline" onClick={() => { setPayModal(detailInv); setPayForm({ amount: String(detailInv.balance.toFixed(2)), method: 'Cash', reference: '', notes: '' }); }}>
                      <DollarSign className="w-4 h-4" /> Record payment
                    </Button>
                    <Button onClick={() => { markPaid(detailInv.id); setDetailInv(null); }}>
                      <CheckCircle2 className="w-4 h-4" /> Mark fully paid
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={() => { deleteInvoice(detailInv.id); setDetailInv(null); }} className="text-coral">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ===== Payment modal ===== */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record payment">
        {payModal && (
          <div className="space-y-3">
            <div className="rounded-lg bg-canvas p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/60">{payModal.number}</span>
                <span className="font-semibold text-ink">Balance: {fmt(payModal.balance)}</span>
              </div>
            </div>
            <Field label="Amount">
              <NumberInput value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Payment method">
              <Select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value as Payment['method'] }))}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Reference">
              <input className={inputCls} placeholder="Transaction ID…" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
            </Field>
            <Field label="Notes">
              <Textarea value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPayModal(null)}>Cancel</Button>
              <Button onClick={recordPayment}>Record payment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===== Expense create/edit modal ===== */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title={db.expenses.find((e) => e.id === expForm.id) ? 'Edit expense' : 'New expense'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Number">
              <input className={inputCls} value={expForm.number} onChange={(e) => setExp('number', e.target.value)} />
            </Field>
            <Field label="Date">
              <DateInput value={expForm.date} onChange={(e) => setExp('date', e.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={expForm.category} onChange={(e) => setExp('category', e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <input className={inputCls} placeholder="Expense description…" value={expForm.description} onChange={(e) => setExp('description', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Vendor">
              <input className={inputCls} placeholder="Vendor name…" value={expForm.vendor} onChange={(e) => setExp('vendor', e.target.value)} />
            </Field>
            <Field label="Payment method">
              <Select value={expForm.paymentMethod} onChange={(e) => setExp('paymentMethod', e.target.value)}>
                <option value="">—</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Transfer">Transfer</option>
                <option value="Cheque">Cheque</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={expForm.status} onChange={(e) => setExp('status', e.target.value)}>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Scheduled">Scheduled</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Amount">
              <NumberInput value={String(expForm.amount)} onChange={(e) => setExp('amount', parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Tax">
              <NumberInput value={String(expForm.tax)} onChange={(e) => setExp('tax', parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Total (auto)">
              <div className="flex items-center h-10 px-3 rounded-lg bg-canvas text-sm font-medium text-ink">{fmt((expForm.amount || 0) + (expForm.tax || 0))}</div>
            </Field>
            <Field label="Receipt #">
              <input className={inputCls} placeholder="Receipt number…" value={expForm.receiptNumber} onChange={(e) => setExp('receiptNumber', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recurring">
              <Select value={expForm.recurrencePattern} onChange={(e) => { setExp('recurrencePattern', e.target.value); setExp('recurring', e.target.value !== 'None'); }}>
                <option value="None">None</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={expForm.notes} onChange={(e) => setExp('notes', e.target.value)} placeholder="Optional notes…" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setExpModal(false)}>Cancel</Button>
            <Button onClick={saveExpense}>Save expense</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Expense detail modal ===== */}
      <Modal open={!!detailExp} onClose={() => setDetailExp(null)} title="Expense details">
        {detailExp && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-ink">{detailExp.number}</div>
                <div className="text-xs text-ink/50 mt-0.5">{detailExp.date}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                detailExp.status === 'Paid' ? 'bg-mint text-sage' :
                detailExp.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                'bg-sky-50 text-sky-700'
              }`}>{detailExp.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Category</div>
                <div className="text-ink font-medium">{detailExp.category}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Vendor</div>
                <div className="text-ink font-medium">{detailExp.vendor || '—'}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Payment method</div>
                <div className="text-ink font-medium">{detailExp.paymentMethod || '—'}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Receipt #</div>
                <div className="text-ink font-medium">{detailExp.receiptNumber || '—'}</div>
              </div>
            </div>
            <div className="rounded-lg bg-canvas p-3">
              <div className="text-ink/80 text-sm font-medium mb-1">{detailExp.description}</div>
              {detailExp.notes && <div className="text-xs text-ink/50">{detailExp.notes}</div>}
              {detailExp.recurring && (
                <div className="text-[10px] text-sky-700 font-semibold mt-1">Recurring: {detailExp.recurrencePattern}</div>
              )}
            </div>
            <div className="ml-auto w-48 space-y-1 text-sm">
              <div className="flex justify-between text-ink/60"><span>Amount</span><span>{fmt(detailExp.amount)}</span></div>
              <div className="flex justify-between text-ink/60"><span>Tax</span><span>{fmt(detailExp.tax)}</span></div>
              <div className="flex justify-between font-semibold text-ink border-t border-line pt-1"><span>Total</span><span>{fmt(detailExp.total)}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openEditExpense(detailExp)}><FileText className="w-4 h-4" /> Edit</Button>
              <Button variant="ghost" onClick={() => { deleteExpense(detailExp.id); setDetailExp(null); }} className="text-coral"><Trash2 className="w-4 h-4" /> Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
