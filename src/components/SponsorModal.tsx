'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Eye,
  ThumbsUp,
  Globe,
  Users,
  Target,
  MapPin,
  Calendar,
  ChevronDown,
  Check,
  Info,
  Lock,
  Zap,
  Sparkles,
} from 'lucide-react';
import type { CompanyCard } from './CompanyGridPage';

// ─── Types ───────────────────────────────────────────────────────
type Step = 'objectif' | 'audience' | 'budget' | 'apercu';

type Objective = 'visibilite' | 'engagement' | 'trafic' | 'leads';

interface SponsorModalProps {
  company: CompanyCard;
  onClose: () => void;
}

// ─── Objective data ──────────────────────────────────────────────
const objectives: { key: Objective; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: 'visibilite',
    label: 'Visibilité',
    desc: 'Augmenter la notoriété de votre marque et toucher un public plus large.',
    icon: <Eye className="w-7 h-7" />,
  },
  {
    key: 'engagement',
    label: 'Engagement',
    desc: 'Obtenir plus de mentions J\'aime, commentaires et partages sur vos publications.',
    icon: <ThumbsUp className="w-7 h-7" />,
  },
  {
    key: 'trafic',
    label: 'Trafic vers le site web',
    desc: 'Diriger les utilisateurs vers votre site web ou votre page d\'atterrissage.',
    icon: <Globe className="w-7 h-7" />,
  },
  {
    key: 'leads',
    label: 'Leads',
    desc: 'Collecter des informations de contact qualifiées pour vos prospects.',
    icon: <Users className="w-7 h-7" />,
  },
];

const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'objectif', label: 'Objectif', icon: <Target className="w-4 h-4" /> },
  { key: 'audience', label: 'Audience', icon: <Users className="w-4 h-4" /> },
  { key: 'budget', label: 'Budget & Durée', icon: <Lock className="w-4 h-4" /> },
  { key: 'apercu', label: 'Aperçu', icon: <Zap className="w-4 h-4" /> },
];

const ageRanges = ['18 – 24', '18 – 45', '25 – 34', '25 – 54', '35 – 54', '45 – 65', '55+'];

const interestSuggestions = [
  'Intelligence Artificielle',
  'Technologie',
  'Marketing Digital',
  'Entrepreneuriat',
  'Design',
  'Développement Web',
  'Innovation',
  'Startups',
  'Business',
  'Data Science',
];

// ─── Component ───────────────────────────────────────────────────
export default function SponsorModal({ company, onClose }: SponsorModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('objectif');
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);

  // Audience state
  const [location, setLocation] = useState(company.location);
  const [ageRange, setAgeRange] = useState('18 – 45');
  const [gender, setGender] = useState<'tous' | 'homme' | 'femme'>('tous');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState('');

  // Budget state
  const [dailyBudget, setDailyBudget] = useState(5);
  const [budgetMode, setBudgetMode] = useState<'daily' | 'total'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const stepIndex = steps.findIndex((s) => s.key === currentStep);
  const isStepDone = (key: Step) => {
    if (key === 'objectif') return selectedObjective !== null;
    return steps.findIndex((s) => s.key === key) < stepIndex;
  };

  const estimatedViews = useMemo(() => {
    const base = dailyBudget * 500;
    return `${Math.round(base * 0.6).toLocaleString('fr-FR')}k – ${Math.round(base * 1).toLocaleString('fr-FR')}k`;
  }, [dailyBudget]);

  const estimatedReach = useMemo(() => {
    const base = dailyBudget * 1000;
    return `${Math.round(base * 0.8).toLocaleString('fr-FR')}k – ${Math.round(base * 1.7).toLocaleString('fr-FR')}k`;
  }, [dailyBudget]);

  const filteredInterests = interestSuggestions.filter(
    (i) =>
      i.toLowerCase().includes(interestSearch.toLowerCase()) &&
      !interests.includes(i)
  );

  const handleNext = () => {
    const idx = steps.findIndex((s) => s.key === currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1].key);
  };

  const handlePrev = () => {
    const idx = steps.findIndex((s) => s.key === currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1].key);
  };

  const canProceed = () => {
    if (currentStep === 'objectif') return selectedObjective !== null;
    return true;
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const objLabel = selectedObjective
    ? objectives.find((o) => o.key === selectedObjective)?.label
    : '';

  const days = Math.max(
    1,
    Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[92vh] flex flex-col overflow-hidden">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-xl font-bold text-gray-900">
            Créer une publicité sponsorisée
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* ═══ STEP TABS ═══ */}
        <div className="px-6 mt-5">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {steps.map((step) => {
              const isActive = step.key === currentStep;
              const done = isStepDone(step.key);
              return (
                <button
                  key={step.key}
                  onClick={() => {
                    if (done || steps.findIndex((s) => s.key === step.key) <= stepIndex)
                      setCurrentStep(step.key);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-white shadow-sm'
                      : done
                      ? 'text-green-700 hover:bg-white/60'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={isActive ? { backgroundColor: '#0a66c2' } : undefined}
                >
                  {done && !isActive ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-grow overflow-y-auto px-6 py-6">
          {/* ── STEP 1: Objectif ── */}
          {currentStep === 'objectif' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Objectif de la campagne</h3>
              <p className="text-sm text-gray-500 mb-6">Quel est votre objectif principal ?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {objectives.map((obj) => {
                  const isSelected = selectedObjective === obj.key;
                  const isLeads = obj.key === 'leads';
                  return (
                    <button
                      key={obj.key}
                      onClick={() => setSelectedObjective(obj.key)}
                      className={`flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${
                          isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        } ${isLeads && isSelected ? 'bg-amber-100 text-amber-600' : ''}`}
                        style={
                          isLeads && !isSelected
                            ? { backgroundColor: '#fef3c7', color: '#d97706' }
                            : undefined
                        }
                      >
                        {obj.icon}
                      </div>
                      <p className="font-bold text-gray-900 text-sm mb-1">{obj.label}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{obj.desc}</p>
                      {isSelected && (
                        <div className="mt-3 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: Audience ── */}
          {currentStep === 'audience' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Audience</h3>
                <p className="text-sm text-gray-500">Définissez qui vous souhaitez atteindre.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Form fields */}
                <div className="space-y-5">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      Localisation
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                        placeholder="Ville, pays..."
                      />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Âge</label>
                    <div className="relative">
                      <select
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none bg-white cursor-pointer transition-colors"
                      >
                        {ageRanges.map((range) => (
                          <option key={range} value={range}>{range}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Genre</label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      {(
                        [
                          { key: 'tous', label: 'Tous', icon: <Check className="w-3.5 h-3.5" /> },
                          { key: 'homme', label: 'Homme' },
                          { key: 'femme', label: 'Femme' },
                        ] as const
                      ).map((g) => (
                        <button
                          key={g.key}
                          onClick={() => setGender(g.key)}
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-r border-gray-300 last:border-r-0 ${
                            gender === g.key
                              ? 'text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          style={gender === g.key ? { backgroundColor: '#0a66c2' } : undefined}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            {g.icon}
                            {g.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Centres d'intérêt</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={interestSearch}
                        onChange={(e) => setInterestSearch(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                        placeholder="Recherchez des centres d'intérêt..."
                      />
                    </div>
                    {/* Selected interests */}
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {interests.map((interest) => (
                          <span
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 transition-colors"
                          >
                            {interest}
                            <X className="w-3 h-3" />
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Suggestions */}
                    {interestSearch && filteredInterests.length > 0 && (
                      <div className="border border-gray-200 rounded-lg mt-2 max-h-40 overflow-y-auto">
                        {filteredInterests.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => {
                              toggleInterest(interest);
                              setInterestSearch('');
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Map placeholder */}
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 flex-grow min-h-[240px] relative">
                    {/* Stylized map of Madagascar */}
                    <svg viewBox="0 0 300 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      {/* Ocean background */}
                      <rect width="300" height="400" fill="#e0f2fe" />
                      {/* Madagascar simplified shape */}
                      <path
                        d="M140,30 L160,25 L180,35 L195,55 L200,80 L205,110 L210,140 L215,170 L220,200 L225,230 L220,260 L215,290 L205,315 L195,340 L180,360 L165,375 L150,385 L135,380 L125,365 L120,340 L118,310 L115,280 L110,250 L105,220 L100,190 L95,160 L92,130 L95,100 L100,75 L110,55 L125,38 Z"
                        fill="#d1fae5"
                        stroke="#86efac"
                        strokeWidth="1.5"
                      />
                      {/* Antananarivo marker */}
                      <circle cx="165" cy="155" r="40" fill="rgba(10,102,194,0.15)" stroke="#0a66c2" strokeWidth="2" strokeDasharray="4 3" />
                      <circle cx="165" cy="155" r="20" fill="rgba(10,102,194,0.25)" stroke="#0a66c2" strokeWidth="1.5" />
                      <circle cx="165" cy="155" r="5" fill="#0a66c2" />
                      <text x="165" y="145" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0a66c2">Antananarivo</text>
                    </svg>
                  </div>
                  {/* Reach spectrum bar */}
                  <div className="rounded-lg border border-gray-200 p-3 bg-white">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Portée estimée</p>
                    <div className="h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-blue-500 flex-1" />
                      <div className="bg-teal-400 flex-1" />
                      <div className="bg-yellow-400 flex-1" />
                      <div className="bg-orange-400 flex-1" />
                      <div className="bg-red-400 flex-1" />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-gray-400">Étroite</span>
                      <span className="text-[10px] text-gray-400">Large</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mt-2">
                      {estimatedReach} personnes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Budget & Durée ── */}
          {currentStep === 'budget' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Budget & Durée</h3>
                <p className="text-sm text-gray-500">Définissez votre investissement et la période de diffusion.</p>
              </div>

              {/* Budget Mode Toggle */}
              <div className="flex gap-0 border-b border-gray-200">
                <button
                  onClick={() => setBudgetMode('daily')}
                  className={`pb-3 px-1 text-sm font-semibold transition-colors relative ${
                    budgetMode === 'daily' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Budget Quotidien
                  {budgetMode === 'daily' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full" />
                  )}
                  <Info className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                </button>
                <button
                  onClick={() => setBudgetMode('total')}
                  className={`pb-3 px-1 text-sm font-semibold transition-colors relative ${
                    budgetMode === 'total' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Budget Total
                  {budgetMode === 'total' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full" />
                  )}
                </button>
              </div>

              {/* Budget Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-lg font-bold text-gray-900">
                      {dailyBudget} €
                    </span>
                    <span className="text-sm text-gray-500">/ jour</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #0a66c2 0%, #0a66c2 ${((dailyBudget - 5) / 195) * 100}%, #e5e7eb ${((dailyBudget - 5) / 195) * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">5 €</span>
                  <span className="text-xs text-gray-400">200 €</span>
                </div>
              </div>

              {/* Estimate */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm font-bold text-gray-900">
                  Estimé : {estimatedViews} vues / jour
                </p>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Début</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fin</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Duration summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Durée de la campagne</span>
                  <span className="text-sm font-bold text-gray-900">{days} jours</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">Budget total estimé</span>
                  <span className="text-sm font-bold text-gray-900">{(dailyBudget * days).toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Aperçu ── */}
          {currentStep === 'apercu' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Aperçu de votre campagne</h3>
                <p className="text-sm text-gray-500">Vérifiez les détails avant de lancer.</p>
              </div>

              {/* Summary Card */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Mini Banner */}
                <div className="h-24 relative overflow-hidden">
                  <img
                    src={company.banner}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="px-5 py-4 space-y-4">
                  {/* Company info */}
                  <div className="flex items-center gap-3 -mt-8 relative z-10">
                    <div
                      className="w-12 h-12 rounded-full p-[2px] bg-white shadow-md shrink-0"
                      style={company.logoGradient ? { background: company.logoGradient } : { backgroundColor: company.logoColor }}
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: company.logoColor }}
                        >
                          {company.initials}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {company.name}{company.nameHighlight ? ` ${company.nameHighlight}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">Sponsorisé</p>
                    </div>
                    <div className="ml-auto">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Objectif', value: objLabel, icon: <Target className="w-4 h-4" /> },
                      { label: 'Localisation', value: location, icon: <MapPin className="w-4 h-4" /> },
                      { label: 'Âge cible', value: ageRange, icon: <Users className="w-4 h-4" /> },
                      { label: 'Genre', value: gender === 'tous' ? 'Tous' : gender === 'homme' ? 'Homme' : 'Femme', icon: <Users className="w-4 h-4" /> },
                      { label: 'Budget', value: `${dailyBudget} € / jour`, icon: <Lock className="w-4 h-4" /> },
                      { label: 'Durée', value: `${days} jours`, icon: <Calendar className="w-4 h-4" /> },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-gray-400">{item.icon}</span>
                          <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Interests */}
                  {interests.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1.5">Centres d'intérêt</p>
                      <div className="flex flex-wrap gap-1.5">
                        {interests.map((i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                            {i}
                          </span>
                        ))}
                        </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="bg-blue-600 text-white rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm opacity-90">Budget total</span>
                      <span className="text-lg font-bold">{(dailyBudget * days).toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-90">Portée estimée</span>
                      <span className="text-sm font-semibold">{estimatedReach} personnes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-white shrink-0">
          {/* Page Selector */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: company.logoColor }}
                >
                  {company.initials}
                </div>
            <div className="relative">
              <select className="text-sm font-medium text-gray-700 appearance-none bg-transparent pr-6 outline-none cursor-pointer">
                <option>{company.name}{company.nameHighlight ? ` ${company.nameHighlight}` : ''}</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-5 py-2.5 rounded-full text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Précédent
              </button>
            )}
            {currentStep === 'apercu' ? (
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#0a66c2' }}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Lancer la campagne
                </span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ backgroundColor: canProceed() ? '#0a66c2' : undefined }}
              >
                Suivant
              </button>
            )}
          </div>
        </div>

        {/* Made with AI badge */}
        <div className="absolute -top-3 right-6 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Made with AI
          </span>
        </div>
      </div>
    </div>
  );
}
