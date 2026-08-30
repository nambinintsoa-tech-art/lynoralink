'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Users,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Settings,
  Bell,
  Lock,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  ExternalLink,
  Save,
  X,
} from 'lucide-react';
import type { CompanyCard } from './CompanyGridPage';

// ─── Types ───────────────────────────────────────────────────────
type AdminTab = 'overview' | 'edit' | 'posts' | 'settings';

interface AdminPanelProps {
  company: CompanyCard;
  onUpdate: (updated: CompanyCard) => void;
  onDelete: (id: string) => void;
}

// ─── Mock analytics data ─────────────────────────────────────────
function generateWeeklyData() {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return days.map((day, i) => ({
    day,
    views: Math.floor(Math.random() * 800 + 200 + (i < 5 ? 300 : 0)),
    likes: Math.floor(Math.random() * 80 + 20),
    comments: Math.floor(Math.random() * 30 + 5),
  }));
}

const mockPosts = [
  { id: 1, text: 'Nouvelle étape pour notre entreprise ! Merci à notre communauté.', date: '15 Août 2024', status: 'published' as const, reach: 1240, likes: 89 },
  { id: 2, text: 'Nous recrutons ! Rejoignez notre équipe passionnée.', date: '12 Août 2024', status: 'published' as const, reach: 890, likes: 45 },
  { id: 3, text: 'Lancement de notre nouveau produit très bientôt...', date: '10 Août 2024', status: 'draft' as const, reach: 0, likes: 0 },
  { id: 4, text: 'Retour en images sur notre dernier événement.', date: '5 Août 2024', status: 'published' as const, reach: 2100, likes: 156 },
];

// ─── Component ───────────────────────────────────────────────────
export default function AdminPanel({ company, onUpdate, onDelete }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [saved, setSaved] = useState(false);
  const [managedPosts, setManagedPosts] = useState(mockPosts);

  // Edit form state
  const [editName, setEditName] = useState(company.name);
  const [editHighlight, setEditHighlight] = useState(company.nameHighlight ?? '');
  const [editTagline, setEditTagline] = useState(company.tagline);
  const [editDescription, setEditDescription] = useState(company.description);
  const [editIndustry, setEditIndustry] = useState(company.industry);
  const [editLocation, setEditLocation] = useState(company.location);
  const [editWebsite, setEditWebsite] = useState(company.website);
  const [editEmployees, setEditEmployees] = useState(company.employees);
  const [editTags, setEditTags] = useState(company.tags.join(', '));

  // Settings state
  const [pageVisible, setPageVisible] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showFollowerCount, setShowFollowerCount] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const weeklyData = useMemo(() => generateWeeklyData(), []);
  const maxViews = Math.max(...weeklyData.map((d) => d.views));

  const totalViews = weeklyData.reduce((s, d) => s + d.views, 0);
  const totalLikes = weeklyData.reduce((s, d) => s + d.likes, 0);
  const totalComments = weeklyData.reduce((s, d) => s + d.comments, 0);
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1) : '0';

  const displayName = company.nameHighlight ? `${company.name} ${company.nameHighlight}` : company.name;

  const handleSave = () => {
    const updated: CompanyCard = {
      ...company,
      name: editName,
      nameHighlight: editHighlight || undefined,
      tagline: editTagline,
      description: editDescription,
      industry: editIndustry,
      location: editLocation,
      website: editWebsite,
      employees: editEmployees,
      tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = () => {
    if (confirm(`Supprimer définitivement la page « ${displayName} » ? Cette action est irréversible.`)) {
      onDelete(company.id);
    }
  };

  const adminTabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 className='w-4 h-4' /> },
    { key: 'edit', label: 'Modifier', icon: <Pencil className='w-4 h-4' /> },
    { key: 'posts', label: 'Publications', icon: <MessageCircle className='w-4 h-4' /> },
    { key: 'settings', label: 'Paramètres', icon: <Settings className='w-4 h-4' /> },
  ];

  return (
    <div className='space-y-4'>
      {/* Admin workspace header */}
      <div className='rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10'>
              <Shield className='h-5 w-5 text-blue-200' />
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-blue-200'>Espace admin</p>
              <h2 className='mt-1 text-lg font-bold'>{displayName}</h2>
              <p className='mt-1 text-sm text-slate-300'>Gérez la visibilité, le contenu et les informations de votre page.</p>
            </div>
          </div>
          <span className='inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200'>
            <CheckCircle className='h-3.5 w-3.5' /> Page active
          </span>
        </div>
      </div>

      {/* Admin navigation and workspace */}
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='overflow-x-auto border-b border-slate-200'>
          <div className='flex min-w-max px-2 sm:px-3'>
          {adminTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors sm:px-5 ${
                activeTab === tab.key
                  ? 'border-blue-700 bg-blue-50/60 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className='p-5 space-y-5'>
            {/* KPI Cards */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
              {[
                { label: 'Vues cette semaine', value: totalViews.toLocaleString('fr-FR'), icon: <Eye className='w-5 h-5' />, trend: '+12%', up: true },
                { label: 'J\'aime', value: totalLikes.toLocaleString('fr-FR'), icon: <ThumbsUp className='w-5 h-5' />, trend: '+8%', up: true },
                { label: 'Commentaires', value: totalComments.toLocaleString('fr-FR'), icon: <MessageCircle className='w-5 h-5' />, trend: '-3%', up: false },
                { label: 'Taux d\'engagement', value: `${engagementRate}%`, icon: <Users className='w-5 h-5' />, trend: '+0.5%', up: true },
              ].map((kpi) => (
                <div key={kpi.label} className='bg-gray-50 rounded-xl p-4 border border-gray-100'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-gray-400'>{kpi.icon}</span>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${kpi.up ? 'text-green-600' : 'text-red-500'}`}>
                      {kpi.up ? <TrendingUp className='w-3 h-3' /> : <TrendingDown className='w-3 h-3' />}
                      {kpi.trend}
                    </span>
                  </div>
                  <p className='text-lg font-bold text-gray-900'>{kpi.value}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly Chart */}
            <div className='bg-gray-50 rounded-xl p-5 border border-gray-100'>
              <h3 className='font-bold text-gray-900 text-sm mb-4 flex items-center gap-2'>
                <BarChart3 className='w-4 h-4 text-gray-500' />
                Statistiques hebdomadaires
              </h3>
              <div className='space-y-2.5'>
                {weeklyData.map((d) => (
                  <div key={d.day} className='flex items-center gap-3'>
                    <span className='text-xs text-gray-500 w-8 shrink-0 font-medium'>{d.day}</span>
                    <div className='flex-grow bg-gray-200 rounded-full h-5 relative overflow-hidden'>
                      <div
                        className='h-full rounded-full transition-all'
                        style={{
                          width: `${(d.views / maxViews) * 100}%`,
                          backgroundColor: '#0a66c2',
                          opacity: 0.8,
                        }}
                      />
                      <span className='absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-white'>
                        {d.views}
                      </span>
                    </div>
                    <div className='flex gap-2 w-24 shrink-0 text-[10px] text-gray-500'>
                      <span className='flex items-center gap-0.5'><ThumbsUp className='w-3 h-3' />{d.likes}</span>
                      <span className='flex items-center gap-0.5'><MessageCircle className='w-3 h-3' />{d.comments}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100'>
                <div className='w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center'>
                  <Users className='w-5 h-5 text-blue-700' />
                </div>
                <div>
                  <p className='text-lg font-bold text-gray-900'>{company.followers.toLocaleString('fr-FR')}</p>
                  <p className='text-xs text-gray-500'>Abonnés totaux</p>
                </div>
              </div>
              <div className='flex items-center gap-3 bg-green-50 rounded-xl p-4 border border-green-100'>
                <div className='w-10 h-10 rounded-full bg-green-100 flex items-center justify-center'>
                  <Share2 className='w-5 h-5 text-green-700' />
                </div>
                <div>
                  <p className='text-lg font-bold text-gray-900'>4</p>
                  <p className='text-xs text-gray-500'>Publications ce mois</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT ── */}
        {activeTab === 'edit' && (
          <div className='p-5 space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='sm:col-span-2'>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Nom</label>
                <input type='text' value={editName} onChange={(e) => setEditName(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Suffixe</label>
                <input type='text' value={editHighlight} onChange={(e) => setEditHighlight(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
              </div>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Slogan</label>
              <input type='text' value={editTagline} onChange={(e) => setEditTagline(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none' />
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Secteur</label>
                <input type='text' value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Taille</label>
                <input type='text' value={editEmployees} onChange={(e) => setEditEmployees(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
              </div>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Localisation</label>
                <input type='text' value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Site web</label>
                <input type='text' value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
              </div>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Tags (séparés par des virgules)</label>
              <input type='text' value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder='IA, Créativité, Multimédia' className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600' />
            </div>
            <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
              <button onClick={handleDelete} className='flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors'>
                <Trash2 className='w-4 h-4' /> Supprimer la page
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-all active:scale-95 ${
                  saved ? 'bg-green-600' : ''
                }`}
                style={!saved ? { backgroundColor: '#0a66c2' } : undefined}
              >
                {saved ? <><CheckCircle className='w-4 h-4' /> Enregistré !</> : <><Save className='w-4 h-4' /> Enregistrer</>}
              </button>
            </div>
          </div>
        )}

        {/* ── POSTS MANAGEMENT ── */}
        {activeTab === 'posts' && (
          <div className='p-5 space-y-3'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='font-bold text-gray-900 text-sm'>Publications récentes</h3>
              <span className='text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium'>{managedPosts.length} publications</span>
            </div>
            {managedPosts.length === 0 ? (
              <div className='rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center'>
                <MessageCircle className='mx-auto mb-3 h-8 w-8 text-gray-300' />
                <p className='text-sm font-semibold text-gray-800'>Aucune publication à gérer</p>
                <p className='mt-1 text-xs text-gray-500'>Les nouvelles publications apparaîtront ici.</p>
              </div>
            ) : managedPosts.map((post) => (
              <div key={post.id} className='flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors'>
                <div className='w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs mt-0.5' style={{ backgroundColor: company.logoColor }}>
                  {company.initials}
                </div>
                <div className='flex-grow min-w-0'>
                  <p className='text-sm text-gray-800 line-clamp-1'>{post.text}</p>
                  <div className='flex items-center gap-3 mt-1.5 text-xs text-gray-500'>
                    <span className='flex items-center gap-1'><Calendar className='w-3 h-3' />{post.date}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      post.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {post.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  {post.status === 'published' && (
                    <div className='flex gap-3 mt-2 text-xs text-gray-500'>
                      <span className='flex items-center gap-1'><Eye className='w-3 h-3' />{post.reach.toLocaleString('fr-FR')}</span>
                      <span className='flex items-center gap-1'><ThumbsUp className='w-3 h-3' />{post.likes}</span>
                    </div>
                  )}
                </div>
                <div className='flex items-center gap-1 shrink-0'>
                  <button className='p-1.5 hover:bg-gray-100 rounded transition-colors' title='Modifier'>
                    <Pencil className='w-3.5 h-3.5 text-gray-500' />
                  </button>
                  <button
                    onClick={() => setManagedPosts((current) => current.filter((item) => item.id !== post.id))}
                    className='p-1.5 hover:bg-red-50 rounded transition-colors'
                    title='Supprimer'
                    aria-label={`Supprimer la publication du ${post.date}`}
                  >
                    <Trash2 className='w-3.5 h-3.5 text-red-400' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className='p-5 space-y-5'>
            {/* Page Visibility */}
            <div className='flex items-center justify-between py-3 border-b border-gray-100'>
              <div className='flex items-center gap-3'>
                <Globe className='w-5 h-5 text-gray-500' />
                <div>
                  <p className='text-sm font-semibold text-gray-900'>Visibilité de la page</p>
                  <p className='text-xs text-gray-500'>Rendre la page visible publiquement</p>
                </div>
              </div>
              <button
                onClick={() => setPageVisible(!pageVisible)}
                className={`w-11 h-6 rounded-full transition-colors relative ${pageVisible ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${pageVisible ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Allow Messages */}
            <div className='flex items-center justify-between py-3 border-b border-gray-100'>
              <div className='flex items-center gap-3'>
                <MessageCircle className='w-5 h-5 text-gray-500' />
                <div>
                  <p className='text-sm font-semibold text-gray-900'>Autoriser les messages</p>
                  <p className='text-xs text-gray-500'>Les visiteurs peuvent envoyer des messages à la page</p>
                </div>
              </div>
              <button
                onClick={() => setAllowMessages(!allowMessages)}
                className={`w-11 h-6 rounded-full transition-colors relative ${allowMessages ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${allowMessages ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Show Followers */}
            <div className='flex items-center justify-between py-3 border-b border-gray-100'>
              <div className='flex items-center gap-3'>
                <Users className='w-5 h-5 text-gray-500' />
                <div>
                  <p className='text-sm font-semibold text-gray-900'>Afficher le nombre d\'abonnés</p>
                  <p className='text-xs text-gray-500'>Le compteur d\'abonnés est visible publiquement</p>
                </div>
              </div>
              <button
                onClick={() => setShowFollowerCount(!showFollowerCount)}
                className={`w-11 h-6 rounded-full transition-colors relative ${showFollowerCount ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showFollowerCount ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Notifications */}
            <div className='flex items-center justify-between py-3 border-b border-gray-100'>
              <div className='flex items-center gap-3'>
                <Bell className='w-5 h-5 text-gray-500' />
                <div>
                  <p className='text-sm font-semibold text-gray-900'>Notifications</p>
                  <p className='text-xs text-gray-500'>Recevoir des alertes pour les nouvelles interactions</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                aria-pressed={notificationsEnabled}
                className={`w-11 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notificationsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Security */}
            <div className='flex items-center justify-between py-3'>
              <div className='flex items-center gap-3'>
                <Lock className='w-5 h-5 text-gray-500' />
                <div>
                  <p className='text-sm font-semibold text-gray-900'>Sécurité</p>
                  <p className='text-xs text-gray-500'>Authentification à deux facteurs activée</p>
                </div>
              </div>
              <span className='flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full'>
                <CheckCircle className='w-3 h-3' /> Activé
              </span>
            </div>

            {/* Danger Zone */}
            <div className='mt-4 bg-red-50 border border-red-200 rounded-xl p-4'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='w-5 h-5 text-red-500 mt-0.5 shrink-0' />
                <div>
                  <p className='text-sm font-bold text-red-700'>Zone de danger</p>
                  <p className='text-xs text-red-600 mt-1 mb-3'>Ces actions sont irréversibles. Procédez avec prudence.</p>
                  <div className='flex gap-2'>
                    <button onClick={handleDelete} className='flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-red-700 bg-white border border-red-300 hover:bg-red-100 transition-colors'>
                      <Trash2 className='w-3.5 h-3.5' /> Supprimer la page
                    </button>
                    <button className='flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition-colors'>
                      <Shield className='w-3.5 h-3.5' /> Désactiver temporairement
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
