// ─── Shared Company Store ─────────────────────────────────────
// Lifted state so both Grid ↔ Detail ↔ Admin ↔ CreateModal can
// read & mutate the same company list.

import type { CompanyCard } from '@/components/CompanyGridPage';

const STORAGE_KEY = 'company_pages_store';

const defaultCompanies: CompanyCard[] = [
  {
    id: 'unifyfocus',
    name: 'UnifyFocus',
    nameHighlight: 'IA',
    tagline: "Alimentez votre créativité avec l'IA",
    industry: 'Intelligence Artificielle',
    employees: '11-50 employés',
    location: 'Antananarivo',
    website: 'www.unifyfocus-ia.com',
    description: "Plateforme IA innovante pour la création et l'édition multimédias.",
    followers: 2_847,
    banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop',
    logoColor: '#0a66c2',
    logoGradient: 'conic-gradient(from 180deg at 50% 50%, #D9E2EC 0deg, #98C1D9 90deg, #F4A261 180deg, #E76F51 270deg, #D9E2EC 360deg)',
    initials: 'UF',
    tags: ['IA', 'Créativité', 'Multimédia'],
  },
  {
    id: 'techmad',
    name: 'TechMad',
    tagline: 'Le digital au service de Madagascar',
    industry: 'Développement Web',
    employees: '51-200 employés',
    location: 'Antananarivo',
    website: 'www.techmad.mg',
    description: 'Agence de développement web et mobile, spécialisée dans les solutions digitales pour les entreprises malgaches.',
    followers: 5_230,
    banner: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
    logoColor: '#e11d48',
    logoGradient: 'conic-gradient(from 0deg at 50% 50%, #fecdd3 0deg, #fb7185 90deg, #e11d48 180deg, #9f1239 270deg, #fecdd3 360deg)',
    initials: 'TM',
    tags: ['Web', 'Mobile', 'E-commerce'],
  },
  {
    id: 'madafinance',
    name: 'MadaFinance',
    tagline: 'La fintech qui simplifie vos finances',
    industry: 'Finance & Fintech',
    employees: '51-200 employés',
    location: 'Antananarivo',
    website: 'www.madafinance.mg',
    description: 'Solutions de paiement mobile et de micro-finance accessibles à tous les Malgaches.',
    followers: 12_540,
    banner: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    logoColor: '#059669',
    logoGradient: 'conic-gradient(from 90deg at 50% 50%, #d1fae5 0deg, #6ee7b7 90deg, #059669 180deg, #065f46 270deg, #d1fae5 360deg)',
    initials: 'MF',
    tags: ['Fintech', 'Mobile Money', 'Banque'],
  },
  {
    id: 'greenmad',
    name: 'GreenMad',
    tagline: 'Pour un avenir durable à Madagascar',
    industry: 'Environnement & Énergie',
    employees: '11-50 employés',
    location: 'Toamasina',
    website: 'www.greenmad.mg',
    description: 'Startup dédiée aux énergies renouvelables et au développement durable sur la côte est de Madagascar.',
    followers: 3_102,
    banner: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop',
    logoColor: '#16a34a',
    logoGradient: 'conic-gradient(from 45deg at 50% 50%, #bbf7d0 0deg, #4ade80 90deg, #16a34a 180deg, #166534 270deg, #bbf7d0 360deg)',
    initials: 'GM',
    tags: ['Énergie', 'Développement durable', 'RSE'],
  },
  {
    id: 'educonnect',
    name: 'EduConnect',
    nameHighlight: 'MG',
    tagline: "L'éducation accessible à tous",
    industry: 'EdTech',
    employees: '11-50 employés',
    location: 'Antananarivo',
    website: 'www.educonnect.mg',
    description: "Plateforme éducative en ligne proposant des cours et formations adaptés au curriculum malgache.",
    followers: 8_765,
    banner: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
    logoColor: '#7c3aed',
    logoGradient: 'conic-gradient(from 270deg at 50% 50%, #ede9fe 0deg, #a78bfa 90deg, #7c3aed 180deg, #5b21b6 270deg, #ede9fe 360deg)',
    initials: 'EC',
    tags: ['Éducation', 'E-learning', 'Formation'],
  },
  {
    id: 'agrimada',
    name: 'AgriMada',
    tagline: 'Connecter les agriculteurs au marché',
    industry: 'AgriTech',
    employees: '51-200 employés',
    location: 'Fianarantsoa',
    website: 'www.agrimada.mg',
    description: 'Application mobile reliant les agriculteurs malgaches aux acheteurs, avec suivi des prix et logistique intégrée.',
    followers: 4_320,
    banner: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=800&auto=format&fit=crop',
    logoColor: '#ca8a04',
    logoGradient: 'conic-gradient(from 135deg at 50% 50%, #fef9c3 0deg, #facc15 90deg, #ca8a04 180deg, #854d0e 270deg, #fef9c3 360deg)',
    initials: 'AM',
    tags: ['Agriculture', 'Marketplace', 'Logistique'],
  },
  {
    id: 'sahamhealth',
    name: 'SahamHealth',
    tagline: 'Votre santé, notre priorité',
    industry: 'Santé & Telemedecine',
    employees: '201-500 employés',
    location: 'Antananarivo',
    website: 'www.sahamhealth.mg',
    description: 'Plateforme de télémédecine et de gestion de rendez-vous médicaux pour les patients malgaches.',
    followers: 15_890,
    banner: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
    logoColor: '#0284c7',
    logoGradient: 'conic-gradient(from 315deg at 50% 50%, #e0f2fe 0deg, #7dd3fc 90deg, #0284c7 180deg, #075985 270deg, #e0f2fe 360deg)',
    initials: 'SH',
    tags: ['Santé', 'Télémédecine', 'RDV médical'],
  },
  {
    id: 'madatour',
    name: 'MadaTour',
    tagline: 'Découvrez la beauté de Madagascar',
    industry: 'Tourisme & Voyage',
    employees: '11-50 employés',
    location: 'Nosy Be',
    website: 'www.madatour.mg',
    description: "Agence de voyage digitale spécialisée dans les circuits touristiques et l'écotourisme à Madagascar.",
    followers: 6_710,
    banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    logoColor: '#ea580c',
    logoGradient: 'conic-gradient(from 180deg at 50% 50%, #ffedd5 0deg, #fb923c 90deg, #ea580c 180deg, #9a3412 270deg, #ffedd5 360deg)',
    initials: 'MT',
    tags: ['Tourisme', 'Écotourisme', 'Voyage'],
  },
];

export const bannerOptions = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
];

export const colorOptions = [
  { label: 'Bleu LinkedIn', color: '#0a66c2' },
  { label: 'Rouge', color: '#e11d48' },
  { label: 'Vert', color: '#059669' },
  { label: 'Violet', color: '#7c3aed' },
  { label: 'Orange', color: '#ea580c' },
  { label: 'Jaune', color: '#ca8a04' },
  { label: 'Cyan', color: '#0284c7' },
  { label: 'Rose', color: '#db2777' },
];

// Load from localStorage or use defaults
export function loadCompanies(): CompanyCard[] {
  if (typeof window === 'undefined') return defaultCompanies;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CompanyCard[];
  } catch { /* ignore */ }
  return defaultCompanies;
}

export function saveCompanies(companies: CompanyCard[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  } catch { /* ignore */ }
}
