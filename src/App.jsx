import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Calendar, MapPin, FileText, CheckCircle, ShieldCheck, 
  Download, Printer, Plus, Search, Filter, Trash2, Award, 
  ChevronRight, X, Sparkles, Gift, Lock, Edit3, User, Phone, Users, AlertCircle, Bookmark, CreditCard
} from 'lucide-react';

const MAX_CAPACITY = 320;
const ADMIN_PASSWORD = "bettolino";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(() => {
    return window.location.pathname === '/admin' || window.location.hash.includes('admin') ? 'admin' : 'user';
  });

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', phone: '', guests: 1, allergies: '', tablePreference: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [formError, setFormError] = useState('');

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  
  // Modali Admin
  const [showAdminAddModal, setShowAdminAddModal] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    name: '', phone: '', guests: 1, allergies: '', tablePreference: '', mustPay: true, hasPaid: false
  });

  // Modal di Modifica Completa Prenotazione
  const [editingBooking, setEditingBooking] = useState(null);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      setCurrentRoute(path === '/admin' || hash.includes('admin') ? 'admin' : 'user');
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (currentRoute === 'admin' && isAdminAuthenticated) fetchBookings();
  }, [currentRoute, isAdminAuthenticated]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  const totalBookedSeats = bookings.reduce((sum, b) => sum + Number(b.guests), 0);

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    if (!formData.name.trim()) {
      setFormError('Inserisci almeno il Nome e Cognome del Referente.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_booking', {
        p_full_name: formData.name.trim(),
        p_phone: formData.phone.trim() || 'Non specificato',
        p_guests: parseInt(formData.guests, 10),
        p_allergies: formData.allergies.trim(),
        p_table_preference: formData.tablePreference.trim()
      });
      if (error) throw error;
      if (data && data.success) {
        setBookingSuccess({ id: data.reference_code, name: formData.name, phone: formData.phone || 'Non specificato', guests: formData.guests });
        setFormData({ name: '', phone: '', guests: 1, allergies: '', tablePreference: '' });
      }
    } catch (err) {
      setFormError(err.message || 'Errore durante la prenotazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setAdminLoginError(false);
    } else {
      setAdminLoginError(true);
    }
  };

  const toggleMustPay = async (id, currentMustPay) => {
    const nextMustPay = !currentMustPay;
    const updateData = nextMustPay ? { must_pay: true } : { must_pay: false, has_paid: false };
    const { error } = await supabase.from('bookings').update(updateData).eq('id', id);
    if (!error) fetchBookings();
  };

  const toggleHasPaid = async (id, currentStatus) => {
    const { error } = await supabase.from('bookings').update({ has_paid: !currentStatus }).eq('id', id);
    if (!error) fetchBookings();
  };

  const deleteBooking = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa prenotazione dal database? L'operazione non è reversibile.")) {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (!error) fetchBookings();
    }
  };

  const handleAdminAddSubmit = async (e) => {
    e.preventDefault();
    if (!adminFormData.name) return;
    
    const uniqueId = `CS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const { error } = await supabase.from('bookings').insert([{
      reference_code: uniqueId,
      full_name: adminFormData.name.trim(),
      phone: adminFormData.phone.trim() || 'Non specificato',
      guests: parseInt(adminFormData.guests, 10),
      allergies: adminFormData.allergies.trim(),
      table_preference: adminFormData.tablePreference.trim(),
      must_pay: adminFormData.mustPay,
      has_paid: adminFormData.mustPay ? adminFormData.hasPaid : false
    }]);

    if (!error) {
      setShowAdminAddModal(false);
      setAdminFormData({ name: '', phone: '', guests: 1, allergies: '', tablePreference: '', mustPay: true, hasPaid: false });
      fetchBookings();
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    const { error } = await supabase.from('bookings').update({
      full_name: editingBooking.full_name.trim(),
      phone: editingBooking.phone.trim(),
      guests: parseInt(editingBooking.guests, 10),
      allergies: editingBooking.allergies ? editingBooking.allergies.trim() : '',
      table_preference: editingBooking.table_preference ? editingBooking.table_preference.trim() : '',
      must_pay: editingBooking.must_pay,
      has_paid: editingBooking.must_pay ? editingBooking.has_paid : false
    }).eq('id', editingBooking.id);

    if (!error) {
      setEditingBooking(null);
      fetchBookings();
    } else {
      alert("Errore durante il salvataggio della modifica.");
    }
  };

  const exportCSV = () => {
    const headers = ["Codice Voucher", "Nome e Cognome", "Telefono", "Posti", "Deve Pagare", "Stato Pagamento", "Allergie", "Note / Tavolo", "Data Registrazione"];
    const rows = bookings.map(b => [
      b.reference_code, `"${b.full_name}"`, `"${b.phone}"`, b.guests, b.must_pay ? "SI" : "NO",
      b.must_pay ? (b.has_paid ? "PAGATO" : "DA PAGARE") : "-", `"${b.allergies || ''}"`, `"${b.table_preference || ''}"`, new Date(b.created_at).toLocaleDateString('it-IT')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Prenotazioni_Cena_Solidarieta_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.phone && b.phone.includes(searchQuery)) || b.reference_code.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterPayment === 'paid') return matchesSearch && b.must_pay && b.has_paid;
    if (filterPayment === 'unpaid') return matchesSearch && b.must_pay && !b.has_paid;
    if (filterPayment === 'exempt') return matchesSearch && !b.must_pay;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-rose-50/40 text-slate-800 font-sans flex flex-col justify-between relative overflow-x-hidden">
      <style>{`
        @keyframes snowfall { 0% { transform: translateY(-10px) translateX(0); opacity: 0; } 20% { opacity: 0.8; } 100% { transform: translateY(105vh) translateX(25px); opacity: 0.2; } }
        .snowflake { position: absolute; top: -20px; color: rgba(255, 255, 255, 0.7); font-size: 1rem; user-select: none; pointer-events: none; animation: snowfall linear infinite; }
      `}</style>

      <header className="bg-white border-b border-rose-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-rose-700" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Cena della Solidarietà 🎄</h1>
              <p className="text-xs text-rose-700 font-medium">Edizione Natalizia</p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-200">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-rose-700" /> Buone Feste ❄️
          </span>
        </div>
      </header>

      <main className="flex-grow">
        {currentRoute === 'user' ? (
          <div>
            <section className="bg-gradient-to-b from-rose-900 via-rose-950 to-slate-950 text-white py-14 px-4 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="snowflake" style={{ left: '10%', animationDuration: '6s', animationDelay: '0s' }}>❄</div>
                <div className="snowflake" style={{ left: '25%', animationDuration: '9s', animationDelay: '2s' }}>❅</div>
                <div className="snowflake" style={{ left: '40%', animationDuration: '7s', animationDelay: '1s' }}>❆</div>
                <div className="snowflake" style={{ left: '60%', animationDuration: '8s', animationDelay: '3s' }}>❄</div>
                <div className="snowflake" style={{ left: '75%', animationDuration: '6.5s', animationDelay: '0.5s' }}>❅</div>
                <div className="snowflake" style={{ left: '90%', animationDuration: '10s', animationDelay: '4s' }}>❆</div>
              </div>
              <div className="max-w-4xl mx-auto text-center relative z-10">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-400/20 text-amber-200 text-xs font-semibold uppercase tracking-wider rounded-full mb-3 border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /><span>Cena Natalizia di Beneficenza ❄️</span>
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">Cena della Solidarietà</h2>
                <p className="text-rose-100 text-base md:text-lg max-w-2xl mx-auto font-light">Festeggiamo insieme l'arrivo del Natale con una serata speciale all'insegna della condivisione e del sostegno benefico.</p>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 flex items-start space-x-3">
                    <Calendar className="w-6 h-6 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div><div className="text-xs text-rose-200 font-medium uppercase">Data & Ora</div><div className="text-sm font-bold text-white">Giovedì 3 Dicembre</div><div className="text-xs text-rose-100">Ore 20:00</div></div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 flex items-start space-x-3">
                    <MapPin className="w-6 h-6 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div><div className="text-xs text-rose-200 font-medium uppercase">Luogo</div><div className="text-sm font-bold text-white">Centro Sociale Reggiolo</div><div className="text-xs text-rose-100">Via IV Novembre</div></div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 flex items-start space-x-3">
                    <Award className="w-6 h-6 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div><div className="text-xs text-rose-200 font-medium uppercase">Quota</div><div className="text-sm font-bold text-white">30 € a persona</div><div className="text-xs text-rose-100">Interamente devoluti</div></div>
                  </div>
                </div>
              </div>
            </section>

            <div className="max-w-xl mx-auto px-4 py-10">
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-rose-100 relative">
                {bookingSuccess ? (
                  <div className="text-center py-6 space-y-4">
                    <CheckCircle className="w-12 h-12 text-rose-700 bg-rose-100 rounded-full p-2 mx-auto" />
                    <h3 className="text-2xl font-bold text-slate-900">Prenotazione Confermata! 🎁</h3>
                    <p className="text-slate-600 text-sm max-w-sm mx-auto">Grazie <strong className="text-slate-800">{bookingSuccess.name}</strong>, richiesta per <strong className="text-slate-800">{bookingSuccess.guests} posti</strong> presa in carico.</p>
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 my-4 text-left space-y-2">
                      <div className="flex justify-between text-xs text-slate-500"><span>Codice Riferimento:</span><span className="font-mono font-bold text-rose-900">{bookingSuccess.id}</span></div>
                      <div className="flex justify-between text-xs text-slate-500"><span>Referente:</span><span className="font-semibold text-slate-800">{bookingSuccess.name}</span></div>
                    </div>
                    <button onClick={() => setBookingSuccess(null)} className="w-full mt-4 py-3 bg-rose-800 hover:bg-rose-900 text-white font-semibold rounded-xl transition text-sm">Nuova prenotazione</button>
                  </div>
                ) : (
                  <form onSubmit={handleUserSubmit} className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-1.5"><span>Prenota i tuoi posti</span><span className="text-rose-600">❄️</span></h3>
                      <p className="text-xs text-slate-500">Compila i campi per riservare il tuo tavolo alla cena.</p>
                    </div>
                    {formError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{formError}</div>}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nome e Cognome Referente *</label>
                      <input type="text" required placeholder="es. Mario Rossi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-rose-800 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Numero di Telefono <span className="text-slate-400 font-normal lowercase">(opzionale)</span></label>
                      <input type="tel" placeholder="es. 333 1234567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-rose-800 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Posti da Prenotare *</label>
                      <select value={formData.guests} onChange={e => setFormData({...formData, guests: parseInt(e.target.value, 10)})} className="w-full px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-rose-800 text-sm bg-white">
                        {[...Array(20)].map((_, i) => <option key={i+1} value={i+1}>{i+1} {i+1 === 1 ? 'Persona' : 'Persone'}</option>)}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">Quota: 30 € a persona</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Allergie / Intolleranze</label>
                      <input type="text" placeholder="es. 1 menu celiaco, allergia alle noci..." value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-rose-800 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Vicinanza / Tavolo desiderato con</label>
                      <input type="text" placeholder="es. Vicino a famiglia Rossi" value={formData.tablePreference} onChange={e => setFormData({...formData, tablePreference: e.target.value})} className="w-full px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-rose-800 text-sm" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3.5 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-xl flex items-center justify-center space-x-2 text-sm disabled:opacity-50">
                      <span>{loading ? 'Elaborazione...' : 'Conferma Prenotazione'}</span><ChevronRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-8">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-md border border-slate-200 mt-12">
                <Lock className="w-8 h-8 text-rose-800 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-center text-slate-900 mb-1">Accesso Staff 🎄</h3>
                <form onSubmit={handleAdminLogin} className="space-y-4 mt-6">
                  <input type="password" placeholder="Inserisci Password" value={adminPassInput} onChange={e => setAdminPassInput(e.target.value)} className="w-full px-4 py-3 text-center text-lg font-bold rounded-xl border focus:ring-2 focus:ring-rose-800 outline-none" />
                  {adminLoginError && <p className="text-xs text-rose-600 text-center font-medium">Password errata.</p>}
                  <button type="submit" className="w-full py-3 bg-rose-800 text-white font-bold rounded-xl text-sm">Accedi al Database</button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                  <div>
                    <div className="flex items-center space-x-2"><ShieldCheck className="w-6 h-6 text-rose-800" /><h2 className="text-2xl font-bold text-slate-900">Database Staff 🎄</h2></div>
                    <p className="text-xs text-slate-500 mt-1">Cena della Solidarietà - Cloud Supabase</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => setShowAdminAddModal(true)} className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition"><Plus className="w-4 h-4" /><span>Nuova</span></button>
                    <button onClick={exportCSV} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border flex items-center space-x-1 transition"><Download className="w-4 h-4" /><span>Esporta CSV</span></button>
                    <button onClick={fetchBookings} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-sm">Aggiorna Dati</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase">Totale Posti Occupati</div>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalBookedSeats} <span className="text-sm font-normal text-slate-400">/ {MAX_CAPACITY}</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden"><div className="bg-rose-700 h-1.5 rounded-full" style={{ width: `${Math.min(100, (totalBookedSeats / MAX_CAPACITY) * 100)}%` }}></div></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase">Stato Pagamenti</div>
                    <div className="text-2xl font-extrabold text-emerald-800 mt-1">{bookings.filter(b => b.must_pay && b.has_paid).length} <span className="text-sm font-normal text-slate-400">Pagati</span></div>
                    <div className="text-xs text-amber-600 mt-1 font-medium">{bookings.filter(b => b.must_pay && !b.has_paid).length} Da Incassare</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase">Esenti / Omaggio</div>
                    <div className="text-2xl font-extrabold text-slate-700 mt-1">{bookings.filter(b => !b.must_pay).reduce((sum, b) => sum + b.guests, 0)}</div>
                    <div className="text-xs text-slate-400 mt-1">Ospiti accreditati</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input type="text" placeholder="Cerca referente, codice o tel..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-rose-800 bg-white outline-none" />
                    </div>
                    <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <button onClick={() => setFilterPayment('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterPayment === 'all' ? 'bg-rose-900 text-white' : 'bg-white text-slate-600 border'}`}>Tutti</button>
                      <button onClick={() => setFilterPayment('unpaid')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterPayment === 'unpaid' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border'}`}>Da Pagare</button>
                      <button onClick={() => setFilterPayment('paid')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterPayment === 'paid' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border'}`}>Pagati</button>
                      <button onClick={() => setFilterPayment('exempt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterPayment === 'exempt' ? 'bg-slate-600 text-white' : 'bg-white text-slate-600 border'}`}>Esenti</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Codice</th>
                          <th className="px-4 py-3">Referente</th>
                          <th className="px-4 py-3 text-center">Posti</th>
                          <th className="px-4 py-3">Esente?</th>
                          <th className="px-4 py-3">Pagamento</th>
                          <th className="px-4 py-3">Info / Note Staff</th>
                          <th className="px-4 py-3 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loading ? <tr><td colSpan="7" className="text-center py-8">Caricamento in corso...</td></tr> : filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-mono font-bold text-rose-900">{b.reference_code}</td>
                            <td className="px-4 py-3"><div className="font-bold text-slate-900">{b.full_name}</div><div className="text-slate-500">{b.phone}</div></td>
                            <td className="px-4 py-3 text-center font-bold bg-slate-100 rounded-md">{b.guests}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleMustPay(b.id, b.must_pay)} className={`px-2 py-1 rounded text-[10px] font-bold transition ${!b.must_pay ? 'bg-slate-200 text-slate-700' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>{!b.must_pay ? 'SI (Esente)' : 'NO (Pagante)'}</button>
                            </td>
                            <td className="px-4 py-3">
                              {b.must_pay ? (
                                <button onClick={() => toggleHasPaid(b.id, b.has_paid)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${b.has_paid ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-800'}`}>
                                  {b.has_paid ? 'PAGATO' : 'DA PAGARE'}
                                </button>
                              ) : <span className="text-slate-400 italic">Omaggio</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-xs text-[11px]">
                              {b.allergies && <div className="mb-0.5"><span className="font-bold text-rose-600">Allergie:</span> {b.allergies}</div>}
                              <div><strong className="text-slate-800">Note/Tavolo:</strong> {b.table_preference || <span className="text-slate-300 italic">Nessuna</span>}</div>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5">
                              <button 
                                onClick={() => setEditingBooking({...b})} 
                                className="inline-flex items-center px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold transition shadow-sm"
                                title="Modifica Completa"
                              >
                                <Edit3 className="w-3.5 h-3.5 mr-1 text-amber-300" />
                                Modifica
                              </button>
                              <button onClick={() => setSelectedVoucher(b)} className="px-2.5 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-[11px] font-medium transition"><FileText className="w-3.5 h-3.5 inline mr-1" /> Voucher</button>
                              <button onClick={() => deleteBooking(b.id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal di Modifica Completa Elegantissima & Scrollabile */}
      {editingBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-rose-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* Header Modale */}
            <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-5 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                  <Edit3 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Modifica Prenotazione</h3>
                  <p className="text-xs text-rose-200 font-mono">Codice: {editingBooking.reference_code}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingBooking(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scrollabile */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-800" /> Nome e Cognome Referente *
                </label>
                <input 
                  type="text" 
                  required 
                  value={editingBooking.full_name} 
                  onChange={e => setEditingBooking({...editingBooking, full_name: e.target.value})} 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm font-medium" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-800" /> Telefono
                  </label>
                  <input 
                    type="tel" 
                    value={editingBooking.phone} 
                    onChange={e => setEditingBooking({...editingBooking, phone: e.target.value})} 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-rose-800" /> Numero Posti *
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={editingBooking.guests} 
                    onChange={e => setEditingBooking({...editingBooking, guests: e.target.value})} 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm font-bold text-slate-900 bg-slate-50" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Allergie / Intolleranze
                </label>
                <input 
                  type="text" 
                  placeholder="Nessuna intolleranza segnalata"
                  value={editingBooking.allergies || ''} 
                  onChange={e => setEditingBooking({...editingBooking, allergies: e.target.value})} 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-rose-800" /> Note Staff / Tavolo Desiderato
                </label>
                <textarea 
                  rows="2"
                  placeholder="Aggiungi indicazioni sul tavolo o note dello staff..."
                  value={editingBooking.table_preference || ''} 
                  onChange={e => setEditingBooking({...editingBooking, table_preference: e.target.value})} 
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-800 outline-none text-sm resize-none" 
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" /> Gestione Amministrativa
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Qualifica Ospite</label>
                    <select 
                      value={editingBooking.must_pay ? 'yes' : 'no'} 
                      onChange={e => setEditingBooking({...editingBooking, must_pay: e.target.value === 'yes'})} 
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-rose-800"
                    >
                      <option value="yes">SÌ (Pagante - 30€)</option>
                      <option value="no">NO (Esente / Omaggio)</option>
                    </select>
                  </div>

                  {editingBooking.must_pay && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Stato Incasso</label>
                      <select 
                        value={editingBooking.has_paid ? 'paid' : 'unpaid'} 
                        onChange={e => setEditingBooking({...editingBooking, has_paid: e.target.value === 'paid'})} 
                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-rose-800"
                      >
                        <option value="unpaid">DA PAGARE</option>
                        <option value="paid">PAGATO</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottoni di Azione */}
              <div className="flex space-x-3 pt-2 flex-shrink-0">
                <button 
                  type="submit" 
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  Salva Modifiche
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingBooking(null)} 
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Annulla
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showAdminAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">Nuova Prenotazione Staff</h3><button onClick={() => setShowAdminAddModal(false)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleAdminAddSubmit} className="space-y-4">
              <div><label className="block text-xs font-semibold mb-1">Nome *</label><input type="text" required value={adminFormData.name} onChange={e => setAdminFormData({...adminFormData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div><label className="block text-xs font-semibold mb-1">Telefono</label><input type="tel" value={adminFormData.phone} onChange={e => setAdminFormData({...adminFormData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div><label className="block text-xs font-semibold mb-1">Posti</label><input type="number" min="1" value={adminFormData.guests} onChange={e => setAdminFormData({...adminFormData, guests: parseInt(e.target.value, 10)})} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div><label className="block text-xs font-semibold mb-1">Allergie</label><input type="text" value={adminFormData.allergies} onChange={e => setAdminFormData({...adminFormData, allergies: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div><label className="block text-xs font-semibold mb-1">Note Staff / Tavolo</label><input type="text" value={adminFormData.tablePreference} onChange={e => setAdminFormData({...adminFormData, tablePreference: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div><label className="block text-[11px] font-semibold mb-1">Deve Pagare?</label><select value={adminFormData.mustPay ? 'yes' : 'no'} onChange={e => setAdminFormData({...adminFormData, mustPay: e.target.value === 'yes'})} className="w-full px-3 py-2 border rounded-lg text-xs bg-white"><option value="yes">SÌ (Pagante)</option><option value="no">NO (Esente)</option></select></div>
                {adminFormData.mustPay && <div><label className="block text-[11px] font-semibold mb-1">Stato</label><select value={adminFormData.hasPaid ? 'paid' : 'unpaid'} onChange={e => setAdminFormData({...adminFormData, hasPaid: e.target.value === 'paid'})} className="w-full px-3 py-2 border rounded-lg text-xs bg-white"><option value="unpaid">DA PAGARE</option><option value="paid">PAGATO</option></select></div>}
              </div>
              <button type="submit" className="w-full py-2.5 bg-rose-800 text-white font-bold rounded-xl text-xs mt-4">Registra Forzata</button>
            </form>
          </div>
        </div>
      )}

      {selectedVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6"><span className="text-xs font-bold uppercase text-slate-400">Anteprima Voucher Ufficiale</span><div className="flex space-x-2"><button onClick={() => window.print()} className="px-3 py-1.5 bg-rose-800 text-white text-xs font-bold rounded-lg flex items-center space-x-1"><Printer className="w-4 h-4" /><span>Stampa</span></button><button onClick={() => setSelectedVoucher(null)}><X className="w-5 h-5" /></button></div></div>
            <div className="border-4 border-rose-900 p-6 rounded-xl bg-white text-slate-900">
              <div className="border-b-2 border-rose-900 pb-4 mb-4 text-center"><span className="text-[10px] font-bold tracking-widest text-rose-800 uppercase block">Voucher Ingresso Ufficiale 🎄</span><h2 className="text-xl font-extrabold text-rose-950">CENA DELLA SOLIDARIETÀ</h2><p className="text-xs text-slate-600 font-medium">Giovedì 3 Dicembre - Ore 20:00</p></div>
              <div className="bg-rose-50/60 p-3 rounded-lg text-center mb-5 border border-rose-200"><div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Codice Univoco Identificativo</div><div className="text-2xl font-mono font-black tracking-widest text-rose-950 mt-0.5">{selectedVoucher.reference_code}</div></div>
              <div className="grid grid-cols-2 gap-4 text-xs mb-5 border-b border-slate-200 pb-4">
                <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Intestatario</span><span className="font-bold text-slate-900 text-sm block">{selectedVoucher.full_name}</span><span className="text-slate-500">{selectedVoucher.phone}</span></div>
                <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Posti Prenotati</span><span className="font-extrabold text-slate-900 text-base">{selectedVoucher.guests} {selectedVoucher.guests === 1 ? 'Persona' : 'Persone'}</span></div>
                <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Luogo Evento</span><span className="font-semibold text-slate-800">Centro Sociale Reggiolo</span><span className="text-slate-500 block">Via IV Novembre</span></div>
                <div><span className="text-slate-400 block text-[10px] uppercase font-semibold">Stato Contabile Staff</span><span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${!selectedVoucher.must_pay ? 'bg-slate-200 text-slate-700' : (selectedVoucher.has_paid ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-800')}`}>{!selectedVoucher.must_pay ? 'ESENTE / OMAGGIO' : (selectedVoucher.has_paid ? 'PAGATO' : 'DA PAGARE ALL\'INGRESSO')}</span></div>
              </div>
              {selectedVoucher.allergies && <div className="text-xs bg-amber-50 p-2.5 rounded border border-amber-200 mb-4"><span className="font-bold text-amber-900">Allergie/Note:</span> {selectedVoucher.allergies}</div>}
              {selectedVoucher.table_preference && <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 mb-4"><span className="font-bold text-slate-800">Note Staff / Tavolo:</span> {selectedVoucher.table_preference}</div>}
              <div className="text-[9px] text-slate-400 text-center uppercase tracking-wider flex justify-between items-center pt-2"><span>Cena della Solidarietà</span><span>Mostrare questo voucher all'ingresso</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}