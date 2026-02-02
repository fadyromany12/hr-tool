import React, { useState, useEffect } from 'react';
import { 
  User, CreditCard, Users, FileText, Send, 
  ChevronRight, ChevronLeft, CheckCircle, 
  LayoutDashboard, Download, Wifi, Search, X
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp 
} from 'firebase/firestore';

// --- FIREBASE CONFIGURATION (ACTION REQUIRED) ---
// 1. Go to Firebase Console > Project Settings.
// 2. Copy your "const firebaseConfig = {...}" object.
// 3. Paste the values inside the quotes below.

const firebaseConfig = {
  apiKey: "AIzaSyBbYB--paAwvMU9--AfwwemY4xWZuuSmUw",
  authDomain: "hr-tool-konecta.firebaseapp.com",
  databaseURL: "https://hr-tool-konecta-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hr-tool-konecta",
  storageBucket: "hr-tool-konecta.firebasestorage.app",
  messagingSenderId: "641230626669",
  appId: "1:641230626669:web:7e9e78067c66b6fd4d0464",
  measurementId: "G-NBSDC6NRV6"
};
// Initialize Firebase
// If you haven't pasted keys yet, this might log a warning, but won't crash the white screen immediately
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const DEPARTMENTS = [
  "Operations", "HR", "Finance", "IT", "Marketing", "Sales", 
  "Customer Service", "Legal", "Service Desk German", "Technical Support"
];

const ASSET_TYPES = [
  "None", "Voice Line", "MiFi", "Data Line", "Laptop Only"
];

const STEPS = [
  { id: 1, title: 'Personal Info', icon: <User className="w-5 h-5" /> },
  { id: 2, title: 'Job & Assets', icon: <Wifi className="w-5 h-5" /> },
  { id: 3, title: 'Banking & Legal', icon: <CreditCard className="w-5 h-5" /> },
  { id: 4, title: 'Family & Emergency', icon: <Users className="w-5 h-5" /> },
  { id: 5, title: 'Documents', icon: <FileText className="w-5 h-5" /> },
];

const INITIAL_DATA = {
  fullNameEnglish: '',
  fullNameArabic: '',
  preferredName: '',
  personalEmail: '',
  workEmail: '',
  phone: '',
  gender: 'Male',
  birthDate: '',
  addressArabic: '',
  nationalId: '',
  passportNumber: '',
  linkedInProfile: '',
  title: '',
  department: '',
  joiningDate: '',
  directManagerName: '',
  directManagerEmail: '',
  assetRequestType: 'None',
  bankName: '',
  swiftCode: '',
  accountNumber: '',
  iban: '',
  socialInsuranceNumber: '',
  maritalStatus: 'Single',
  marriageDate: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  dependents: [],
  photoUrl: '',
  nationalIdScanUrl: '',
  marriageCertUrl: '',
  offerLetterUrl: '',
};

export default function EmployeeOnboarding() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Admin Mode
  const [isAdmin, setIsAdmin] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [adminPass, setAdminPass] = useState('');

  // --- Auth & Data Fetching ---
  useEffect(() => {
    // Simple anonymous login for local use
    signInAnonymously(auth).catch((error) => {
      console.error("Auth Error: Check if Anonymous Auth is enabled in Firebase Console", error);
    });
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;

    // LOCAL UPDATE: Using a simple collection name 'onboarding_submissions'
    const q = query(collection(db, 'onboarding_submissions'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setEmployees(data);
    }, (error) => {
      console.error("Error fetching employees. Check Firestore Rules.", error);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDependentChange = (index, field, value) => {
    const newDependents = [...formData.dependents];
    newDependents[index][field] = value;
    setFormData(prev => ({ ...prev, dependents: newDependents }));
  };

  const addDependent = () => {
    setFormData(prev => ({
      ...prev,
      dependents: [...prev.dependents, { 
        name: '', relation: '', gender: 'Male', dob: '', nid: '', nidScan: '' 
      }]
    }));
  };

  const removeDependent = (index) => {
    const newDependents = formData.dependents.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, dependents: newDependents }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Connecting to database... please wait a moment.");
      return;
    }
    setIsSubmitting(true);

    try {
      // LOCAL UPDATE: Using simple collection name
      await addDoc(collection(db, 'onboarding_submissions'), {
        ...formData,
        submittedAt: serverTimestamp(),
        userId: user.uid
      });
      setIsSuccess(true);
      setFormData(INITIAL_DATA);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit. Check console for details (F12).");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (employees.length === 0) return;

    const headers = [
      "Full Name (English)", "Email", "Full Name (Arabic)", "Preferred Name", 
      "Personal Email", "Phone", "Address (Arabic)", "National ID", "Gender", 
      "Birthdate", "Title", "Department", "Joining Date", "Direct Manager", 
      "Manager Email", "Insurance #", "Bank Name", "Swift", "Account #", 
      "IBAN", "Marital Status", "LinkedIn", "Asset Request", "Offer Letter Link", "Photo Link"
    ];

    const rows = employees.map(emp => [
      emp.fullNameEnglish, emp.workEmail, emp.fullNameArabic, emp.preferredName,
      emp.personalEmail, emp.phone, emp.addressArabic, emp.nationalId, emp.gender,
      emp.birthDate, emp.title, emp.department, emp.joiningDate, emp.directManagerName,
      emp.directManagerEmail, emp.socialInsuranceNumber, emp.bankName, emp.swiftCode,
      emp.accountNumber, emp.iban, emp.maritalStatus, emp.linkedInProfile, emp.assetRequestType,
      emp.offerLetterUrl, emp.photoUrl
    ].map(field => `"${field || ''}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'master_sheet_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StepIndicator = () => (
    <div className="flex justify-between items-center mb-8 px-2">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex flex-col items-center flex-1 relative">
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
              currentStep === step.id 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : currentStep > step.id 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
            }`}
          >
            {currentStep > step.id ? <CheckCircle className="w-6 h-6" /> : step.icon}
          </div>
          <div className="text-xs font-medium mt-2 text-gray-600 hidden sm:block">{step.title}</div>
          {idx !== STEPS.length - 1 && (
            <div className={`absolute top-5 left-1/2 w-full h-0.5 -z-0 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Submission Received!</h2>
          <p className="text-gray-600 mb-8">
            Thank you, {formData.fullNameEnglish || 'Employee'}. Your data has been recorded in the HR Master System.
          </p>
          <button 
            onClick={() => setIsSuccess(false)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Submit Another Employee
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-blue-600" />
              HR Master Database
            </h1>
            <div className="flex gap-3">
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button 
                onClick={() => setIsAdmin(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Exit Admin
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Asset Req</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{emp.fullNameEnglish}</td>
                      <td className="px-4 py-3">{emp.department}</td>
                      <td className="px-4 py-3">{emp.title}</td>
                      <td className="px-4 py-3">{emp.personalEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          emp.assetRequestType === 'None' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {emp.assetRequestType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {emp.submittedAt ? new Date(emp.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                        No submissions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">New Employee Onboarding</h1>
          <p className="text-slate-500 mt-2">Please complete all sections to finalize your profile and assets.</p>
        </div>

        <StepIndicator />

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          
          {/* STEP 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (English)</label>
                  <input required name="fullNameEnglish" value={formData.fullNameEnglish} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="As per Passport/ID" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (Arabic)</label>
                  <input required name="fullNameArabic" value={formData.fullNameArabic} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="الاسم بالكامل" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Name</label>
                  <input name="preferredName" value={formData.preferredName} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
                  <input required type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile Link (For Access Card)</label>
                 <input type="url" name="linkedInProfile" value={formData.linkedInProfile} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://linkedin.com/in/..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Address (Arabic)</label>
                <textarea required rows="2" name="addressArabic" value={formData.addressArabic} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right" placeholder="العنوان بالتفصيل" />
              </div>
            </div>
          )}

          {/* STEP 2: Job & Assets */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Employment & Assets</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input required name="title" value={formData.title} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select required name="department" value={formData.department} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direct Manager Name</label>
                  <input required name="directManagerName" value={formData.directManagerName} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direct Manager Email</label>
                  <input required type="email" name="directManagerEmail" value={formData.directManagerEmail} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Official Joining Date</label>
                  <input required type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Email (If assigned)</label>
                  <input type="email" name="workEmail" value={formData.workEmail} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="name@company.com" />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <label className="block text-base font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Wifi className="w-4 h-4" /> IT Asset Request
                </label>
                <p className="text-sm text-blue-600 mb-3">Do you require a specific data/voice line? This will generate a request for the IT team.</p>
                <select name="assetRequestType" value={formData.assetRequestType} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: Banking & Legal */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Banking & Identification</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">National ID Number</label>
                  <input required name="nationalId" value={formData.nationalId} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" maxLength={14} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                  <input name="passportNumber" value={formData.passportNumber} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Social Insurance Number</label>
                  <input required type="number" name="socialInsuranceNumber" value={formData.socialInsuranceNumber} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-3">Bank Details (For Salary Transfer)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input required name="bankName" value={formData.bankName} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Swift Code</label>
                      <input required name="swiftCode" value={formData.swiftCode} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input required name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                    <input required name="iban" value={formData.iban} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Family */}
          {currentStep === 4 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Family & Medical Insurance</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </div>
                {formData.maritalStatus === 'Married' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Date</label>
                    <input type="date" name="marriageDate" value={formData.marriageDate} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                )}
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <h3 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input required placeholder="Name" name="emergencyName" value={formData.emergencyName} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-300" />
                  <input required placeholder="Phone" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-300" />
                  <input required placeholder="Relation (e.g., Father)" name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-800">Family Members (Medical Insurance)</h3>
                  <button type="button" onClick={addDependent} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 font-medium">
                    + Add Member
                  </button>
                </div>
                
                {formData.dependents.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No family members added to insurance plan.</p>
                )}

                <div className="space-y-4">
                  {formData.dependents.map((member, index) => (
                    <div key={index} className="border p-4 rounded-lg relative bg-gray-50">
                      <button type="button" onClick={() => removeDependent(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input placeholder="Full Name" value={member.name} onChange={(e) => handleDependentChange(index, 'name', e.target.value)} className="p-2 border rounded" />
                        <select value={member.relation} onChange={(e) => handleDependentChange(index, 'relation', e.target.value)} className="p-2 border rounded bg-white">
                          <option value="">Relation...</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Child">Child</option>
                          <option value="Parent">Parent</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <input type="date" value={member.dob} onChange={(e) => handleDependentChange(index, 'dob', e.target.value)} className="p-2 border rounded" />
                         <input placeholder="National ID" value={member.nid} onChange={(e) => handleDependentChange(index, 'nid', e.target.value)} className="p-2 border rounded" />
                         <select value={member.gender} onChange={(e) => handleDependentChange(index, 'gender', e.target.value)} className="p-2 border rounded bg-white">
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Documents */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Documents</h2>
              <p className="text-sm text-gray-500 bg-yellow-50 p-3 rounded border border-yellow-100">
                Please upload your files to Google Drive (or similar) and paste the <strong>Shareable Links</strong> below. Ensure access is set to "Anyone with the link" or shared with HR.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Picture Link</label>
                  <input type="url" name="photoUrl" value={formData.photoUrl} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://drive.google.com/..." />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">National ID Scans (Front & Back PDF) Link</label>
                  <input type="url" name="nationalIdScanUrl" value={formData.nationalIdScanUrl} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://drive.google.com/..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Letter (Signed PDF) Link</label>
                  <input type="url" name="offerLetterUrl" value={formData.offerLetterUrl} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://drive.google.com/..." />
                </div>

                {formData.maritalStatus === 'Married' && (
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Certificate Link</label>
                    <input type="url" name="marriageCertUrl" value={formData.marriageCertUrl} onChange={handleChange} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://drive.google.com/..." />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-10 flex justify-between pt-4 border-t">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div /> // Spacer
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-md transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Profile'} <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <div className="mt-12 text-center">
           {!isAdmin ? (
             <button onClick={() => setAdminPass(prompt("Enter Admin Password:") === 'hr2024' ? setIsAdmin(true) : alert('Wrong Password'))} className="text-xs text-gray-300 hover:text-gray-400">Admin Login</button>
           ) : null}
        </div>
      </div>
    </div>
  );
}