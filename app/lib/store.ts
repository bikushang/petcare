'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchDB,
  createItem,
  updateItem,
  deleteItem,
  todayISO,
  newId,
  type DB,
  type Owner,
  type Pet,
  type WeightEntry,
  type PetPhoto,
  type PetDocument,
  type FamilyMember,
  type EmergencyContact,
  type CommunicationLog,
  type NotificationItem,
  type FeedbackRecord,
  type Appointment,
  type MedRecord,
  type VitalSigns,
  type EMRAttachment,
  type SOAPNotes,
  type MedStock,
  type Invoice,
  type InvoiceItem,
  type Payment,
  type TaxLine,
  type CouponLine,
  type Expense,
  type Staff,
  type ShiftScheduleEntry,
  type AttendanceRecord,
  type LeaveRequest,
  type PayrollRecord,
  type PerformanceReview,
  type StaffDocument,
  type BonusRecord,
  type StaffActivityLog,
  type BoardingPet,
  type FeedingScheduleItem,
  type MedicationScheduleItem,
  type WalkingScheduleItem,
  type HealthCheck,
  type DailyPhoto,
  type CareNote,
  type GroomingAppt,
  type GroomingServiceItem,
  type GroomingProduct,
  type GroomingPhoto,
  type Vaccination,
  type Prescription,
  type PrescriptionItem,
  type Surgery,
  type StaffAssignment,
  type EquipmentItem,
  type AnesthesiaVital,
  type RecoveryVital,
  type LabTest,
  type LabResultParameter,
  type SampleTrackingEntry,
  type LabImage,
  type Supplier,
  type Purchase,
  type PurchaseItem,
  type PharmacySale,
  type SaleItem,
  type Batch,
  type Warehouse,
  type InventoryItem,
  type TransferItem,
  type StockTransfer,
  type StockAdjustment,
  type Campaign,
  type Segment,
  type SegmentRule,
  type SegmentRuleField,
  type SiteMessage,
  type SiteReview,
  type Subscriber,
  type MessageAttachment,
  type Collection,
  type CollectionType as ApiCollectionType,
} from './api';
import { useAuth, type User } from './auth';
import type { Role } from './platform';

export type {
  Owner,
  Pet,
  WeightEntry,
  PetPhoto,
  PetDocument,
  FamilyMember,
  EmergencyContact,
  CommunicationLog,
  NotificationItem,
  FeedbackRecord,
  Appointment,
  MedRecord,
  VitalSigns,
  EMRAttachment,
  SOAPNotes,
  MedStock,
  Invoice,
  InvoiceItem,
  Payment,
  TaxLine,
  CouponLine,
  Expense,
  Staff,
  ShiftScheduleEntry,
  AttendanceRecord,
  LeaveRequest,
  PayrollRecord,
  PerformanceReview,
  StaffDocument,
  BonusRecord,
  StaffActivityLog,
  BoardingPet,
  FeedingScheduleItem,
  MedicationScheduleItem,
  WalkingScheduleItem,
  HealthCheck,
  DailyPhoto,
  CareNote,
  GroomingAppt,
  GroomingServiceItem,
  GroomingProduct,
  GroomingPhoto,
  Vaccination,
  Prescription,
  PrescriptionItem,
  Surgery,
  StaffAssignment,
  EquipmentItem,
  AnesthesiaVital,
  RecoveryVital,
  LabTest,
  LabResultParameter,
  SampleTrackingEntry,
  LabImage,
  Supplier,
  Purchase,
  PurchaseItem,
  PharmacySale,
  SaleItem,
  Batch,
  Warehouse,
  InventoryItem,
  TransferItem,
  StockTransfer,
  StockAdjustment,
  Campaign,
  Segment,
  SegmentRule,
  SegmentRuleField,
  SiteMessage,
  SiteReview,
  Subscriber,
  MessageAttachment,
  DB,
};

export const today = todayISO;
export { newId };

type CollectionType<C extends Collection> = ApiCollectionType<C>;

const emptyDB: DB = {
  owners: [],
  pets: [],
  appointments: [],
  medRecords: [],
  medStock: [],
  invoices: [],
  expenses: [],
  staff: [],
  boarding: [],
  grooming: [],
  vaccinations: [],
  prescriptions: [],
  surgeries: [],
  labTests: [],
  suppliers: [],
  purchases: [],
  pharmacySales: [],
  warehouses: [],
  inventoryItems: [],
  stockTransfers: [],
  stockAdjustments: [],
  campaigns: [],
  segments: [],
  messages: [],
  siteReviews: [],
  subscribers: [],
};

export function useDB() {
  const [db, setDb] = useState<DB | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchDB()
      .then((data) => {
        if (mounted) setDb(data);
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setDb(emptyDB);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const create = useCallback(
    async <C extends Collection>(
      collection: C,
      item: CollectionType<C>,
    ): Promise<void> => {
      setDb((prev) => ({
        ...(prev ?? emptyDB),
        [collection]: [...(prev ?? emptyDB)[collection], item],
      }));
      try {
        await createItem(collection, item);
      } catch (err) {
        setDb((prev) => ({
          ...(prev ?? emptyDB),
          [collection]: (prev ?? emptyDB)[collection].filter((i) => i.id !== item.id),
        }));
        setError((err as Error).message);
        throw err;
      }
    },
    [],
  );

  const update = useCallback(
    async <C extends Collection>(
      collection: C,
      id: string,
      patch: Partial<CollectionType<C>>,
    ): Promise<void> => {
      // Snapshot the row so a failed request can be rolled back rather than
      // leaving the UI showing a change the database never accepted.
      let previous: CollectionType<C> | undefined;
      setDb((prev) => {
        const base = prev ?? emptyDB;
        previous = base[collection].find((i) => i.id === id) as CollectionType<C> | undefined;
        return {
          ...base,
          [collection]: base[collection].map((i) => (i.id === id ? { ...i, ...patch } : i)),
        };
      });
      try {
        await updateItem(collection, id, patch);
      } catch (err) {
        if (previous) {
          const restored = previous;
          setDb((prev) => ({
            ...(prev ?? emptyDB),
            [collection]: (prev ?? emptyDB)[collection].map((i) => (i.id === id ? restored : i)),
          }));
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [],
  );

  const remove = useCallback(
    async (collection: Collection, id: string): Promise<void> => {
      // Keep the removed row and its position so a failed delete restores it.
      let removed: { item: DB[Collection][number]; index: number } | undefined;
      setDb((prev) => {
        const base = prev ?? emptyDB;
        const index = base[collection].findIndex((i) => i.id === id);
        if (index >= 0) removed = { item: base[collection][index], index };
        return {
          ...base,
          [collection]: base[collection].filter((i) => i.id !== id),
        };
      });
      try {
        await deleteItem(collection, id);
      } catch (err) {
        if (removed) {
          const { item, index } = removed;
          setDb((prev) => {
            const base = prev ?? emptyDB;
            const list = [...base[collection]] as DB[Collection];
            (list as unknown[]).splice(index, 0, item);
            return { ...base, [collection]: list };
          });
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [],
  );

  return { db, error, create, update, remove };
}

const PLATFORM_ROLES: Role[] = ['Super Admin', 'Clinic Owner'];

export function filterDBByBranch(db: DB, user: User | null): DB {
  if (!user || !db) return db;
  if (PLATFORM_ROLES.includes(user.role)) return db;

  const branches = user.branchAccess?.length ? user.branchAccess : [user.branch];
  const branchStaffNames = db.staff
    .filter((s) => branches.includes(s.branch))
    .map((s) => s.name);
  const branchStaffIds = db.staff
    .filter((s) => branches.includes(s.branch))
    .map((s) => s.id);
  const branchVetNames = db.staff
    .filter((s) => branches.includes(s.branch) && s.role === 'Veterinarian')
    .map((s) => s.name);
  const branchOwnerIds = new Set<string>();

  const pets = db.pets.filter((p) => {
    const owner = db.owners.find((o) => o.id === p.ownerId);
    if (!owner) return false;
    const staffRecord = db.staff.find((s) => s.email === owner.email);
    if (staffRecord) {
      return branches.includes(staffRecord.branch);
    }
    return true;
  });

  pets.forEach((p) => branchOwnerIds.add(p.ownerId));
  const owners = db.owners.filter((o) => branchOwnerIds.has(o.id) || db.pets.some((p) => p.ownerId === o.id && pets.includes(p)));

  const appointments = db.appointments.filter(
    (a) => branchVetNames.includes(a.vet) || branches.includes(user.branch),
  );
  const medRecords = db.medRecords.filter(
    (r) => branchVetNames.includes(r.vet) || db.pets.find((p) => p.id === r.petId && pets.includes(p)),
  );
  const invoices = db.invoices.filter(
    (i) => branchOwnerIds.has(i.ownerId) || db.pets.find((p) => p.id === i.petId && pets.includes(p)),
  );
  const staff = db.staff.filter((s) => branches.includes(s.branch));
  const medStock = db.medStock;
  const boarding = db.boarding.filter(
    (b) => branches.includes(user.branch) || branchStaffNames.includes(b.owner),
  );
  const grooming = db.grooming.filter(
    (g) => branchStaffNames.includes(g.groomer) || branches.includes(user.branch),
  );

  const vaccinations = db.vaccinations.filter(
    (v) => branchVetNames.includes(v.vet) || db.pets.find((p) => p.id === v.petId && pets.includes(p)),
  );
  const prescriptions = db.prescriptions.filter(
    (p) => branchVetNames.includes(p.vet) || db.pets.find((pet) => pet.id === p.petId && pets.includes(pet)),
  );

  const surgeries = db.surgeries.filter(
    (s) => s.staff.some((st) => branchVetNames.includes(st.staffName)) || db.pets.find((pet) => pet.id === s.petId && pets.includes(pet)),
  );

  const labTests = db.labTests.filter(
    (l) => branchVetNames.includes(l.requestedBy) || db.pets.find((pet) => pet.id === l.petId && pets.includes(pet)),
  );

  return { owners, pets, appointments, medRecords, medStock, invoices, expenses: db.expenses, staff, boarding, grooming, vaccinations, prescriptions, surgeries, labTests, suppliers: db.suppliers, purchases: db.purchases, pharmacySales: db.pharmacySales, warehouses: db.warehouses, inventoryItems: db.inventoryItems, stockTransfers: db.stockTransfers, stockAdjustments: db.stockAdjustments, campaigns: db.campaigns, segments: db.segments, messages: db.messages, siteReviews: db.siteReviews, subscribers: db.subscribers };
}

export function useBranchDB() {
  const { user } = useAuth();
  const { db, error, create, update, remove } = useDB();
  const filteredDB = useMemo(() => (db && user ? filterDBByBranch(db, user) : db), [db, user]);
  return { db: filteredDB, rawDB: db, error, create, update, remove };
}

const ACTIVE_BRANCH_KEY = 'petcare-branch-view';

export function getActiveBranchView(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_BRANCH_KEY);
}

export function setActiveBranchView(branch: string | null) {
  if (typeof window === 'undefined') return;
  if (branch) {
    window.localStorage.setItem(ACTIVE_BRANCH_KEY, branch);
  } else {
    window.localStorage.removeItem(ACTIVE_BRANCH_KEY);
  }
}

export function useBranchView() {
  const { user } = useAuth();
  const isPlatform = user?.role === 'Super Admin' || user?.role === 'Clinic Owner';
  const [activeBranch, setActiveBranchState] = useState<string>(() => {
    const stored = getActiveBranchView();
    if (stored && isPlatform) return stored;
    return user?.branch || '';
  });

  const switchBranch = (branch: string) => {
    setActiveBranchState(branch);
    setActiveBranchView(branch);
    // Dispatch custom event so Topbar and other consumers can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('branch-switch', { detail: branch }));
    }
  };

  return { activeBranch, switchBranch, isPlatform };
}
