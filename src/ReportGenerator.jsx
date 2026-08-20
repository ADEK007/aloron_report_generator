import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { useUser, useClerk, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const LOCATION_OPTIONS = [
  'অফিস (ধানমন্ডি)',
  'ঢাকা বিশ্ববিদ্যালয় (ঢাবি)',
  'জাহাঙ্গীরনগর বিশ্ববিদ্যালয় (জাবি)',
  'বুয়েট (BUET)',
  'রাজশাহী বিশ্ববিদ্যালয় (রাবি)',
  'চট্টগ্রাম বিশ্ববিদ্যালয় (চবি)',
  'নর্থ সাউথ বিশ্ববিদ্যালয় (NSU)',
  'আইইউবি (IUB)',
  'ব্র্যাক বিশ্ববিদ্যালয় (BRACU)',
  'সাভার এলাকা',
  'মিরপুর এলাকা',
  'উত্তরা এলাকা',
  'কাস্টম / অন্যান্য'
];

const TRANSPORT_OPTIONS = [
  'বাস (Bus)',
  'সিএনজি (CNG)',
  'রিকশা (Rickshaw)',
  'উবার / পাঠাও (Ride Sharing)',
  'ট্রেন (Train)',
  'হেঁটে / অন্যান্য'
];

export default function ReportGenerator() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  // Convex mutations & queries
  const saveReportMutation = useMutation(api.reports.saveReport);
  const myReports = useQuery(
    api.reports.getMyReports,
    isSignedIn && user?.id ? { userId: user.id } : 'skip'
  );

  // General Info State (Clean Initial State)
  const [officerName, setOfficerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [designation, setDesignation] = useState('');
  const [area, setArea] = useState('');
  const [reportTypes, setReportTypes] = useState({
    daily: false,
    weekly: false,
    monthly: false,
    emergency: false
  });

  // Section 1: Maintenance State (Starts Empty)
  const [maintenanceList, setMaintenanceList] = useState([]);

  // Section 2: Marketing State (Starts Empty)
  const [marketingList, setMarketingList] = useState([]);

  // Section 3: Travel State (Starts Empty)
  const [travelList, setTravelList] = useState([]);

  // Additional Daily Expenses
  const [foodCost, setFoodCost] = useState('');
  const [parcelCost, setParcelCost] = useState('');
  const [otherCost, setOtherCost] = useState('');

  // Remarks
  const [remarks, setRemarks] = useState('');

  // Active Tab: 'input' or 'preview'
  const [activeTab, setActiveTab] = useState('input');

  // Saving & Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Auto-fill officer name from Clerk / Google Account when logged in
  useEffect(() => {
    if (isSignedIn && user && !officerName) {
      const name = user.fullName || user.firstName || user.username || '';
      if (name) {
        setOfficerName(name);
      }
    }
  }, [isSignedIn, user]);

  // Handler for officer name field click (prompt login if not signed in)
  const handleOfficerNameClick = () => {
    if (!isSignedIn && isLoaded) {
      openSignIn();
    }
  };

  // Maintenance handlers
  const addMaintenance = () => {
    setMaintenanceList([
      ...maintenanceList,
      { id: Date.now(), machineName: '', location: '', issue: '', action: '', status: 'OK', cost: '' }
    ]);
  };

  const updateMaintenance = (index, field, value) => {
    const updated = [...maintenanceList];
    updated[index][field] = value;
    setMaintenanceList(updated);
  };

  const removeMaintenance = (index) => {
    setMaintenanceList(maintenanceList.filter((_, i) => i !== index));
  };

  // Marketing handlers
  const addMarketing = () => {
    setMarketingList([
      ...marketingList,
      { id: Date.now(), clientName: '', activity: '', contactPerson: '', result: '', status: '', cost: '' }
    ]);
  };

  const updateMarketing = (index, field, value) => {
    const updated = [...marketingList];
    updated[index][field] = value;
    setMarketingList(updated);
  };

  const removeMarketing = (index) => {
    setMarketingList(marketingList.filter((_, i) => i !== index));
  };

  // Travel handlers
  const addTravel = () => {
    setTravelList([
      ...travelList,
      {
        id: Date.now(),
        fromLoc: LOCATION_OPTIONS[0],
        fromCustom: '',
        toLoc: LOCATION_OPTIONS[1],
        toCustom: '',
        transport: TRANSPORT_OPTIONS[0],
        purpose: '',
        travelCost: '',
        otherCost: ''
      }
    ]);
  };

  const updateTravel = (index, field, value) => {
    const updated = [...travelList];
    updated[index][field] = value;
    setTravelList(updated);
  };

  const removeTravel = (index) => {
    setTravelList(travelList.filter((_, i) => i !== index));
  };

  // Calculations
  const parseNum = (val) => parseFloat(val) || 0;
  const maintenanceTotal = maintenanceList.reduce((sum, item) => sum + parseNum(item.cost), 0);
  const marketingTotal = marketingList.reduce((sum, item) => sum + parseNum(item.cost), 0);
  const travelTotal = travelList.reduce(
    (sum, item) => sum + parseNum(item.travelCost) + parseNum(item.otherCost),
    0
  );
  const grandTotal =
    maintenanceTotal +
    marketingTotal +
    travelTotal +
    parseNum(foodCost) +
    parseNum(parcelCost) +
    parseNum(otherCost);

  // Save report to Convex database
  const saveToConvex = async () => {
    try {
      setIsSaving(true);
      await saveReportMutation({
        userId: user?.id,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        officerName: officerName || 'অফিসার',
        date: date || new Date().toISOString().split('T')[0],
        designation: designation || '',
        area: area || '',
        reportTypes: reportTypes,
        maintenanceList: maintenanceList.map((item) => ({
          id: item.id,
          machineName: item.machineName || '',
          location: item.location || '',
          issue: item.issue || '',
          action: item.action || '',
          status: item.status || 'OK',
          cost: item.cost || '0'
        })),
        marketingList: marketingList.map((item) => ({
          id: item.id,
          clientName: item.clientName || '',
          activity: item.activity || '',
          contactPerson: item.contactPerson || '',
          result: item.result || '',
          status: item.status || '',
          cost: item.cost || '0'
        })),
        travelList: travelList.map((item) => ({
          id: item.id,
          fromLoc: item.fromLoc || '',
          fromCustom: item.fromCustom || '',
          toLoc: item.toLoc || '',
          toCustom: item.toCustom || '',
          transport: item.transport || '',
          purpose: item.purpose || '',
          travelCost: item.travelCost || '0',
          otherCost: item.otherCost || '0'
        })),
        foodCost: foodCost || '0',
        parcelCost: parcelCost || '0',
        otherCost: otherCost || '0',
        remarks: remarks || '',
        grandTotal: grandTotal || 0
      });
      setSaveSuccessMsg('✅ ক্লাউড ডাটাবেজে (Convex) সফলভাবে সংরক্ষিত হয়েছে!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (error) {
      console.error('Error saving to Convex:', error);
      setSaveSuccessMsg('⚠️ ডাটাবেজ সেভ করার সময় সমস্যা হয়েছে, তবে প্রিভিউ তৈরি হয়েছে।');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Preview and save action
  const handlePreviewAndSave = async () => {
    await saveToConvex();
    setActiveTab('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load past report from Convex history
  const loadReport = (rep) => {
    if (!rep) return;
    setOfficerName(rep.officerName || '');
    setDate(rep.date || new Date().toISOString().split('T')[0]);
    setDesignation(rep.designation || '');
    setArea(rep.area || '');
    if (rep.reportTypes) setReportTypes(rep.reportTypes);
    if (rep.maintenanceList) setMaintenanceList(rep.maintenanceList);
    if (rep.marketingList) setMarketingList(rep.marketingList);
    if (rep.travelList) setTravelList(rep.travelList);
    setFoodCost(rep.foodCost || '');
    setParcelCost(rep.parcelCost || '');
    setOtherCost(rep.otherCost || '');
    setRemarks(rep.remarks || '');
    setShowHistory(false);
    setActiveTab('input');
    setSaveSuccessMsg('📂 সংরক্ষিত রিপোর্ট সফলভাবে লোড করা হয়েছে!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // PDF Export configured strictly for 100% exact A4 format
  const handleDownloadPDF = async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
    const element = document.getElementById('pdf-report-template');
    const opt = {
      margin: 0,
      filename: `Operation_Report_${date}_${officerName || 'Officer'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowWidth: 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/90 p-2 sm:p-4 md:p-6 text-slate-800 font-sans antialiased">
      {/* Top Header Card */}
      <header className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xs border border-slate-200/90 p-3.5 sm:p-5 mb-4 sm:mb-6 no-print">
        {/* Top Info Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#14532d] tracking-tight leading-tight">
                ALORON PROJUKTI (আলোড়ন প্রযুক্তি)
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                অপারেশন, মেইনটেনেন্স ও মার্কেটিং রিপোর্ট জেনারেটর
              </p>
            </div>
          </div>

          {/* Auth Controls on Mobile & Desktop */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <SignedIn>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl">
                <UserButton afterSignOutUrl="/" />
                <div className="text-left">
                  <div className="text-xs font-bold text-green-950 leading-none">
                    {user?.fullName || user?.firstName}
                  </div>
                  <div className="text-[10px] text-green-700 leading-none mt-0.5 hidden sm:block">
                    {user?.primaryEmailAddress?.emailAddress}
                  </div>
                </div>
              </div>
            </SignedIn>

            <SignedOut>
              <button
                type="button"
                onClick={() => openSignIn()}
                className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <span>🔐</span> <span className="hidden xs:inline">গুগল দিয়ে</span> লগইন
              </button>
            </SignedOut>

            {isSignedIn && myReports && myReports.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 text-xs px-2.5 sm:px-3 py-2 rounded-xl font-semibold flex items-center gap-1 transition"
              >
                <span>📂</span> হিস্ট্রি ({myReports.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Pill on Mobile */}
        <div className="flex items-center gap-2 mt-3 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-2.5 sm:py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
              activeTab === 'input'
                ? 'bg-[#15803d] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>📝</span> ইনপুট ফর্ম
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2.5 sm:py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
              activeTab === 'preview'
                ? 'bg-[#15803d] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>👁️</span> প্রিভিউ ও ডাউনলোড
          </button>
        </div>

        {/* Global Save Feedback Alert */}
        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs sm:text-sm font-semibold text-emerald-950 flex items-center gap-2 animate-fadeIn">
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Previous Reports History Drawer */}
        {showHistory && isSignedIn && myReports && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                📂 সংরক্ষিত পূর্ববর্তী রিপোর্টসমূহ:
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs text-slate-500 hover:text-slate-700 p-1"
              >
                ✕ বন্ধ করুন
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
              {myReports.map((rep) => (
                <div
                  key={rep._id}
                  onClick={() => loadReport(rep)}
                  className="bg-slate-50 hover:bg-green-50 active:bg-green-100 border border-slate-200 hover:border-green-400 p-2.5 rounded-xl cursor-pointer transition text-left"
                >
                  <div className="font-bold text-xs text-green-950 truncate">
                    {rep.officerName || 'অফিসার'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    তারিখ: {rep.date} | খরচ: ৳ {rep.grandTotal}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    সেভ: {new Date(rep.createdAt).toLocaleDateString('bn-BD')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons inside Preview Tab */}
        {activeTab === 'preview' && (
          <div className="flex flex-wrap gap-2 justify-stretch sm:justify-end mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('input')}
              className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <span>✏️</span> এডিট করুন
            </button>
            <button
              type="button"
              onClick={saveToConvex}
              disabled={isSaving}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <span>💾</span> {isSaving ? 'সেভ হচ্ছে...' : 'ক্লাউডে সেভ'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition"
            >
              <span>📥</span> সরাসরি PDF ডাউনলোড
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xs transition"
            >
              <span>🖨️</span> প্রিন্ট / Save as PDF
            </button>
          </div>
        )}
      </header>

      {/* Main Form Container */}
      <main className="max-w-5xl mx-auto">
        {/* INPUT FORM VIEW */}
        {activeTab === 'input' && (
          <div className="space-y-4 sm:space-y-6 no-print pb-12">
            {/* 1. General Info Card */}
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#14532d] flex items-center gap-2">
                  <span>📑</span> সাধারণ তথ্য (General Info)
                </h2>
                {!isSignedIn && (
                  <button
                    type="button"
                    onClick={() => openSignIn()}
                    className="self-start sm:self-auto text-xs text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
                  >
                    গুগল দিয়ে নাম অটো-পূরণ করুন ↗
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    অফিসারের নাম:
                    {!isSignedIn && (
                      <span className="text-[10px] text-emerald-700 font-normal ml-1">
                        (লগইন করতে ক্লিক করুন)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    onClick={handleOfficerNameClick}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    তারিখ:
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    আইডি / পদবী:
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="যেমন: Field Engineer / FO-102"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    অঞ্চল / এরিয়া:
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="যেমন: ঢাকা জোন - সাভার / ঢাবি"
                    className="form-input"
                  />
                </div>
              </div>

              {/* Checkboxes for Report Type (Touch Friendly Cards) */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  রিপোর্টের ধরণ (টিক দিন):
                </span>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                  {[
                    ['daily', 'ডেইলি চেক (Daily Check)'],
                    ['weekly', 'উইকলি চেক (Weekly Check)'],
                    ['monthly', 'মান্থলি চেক (Monthly Check)'],
                    ['emergency', 'জরুরী মেইনটেনেন্স & মার্কেটিং']
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                        reportTypes[key]
                          ? 'bg-green-50/80 border-green-500 text-green-950 font-semibold'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={reportTypes[key]}
                        onChange={(e) =>
                          setReportTypes({ ...reportTypes, [key]: e.target.checked })
                        }
                        className="w-4 h-4 text-green-700 rounded border-slate-300 focus:ring-green-600 cursor-pointer"
                      />
                      <span className="text-xs sm:text-[13px] leading-tight">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. Section 1: Maintenance Details */}
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#14532d]">
                  ১. মেশিন হেলথ চেক ও মেইনটেনেন্সের বিবরণ
                </h2>
                <button
                  type="button"
                  onClick={addMaintenance}
                  className="self-start sm:self-auto bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <span>+</span> নতুন মেইনটেনেন্স যোগ করুন
                </button>
              </div>

              {maintenanceList.length === 0 ? (
                <div className="p-4 sm:p-5 bg-slate-50/80 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm italic">
                  কোনো মেইনটেনেন্স যোগ করা হয়নি।
                </div>
              ) : (
                <div className="space-y-3.5">
                  {maintenanceList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-5 border border-slate-200/90 rounded-2xl bg-slate-50/60 relative shadow-2xs"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                          মেশিন #{String(index + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMaintenance(index)}
                          className="text-red-600 hover:text-red-700 active:scale-95 font-bold text-xs bg-white px-3 py-1 border border-red-200 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          ✕ ডিলিট
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            মেশিনের নাম ও আইডি:
                          </label>
                          <input
                            type="text"
                            value={item.machineName}
                            onChange={(e) => updateMaintenance(index, 'machineName', e.target.value)}
                            placeholder="যেমন: CLKBX-V1 #04"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            লোকেশন / ক্লায়েন্ট:
                          </label>
                          <input
                            type="text"
                            value={item.location}
                            onChange={(e) => updateMaintenance(index, 'location', e.target.value)}
                            placeholder="যেমন: ঢাবি টিএসসি / জাবি ক্যাফেটেরিয়া"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            চেক / সমস্যার ধরন:
                          </label>
                          <input
                            type="text"
                            value={item.issue}
                            onChange={(e) => updateMaintenance(index, 'issue', e.target.value)}
                            placeholder="যেমন: ওয়াটার পাম্প কানেক্টর লুজ"
                            className="form-input"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            গৃহীত ব্যবস্থা / কাজের বিবরণ:
                          </label>
                          <input
                            type="text"
                            value={item.action}
                            onChange={(e) => updateMaintenance(index, 'action', e.target.value)}
                            placeholder="যেমন: ক্যাবল রিপ্লেস ও সেন্সর ক্যালিব্রেশন করা হয়েছে"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            স্ট্যাটাস:
                          </label>
                          <select
                            value={item.status}
                            onChange={(e) => updateMaintenance(index, 'status', e.target.value)}
                            className="form-select"
                          >
                            <option value="OK">ওকে (OK)</option>
                            <option value="PARTIAL">আংশিক ওকে</option>
                            <option value="REQUIRED">মেইনটেনেন্স প্রয়োজন</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            খরচ (৳):
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={item.cost}
                            onChange={(e) => updateMaintenance(index, 'cost', e.target.value)}
                            placeholder="0"
                            className="form-input font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. Section 2: Marketing Details */}
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#14532d]">
                  ২. মার্কেটিং ও প্রপোজাল কার্যক্রমের বিবরণ
                </h2>
                <button
                  type="button"
                  onClick={addMarketing}
                  className="self-start sm:self-auto bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <span>+</span> নতুন মার্কেটিং কার্যক্রম যোগ করুন
                </button>
              </div>

              {marketingList.length === 0 ? (
                <div className="p-4 sm:p-5 bg-slate-50/80 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm italic">
                  কোনো মার্কেটিং কার্যক্রম যোগ করা হয়নি।
                </div>
              ) : (
                <div className="space-y-3.5">
                  {marketingList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-5 border border-slate-200/90 rounded-2xl bg-slate-50/60 relative shadow-2xs"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                          মার্কেটিং #{String(index + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMarketing(index)}
                          className="text-red-600 hover:text-red-700 active:scale-95 font-bold text-xs bg-white px-3 py-1 border border-red-200 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          ✕ ডিলিট
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            মেশিন / ক্লায়েন্টের নাম:
                          </label>
                          <input
                            type="text"
                            value={item.clientName}
                            onChange={(e) => updateMarketing(index, 'clientName', e.target.value)}
                            placeholder="যেমন: নর্থ সাউথ ইউনিভার্সিটি ক্যাফেটেরিয়া"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            মার্কেটিং কার্যক্রম:
                          </label>
                          <input
                            type="text"
                            value={item.activity}
                            onChange={(e) => updateMarketing(index, 'activity', e.target.value)}
                            placeholder="যেমন: প্রপোজাল প্রেজেন্টেশন ও আলোচনা"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            যোগাযোগকৃত ব্যক্তি ও মোবাইল:
                          </label>
                          <input
                            type="text"
                            value={item.contactPerson}
                            onChange={(e) => updateMarketing(index, 'contactPerson', e.target.value)}
                            placeholder="যেমন: মোঃ রফিকুল ইসলাম (017XXXXXXXX)"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            ফলাফল / পরবর্তী পদক্ষেপ:
                          </label>
                          <input
                            type="text"
                            value={item.result}
                            onChange={(e) => updateMarketing(index, 'result', e.target.value)}
                            placeholder="যেমন: আগামী সপ্তাহে মিটিং কল করা হবে"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            স্ট্যাটাস / মন্তব্য:
                          </label>
                          <input
                            type="text"
                            value={item.status}
                            onChange={(e) => updateMarketing(index, 'status', e.target.value)}
                            placeholder="যেমন: পজিটিভ রেসপন্স"
                            className="form-input"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            খরচ (৳):
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={item.cost}
                            onChange={(e) => updateMarketing(index, 'cost', e.target.value)}
                            placeholder="0"
                            className="form-input font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4. Section 3: Daily Travel & Expenses */}
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#c2410c]">
                  ৩. দৈনিক যাতায়াত খরচ ও হিসাবের বিবরণ
                </h2>
                <button
                  type="button"
                  onClick={addTravel}
                  className="self-start sm:self-auto bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <span>+</span> নতুন যাতায়াত যোগ করুন
                </button>
              </div>

              {travelList.length === 0 ? (
                <div className="p-4 sm:p-5 bg-slate-50/80 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs sm:text-sm italic mb-4">
                  কোনো যাতায়াত তথ্য যোগ করা হয়নি।
                </div>
              ) : (
                <div className="space-y-3.5 mb-5">
                  {travelList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-5 border border-slate-200/90 rounded-2xl bg-slate-50/60 relative shadow-2xs"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-block bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                          যাতায়াত #{String(index + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTravel(index)}
                          className="text-red-600 hover:text-red-700 active:scale-95 font-bold text-xs bg-white px-3 py-1 border border-red-200 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          ✕ ডিলিট
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {/* From Location */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            কোথা থেকে (From):
                          </label>
                          <select
                            value={item.fromLoc}
                            onChange={(e) => updateTravel(index, 'fromLoc', e.target.value)}
                            className="form-select mb-1.5"
                          >
                            {LOCATION_OPTIONS.map((loc, i) => (
                              <option key={i} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                          {item.fromLoc === 'কাস্টম / অন্যান্য' && (
                            <input
                              type="text"
                              value={item.fromCustom}
                              onChange={(e) => updateTravel(index, 'fromCustom', e.target.value)}
                              placeholder="লোকেশন নাম লিখুন"
                              className="form-input"
                            />
                          )}
                        </div>

                        {/* To Location */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            কোথায় (To):
                          </label>
                          <select
                            value={item.toLoc}
                            onChange={(e) => updateTravel(index, 'toLoc', e.target.value)}
                            className="form-select mb-1.5"
                          >
                            {LOCATION_OPTIONS.map((loc, i) => (
                              <option key={i} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                          {item.toLoc === 'কাস্টম / অন্যান্য' && (
                            <input
                              type="text"
                              value={item.toCustom}
                              onChange={(e) => updateTravel(index, 'toCustom', e.target.value)}
                              placeholder="লোকেশন নাম লিখুন"
                              className="form-input"
                            />
                          )}
                        </div>

                        {/* Transport Mode */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            যাতায়াতের মাধ্যম:
                          </label>
                          <select
                            value={item.transport}
                            onChange={(e) => updateTravel(index, 'transport', e.target.value)}
                            className="form-select"
                          >
                            {TRANSPORT_OPTIONS.map((t, i) => (
                              <option key={i} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Purpose */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            উদ্দেশ্য / কারণ:
                          </label>
                          <input
                            type="text"
                            value={item.purpose}
                            onChange={(e) => updateTravel(index, 'purpose', e.target.value)}
                            placeholder="যেমন: সার্ভিসিং / ক্লায়েন্ট ভিজিট"
                            className="form-input"
                          />
                        </div>

                        {/* Travel Cost */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            যাতায়াত খরচ (৳):
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={item.travelCost}
                            onChange={(e) => updateTravel(index, 'travelCost', e.target.value)}
                            placeholder="0"
                            className="form-input font-semibold"
                          />
                        </div>

                        {/* Other Travel Cost */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            অন্যান্য যাতায়াত খরচ (৳):
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={item.otherCost}
                            onChange={(e) => updateTravel(index, 'otherCost', e.target.value)}
                            placeholder="0"
                            className="form-input font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Expenses Section */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-xs sm:text-sm font-bold text-slate-700 mb-3">
                  অন্যান্য দৈনিক খরচসমূহ (Food, Parcel & Misc):
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      খাবার খরচ (টাকা):
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={foodCost}
                      onChange={(e) => setFoodCost(e.target.value)}
                      placeholder="0"
                      className="form-input font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      পার্সেল / অন্যান্য খরচ (টাকা):
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={parcelCost}
                      onChange={(e) => setParcelCost(e.target.value)}
                      placeholder="0"
                      className="form-input font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      বিবিধ অন্যান্য খরচ (টাকা):
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={otherCost}
                      onChange={(e) => setOtherCost(e.target.value)}
                      placeholder="0"
                      className="form-input font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Grand Total Bar */}
                <div className="mt-4 bg-emerald-50/90 border border-emerald-200/90 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 shadow-xs">
                  <span className="font-bold text-emerald-950 text-xs sm:text-sm">
                    সর্বমোট হিসাবকৃত খরচ (Grand Total):
                  </span>
                  <span className="text-2xl font-black text-emerald-700">
                    ৳ {grandTotal.toLocaleString('bn-BD')}
                  </span>
                </div>
              </div>
            </section>

            {/* 5. Section 4: Remarks */}
            <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                বিশেষ মন্তব্য / পরবর্তী জরুরী সুপারিশ
              </h2>
              <textarea
                rows="3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="এখানে আপনার বিশেষ কোনো মন্তব্য বা সুপারভাইজারের দৃষ্টি আকর্ষণমূলক বক্তব্য লিখুন..."
                className="form-textarea resize-y min-h-[90px]"
              ></textarea>
            </section>

            {/* Submit / Preview Button */}
            <div className="text-center pt-2 pb-6">
              <button
                type="button"
                onClick={handlePreviewAndSave}
                disabled={isSaving}
                className="w-full sm:w-auto bg-[#15803d] hover:bg-[#166534] active:scale-[0.98] disabled:opacity-50 text-white font-bold text-base px-8 py-4 sm:py-3.5 rounded-2xl shadow-lg shadow-green-700/25 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>🔍</span> {isSaving ? 'সংরক্ষণ ও তৈরি হচ্ছে...' : 'প্রিভিউ দেখুন ও পিডিএফ জেনারেট করুন →'}
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW / PDF TEMPLATE VIEW */}
        <div className={activeTab === 'input' ? 'hidden' : 'block pb-12'}>
          {/* Mobile Pan / Scroll Hint */}
          <div className="sm:hidden mb-3 text-center">
            <span className="inline-flex items-center gap-1.5 bg-slate-200/90 text-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              👉 মোবাইলে সম্পূর্ণ A4 দেখতে ডানে-বামে স্ক্রোল বা জুম করুন
            </span>
          </div>

          {/* Responsive Scroll Container for A4 Preview on Phones */}
          <div className="w-full overflow-x-auto preview-scroll-container pb-6 -mx-2 px-2 sm:mx-0 sm:px-0">
            <div
              id="pdf-report-template"
              className="pdf-template bg-white text-black shadow-lg rounded-xl"
            >
              {/* 1. Header Banner */}
              <div className="flex justify-between items-center mb-3 pb-1">
                <div>
                  <h1 className="text-[24px] font-extrabold tracking-wide text-[#166534] uppercase font-sans m-0 leading-none">
                    ALORON PROJUKTI
                  </h1>
                </div>
                <div className="bg-[#166534] text-white px-5 py-2 rounded-lg text-center shadow-xs">
                  <div className="text-[13px] font-bold leading-tight">আলোড়ন প্রযুক্তি</div>
                  <div className="text-[9.5px] font-normal leading-tight opacity-95 mt-0.5">
                    অপারেশন, মেইনটেনেন্স ও মার্কেটিং রিপোর্ট
                  </div>
                </div>
              </div>

              {/* 2. Officer Meta Box (2x2 bordered grid with generous vertical padding) */}
              <table className="w-full border-collapse border border-black mb-0 text-[11px]">
                <tbody>
                  <tr>
                    <td className="border border-black px-3 py-2 w-1/2 align-middle">
                      <span className="font-bold text-black">অফিসারের নাম:</span>{' '}
                      <span className="font-medium text-black">{officerName || ''}</span>
                    </td>
                    <td className="border border-black px-3 py-2 w-1/2 align-middle">
                      <span className="font-bold text-black">তারিখ:</span>{' '}
                      <span className="font-medium text-black">{date || ''}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black px-3 py-2 w-1/2 align-middle">
                      <span className="font-bold text-black">আইডি / পদবী:</span>{' '}
                      <span className="font-medium text-black">{designation || ''}</span>
                    </td>
                    <td className="border border-black px-3 py-2 w-1/2 align-middle">
                      <span className="font-bold text-black">অঞ্চল / এরিয়া:</span>{' '}
                      <span className="font-medium text-black">{area || ''}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 3. Report Types Row */}
              <div className="border-x border-b border-black px-3 py-2 mb-3 bg-white flex justify-between items-center text-[10.5px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-[12px] font-bold leading-none">{reportTypes.daily ? '☑' : '☐'}</span> ডেইলি চেক (Daily Check)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-[12px] font-bold leading-none">{reportTypes.weekly ? '☑' : '☐'}</span> উইকলি চেক (Weekly Check)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-[12px] font-bold leading-none">{reportTypes.monthly ? '☑' : '☐'}</span> মান্থলি চেক (Monthly Check)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-[12px] font-bold leading-none">{reportTypes.emergency ? '☑' : '☐'}</span> জরুরী মেইনটেনেন্স & মার্কেটিং
                </span>
              </div>

              {/* 4. Section 1: Maintenance Table (Dynamic Rows) */}
              <div className="mb-3.5">
                <div className="bg-[#166534] text-white font-bold text-[11px] px-3 py-1.5 border border-black border-b-0">
                  ১. মেশিন হেলথ চেক ও মেইনটেনেন্সের বিবরণ (Machine Maintenance & Health Check)
                </div>
                <table className="w-full border-collapse border border-black text-left text-[10px]">
                  <thead>
                    <tr className="bg-white text-center font-bold">
                      <th className="border border-black px-1.5 py-1.5 align-middle" style={{ width: '4%' }}>ক্র:</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '20%' }}>মেশিনের নাম ও আইডি</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '16%' }}>লোকেশন / ক্লায়েন্ট</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '18%' }}>চেক / সমস্যার ধরন</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '21%' }}>গৃহীত ব্যবস্থা / কাজের বিবরণ</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '14%' }}>স্ট্যাটাস</th>
                      <th className="border border-black px-2 py-1.5 align-middle text-right" style={{ width: '7%' }}>খরচ (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceList.length > 0 ? (
                      maintenanceList.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="border border-black text-center font-bold px-1.5 py-2 align-middle">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.machineName}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.location}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.issue}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.action}</td>
                          <td className="border border-black px-2 py-2 text-[9px] align-middle">
                            <div className="flex flex-col gap-1 leading-normal">
                              <span className="flex items-center gap-1.5">
                                <span className="font-bold text-[11px] leading-none">{item.status === 'OK' ? '☑' : '☐'}</span> ওকে (OK)
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="font-bold text-[11px] leading-none">{item.status === 'PARTIAL' ? '☑' : '☐'}</span> আংশিক ওকে
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="font-bold text-[11px] leading-none">{item.status === 'REQUIRED' ? '☑' : '☐'}</span> মেইনটেনেন্স প্রয়োজন
                              </span>
                            </div>
                          </td>
                          <td className="border border-black text-right px-2 py-2 font-semibold align-middle">
                            {item.cost !== '' && item.cost !== undefined ? item.cost : '0'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="border border-black text-center py-3 text-slate-500 italic text-[10.5px] bg-slate-50/50 align-middle">
                          কোনো মেইনটেনেন্স কার্যক্রম যোগ করা হয়নি
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. Section 2: Marketing Table (Dynamic Rows) */}
              <div className="mb-3.5">
                <div className="bg-[#166534] text-white font-bold text-[11px] px-3 py-1.5 border border-black border-b-0">
                  ২. মার্কেটিং ও প্রপোজাল কার্যক্রমের বিবরণ (Marketing Activities)
                </div>
                <table className="w-full border-collapse border border-black text-left text-[10px]">
                  <thead>
                    <tr className="bg-white text-center font-bold">
                      <th className="border border-black px-1.5 py-1.5 align-middle" style={{ width: '4%' }}>ক্র:</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '19%' }}>মেশিন / ক্লায়েন্টের নাম</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '23%' }}>
                        মার্কেটিং কার্যক্রম (প্রদর্শনী/<br/>প্রেজেন্টেশন/আলোচনা)
                      </th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '20%' }}>
                        যোগাযোগকৃত ব্যক্তি ও<br/>মোবাইল
                      </th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '16%' }}>ফলাফল / পরবর্তী পদক্ষেপ</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '11%' }}>স্ট্যাটাস / মন্তব্য</th>
                      <th className="border border-black px-2 py-1.5 align-middle text-right" style={{ width: '7%' }}>খরচ (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketingList.length > 0 ? (
                      marketingList.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="border border-black text-center font-bold px-1.5 py-2 align-middle">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.clientName}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.activity}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.contactPerson}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.result}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.status}</td>
                          <td className="border border-black text-right px-2 py-2 font-semibold align-middle">
                            {item.cost !== '' && item.cost !== undefined ? item.cost : '0'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="border border-black text-center py-3 text-slate-500 italic text-[10.5px] bg-slate-50/50 align-middle">
                          কোনো মার্কেটিং কার্যক্রম যোগ করা হয়নি
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 6. Section 3: Daily Travel & Expenses Table (Dynamic Rows) */}
              <div className="mb-3.5">
                <div className="bg-[#ea580c] text-white font-bold text-[11px] px-3 py-1.5 border border-black border-b-0">
                  ৩. দৈনিক খরচ ও হিসাবের বিবরণ (Daily Expense Summary)
                </div>
                <table className="w-full border-collapse border border-black text-left text-[10px]">
                  <thead>
                    <tr className="bg-white text-center font-bold">
                      <th className="border border-black px-1.5 py-1.5 align-middle" style={{ width: '4%' }}>ক্র:</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '18%' }}>কোথা থেকে (From)</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '18%' }}>কোথায় (To)</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '18%' }}>যাতায়াতের মাধ্যম / বিবরণ</th>
                      <th className="border border-black px-2 py-1.5 align-middle" style={{ width: '22%' }}>উদ্দেশ্য / কারণ</th>
                      <th className="border border-black px-2 py-1.5 align-middle text-right" style={{ width: '10%' }}>যাতায়াত খরচ (৳)</th>
                      <th className="border border-black px-2 py-1.5 align-middle text-right" style={{ width: '10%' }}>অন্যান্য খরচ (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelList.length > 0 ? (
                      travelList.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="border border-black text-center font-bold px-1.5 py-2 align-middle">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">
                            {item.fromLoc === 'কাস্টম / অন্যান্য'
                              ? item.fromCustom || 'অন্যান্য'
                              : item.fromLoc}
                          </td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">
                            {item.toLoc === 'কাস্টম / অন্যান্য'
                              ? item.toCustom || 'অন্যান্য'
                              : item.toLoc}
                          </td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.transport}</td>
                          <td className="border border-black px-2 py-2 font-medium align-middle">{item.purpose}</td>
                          <td className="border border-black text-right px-2 py-2 font-semibold align-middle">
                            {item.travelCost !== '' && item.travelCost !== undefined ? item.travelCost : '0'}
                          </td>
                          <td className="border border-black text-right px-2 py-2 font-semibold align-middle">
                            {item.otherCost !== '' && item.otherCost !== undefined ? item.otherCost : '0'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="border border-black text-center py-3 text-slate-500 italic text-[10.5px] bg-slate-50/50 align-middle">
                          কোনো যাতায়াত তথ্য যোগ করা হয়নি
                        </td>
                      </tr>
                    )}

                    {/* Summary Row inside Section 3 */}
                    <tr className="bg-white font-bold text-[10.5px]">
                      <td colSpan={3} className="border border-black px-3 py-2 align-middle">
                        <span>খাবার খরচ (টাকা):</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {foodCost ? `${foodCost} ৳` : '0 ৳'}
                        </span>
                      </td>
                      <td colSpan={2} className="border border-black px-3 py-2 align-middle">
                        <span>পার্সেল / অন্যান্য:</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {parseNum(parcelCost) + parseNum(otherCost) > 0
                            ? `${parseNum(parcelCost) + parseNum(otherCost)} ৳`
                            : parcelCost
                            ? `${parcelCost} ৳`
                            : '0 ৳'}
                        </span>
                      </td>
                      <td colSpan={2} className="border border-black px-3 py-2 text-right align-middle">
                        <span>সর্বমোট খরচ: ৳</span>{' '}
                        <span className="font-black text-[11.5px] text-slate-900">
                          {grandTotal}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 7. Section 4: Remarks Box */}
              <div className="mb-4">
                <div className="font-bold text-[11px] mb-1">
                  বিশেষ মন্তব্য / পরবর্তী জরুরী সুপারিশ (Remarks & Recommendations):
                </div>
                <div className="border border-black p-2.5 min-h-[48px] bg-white text-[10px] whitespace-pre-wrap leading-relaxed">
                  {remarks || 'কোন মন্তব্য নেই।'}
                </div>
              </div>

              {/* 8. Signature Area */}
              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10.5px] mt-auto">
                <div>
                  <div className="border-t border-black pt-1.5 font-bold">ফিল্ড অফিসার (স্বাক্ষর)</div>
                  <div className="text-[9.5px] text-slate-700 mt-0.5">অপারেশন টিম</div>
                </div>
                <div>
                  <div className="border-t border-black pt-1.5 font-bold">যাচাইকারী (স্বাক্ষর)</div>
                  <div className="text-[9.5px] text-slate-700 mt-0.5">সুপারভাইজার / টিম লিড</div>
                </div>
                <div>
                  <div className="border-t border-black pt-1.5 font-bold">অনুমোদনকারী (স্বাক্ষর)</div>
                  <div className="text-[9.5px] text-slate-700 mt-0.5">ব্যবস্থাপনা / এডমিন</div>
                </div>
              </div>

              {/* 9. Page Number */}
              <div className="text-right text-[9.5px] text-slate-600 mt-4">
                পৃষ্ঠা ১ এর ১
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}