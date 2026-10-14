/* ════════════════════════════════════════════════════════════════════
   Clinic veterinarians — one shared source of truth.
   ────────────────────────────────────────────────────────────────────
   The team page and the booking form both used to keep their own hand
   written list, which is how Dr. Lucas Grant ended up with a "Book with
   Dr. Lucas Grant" button that landed on a form where he did not exist.
   Both pages now read this file, and the `slug` doubles as the `?vet=`
   query parameter used to preselect a clinician.
   ════════════════════════════════════════════════════════════════════ */

import { Stethoscope, HeartPulse, Cat, Bone, Bird, Siren, type LucideIcon } from 'lucide-react';

export type ClinicVet = {
  /** Stable key — also the `?vet=` value accepted by the booking page. */
  slug: string;
  name: string;
  credential: string;
  role: string;
  initials: string;
  focus: string[];
  bio: string;
  languages: string;
  icon: LucideIcon;
  /** Shown in the leadership block rather than the veterinarians grid. */
  leadership?: boolean;
};

export const CLINIC_VETS: ClinicVet[] = [
  {
    slug: 'rivera',
    name: 'Dr. Amara Rivera',
    credential: 'DVM',
    role: 'Clinical Director & co-founder',
    initials: 'AR',
    focus: ['Soft-tissue surgery', 'UC Davis', '14 years in practice', 'Fear Free certified'],
    bio: 'Amara graduated from UC Davis School of Veterinary Medicine and spent six years in a busy referral hospital before opening Northgate in two rented rooms on Maple Avenue in 2019. She still operates four days a week — soft-tissue work is her first love, from complex wound reconstruction to gastrointestinal foreign bodies — and she sets the clinical protocols both branches follow. If a case is complicated, she is the one who phones you at the end of the day to talk it through.',
    languages: 'English, Spanish',
    icon: Stethoscope,
    leadership: true,
  },
  {
    slug: 'pike',
    name: 'Dr. Jonah Pike',
    credential: 'DVM',
    role: 'Senior Veterinarian',
    initials: 'JP',
    focus: ['Internal medicine', 'Cardiology', 'Echocardiography'],
    bio: 'Runs our cardiology clinic and works up the chronic cases — heart murmurs, kidney disease and the diabetics who need their curves read properly.',
    languages: 'English',
    icon: HeartPulse,
  },
  {
    slug: 'soto',
    name: 'Dr. Mei-Lin Soto',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'MS',
    focus: ['Feline medicine', 'Fear Free certified', 'Cat Friendly Practice'],
    bio: 'Led our Gold-level Cat Friendly Practice accreditation and sees cats almost exclusively, often on the floor of the consult room rather than the table.',
    languages: 'English, Mandarin',
    icon: Cat,
  },
  {
    slug: 'abara',
    name: 'Dr. Thomas Abara',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'TA',
    focus: ['Orthopaedic surgery', 'Cruciate repair', 'Fracture management'],
    bio: 'Handles our orthopaedic caseload, from cruciate and patella work to fracture repair, and reviews every post-operative rehabilitation plan himself.',
    languages: 'English, Yoruba',
    icon: Bone,
  },
  {
    slug: 'feldman',
    name: 'Dr. Hana Feldman',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'HF',
    focus: ['Exotics', 'Avian medicine', 'Small mammals'],
    bio: 'Our exotics vet — rabbits, guinea pigs, parrots, reptiles — with a dedicated quiet room and species-appropriate housing for every exotic inpatient.',
    languages: 'English, Hebrew',
    icon: Bird,
  },
  {
    slug: 'grant',
    name: 'Dr. Lucas Grant',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'LG',
    focus: ['Emergency medicine', 'Critical care', 'Toxicology'],
    bio: 'Covers emergency and critical care and is usually the voice on the end of the 24/7 line when something goes wrong at two in the morning.',
    languages: 'English, French',
    icon: Siren,
  },
];

/** Options for the booking form's "preferred veterinarian" select. */
export const VET_OPTIONS: { value: string; label: string }[] = [
  { value: 'any', label: 'No preference — first available' },
  ...CLINIC_VETS.map((v) => ({ value: v.slug, label: v.name })),
];

/** Is this a slug the booking form can preselect? */
export function isVetSlug(slug: string | null | undefined): boolean {
  return !!slug && VET_OPTIONS.some((o) => o.value === slug);
}

/** Display name for a slug — falls back to the "no preference" label. */
export function vetLabel(slug: string): string {
  return VET_OPTIONS.find((o) => o.value === slug)?.label ?? VET_OPTIONS[0].label;
}
