const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const dbFile = path.join(dbDir, 'data.json');

let db = { users: [], patients: [], doctors: [], medical_records: [], prescriptions: [], lab_reports: [], appointments: [], family_members: [], activity_logs: [], notifications: [] };

function loadDb() {
  if (fs.existsSync(dbFile)) {
    try { db = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch (e) {}
  } else { saveDb(); }
}
function saveDb() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function nextId(table) { return db[table].length > 0 ? Math.max(...db[table].map(i => i.id)) + 1 : 1; }

loadDb();

const SECRET = 'medme_secret_key_123_university_prototype';

function logActivity(action) {
  const time = new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'short', timeStyle: 'short' });
  db.activity_logs.push({ id: nextId('activity_logs'), action, time });
  saveDb();
}

function notifyUser(user_id, message) {
  const date = new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'short', timeStyle: 'short' });
  db.notifications.push({ id: nextId('notifications'), user_id, message, date });
  saveDb();
}

async function seedDemoData() {
  if (db.users.length === 0) {
    console.log("Seeding JSON-BASED HEALTHCARE ECOSYSTEM demo data...");
    const hash = bcrypt.hashSync('password', 10);
    const hashAdmin = bcrypt.hashSync('admin123', 10);
    
    db.users.push({ id: nextId('users'), role: 'admin', email: 'admin@medme.com', password: hashAdmin, name: 'System Admin' });

    // DOCTORS
    const docs = [
      {email: 'ahmed@medme.com', name: 'Dr. Ahmed Mir', spec: 'General Physician', qual: 'MBBS, MD', exp: '15 Years', hosp: 'MedMe Central Hospital'},
      {email: 'sana@medme.com', name: 'Dr. Sana Bhat', spec: 'Cardiologist', qual: 'MBBS, DM Cardiology', exp: '10 Years', hosp: 'MedMe Heart Institute'},
      {email: 'faisal@medme.com', name: 'Dr. Faisal Lone', spec: 'Diabetologist', qual: 'MBBS, MD Endocrinology', exp: '12 Years', hosp: 'MedMe Central Hospital'}
    ];
    const docIds = [];
    for(let d of docs) {
      const uId = nextId('users');
      db.users.push({ id: uId, role: 'doctor', email: d.email, password: hash, name: d.name });
      db.doctors.push({ id: nextId('doctors'), user_id: uId, specialization: d.spec, qualification: d.qual, experience: d.exp, hospital_affiliation: d.hosp, photo: 'https://ui-avatars.com/api/?name='+encodeURIComponent(d.name)+'&background=2563eb&color=fff' });
      docIds.push(uId);
    }

    // PATIENTS
    const pats = [
      {email: 'ayaan@medme.com', name: 'Ayaan Khan', dob: '1995-05-15', gender:'Male', blood: 'O+', ht: '175cm', wt: '70kg', bmi: '22.8', add: '123 University Demo St', phone: '+1 234 567 8900', emg: 'Ali Khan (Father) - +1 987 654 3210', all: 'Penicillin, Peanuts', vac: 'COVID-19 (2 Doses), Hepatitis B', ins: 'MedLife Premium Plan A'},
      {email: 'sara@medme.com', name: 'Sara Khan', dob: '1998-08-20', gender:'Female', blood: 'A+', ht: '160cm', wt: '55kg', bmi: '21.4', add: '124 University Demo St', phone: '+1 234 567 8901', emg: 'Ayaan Khan', all: 'None', vac: 'COVID-19', ins: 'MedLife Standard'},
      {email: 'ali@medme.com', name: 'Ali Khan', dob: '1965-02-10', gender:'Male', blood: 'B+', ht: '170cm', wt: '80kg', bmi: '27.6', add: '123 University Demo St', phone: '+1 234 567 8902', emg: 'Ayaan Khan', all: 'Sulfa Drugs', vac: 'Flu, COVID-19', ins: 'MedLife Senior'},
      {email: 'fatima@medme.com', name: 'Fatima Khan', dob: '1970-11-05', gender:'Female', blood: 'O-', ht: '155cm', wt: '65kg', bmi: '27.0', add: '123 University Demo St', phone: '+1 234 567 8903', emg: 'Ali Khan', all: 'Dust', vac: 'COVID-19', ins: 'MedLife Senior'},
      {email: 'omar@medme.com', name: 'Omar Khan', dob: '2005-04-30', gender:'Male', blood: 'AB+', ht: '180cm', wt: '68kg', bmi: '20.9', add: '456 College Ave', phone: '+1 234 567 8904', emg: 'Sara Khan', all: 'None', vac: 'COVID-19, MMR', ins: 'Student Health'}
    ];
    const patIds = [];
    for(let p of pats) {
      const uId = nextId('users');
      db.users.push({ id: uId, role: 'patient', email: p.email, password: hash, name: p.name });
      const qrCode = await QRCode.toDataURL(JSON.stringify({ patient_id: uId }));
      db.patients.push({ id: nextId('patients'), user_id: uId, dob: p.dob, gender: p.gender, blood_group: p.blood, height: p.ht, weight: p.wt, bmi: p.bmi, address: p.add, phone: p.phone, emergency_contact: p.emg, allergies: p.all, vaccinations: p.vac, insurance: p.ins, qr_code: qrCode });
      patIds.push(uId);
    }

    // FAMILY
    const familyData = [
      {name: 'Hassan Khan', relation: 'Grandfather', condition: 'Diabetes'},
      {name: 'Zoya Khan', relation: 'Grandmother', condition: 'Hypertension'},
      {name: 'Ali Khan', relation: 'Father', condition: 'Diabetes'},
      {name: 'Fatima Khan', relation: 'Mother', condition: 'Healthy'},
      {name: 'Ayaan Khan', relation: 'Self', condition: 'Pre-Diabetes'}
    ];
    for(let f of familyData) db.family_members.push({ id: nextId('family_members'), patient_id: patIds[0], name: f.name, relation: f.relation, condition: f.condition });

    // RECORDS
    const dates = ['2026-05-01', '2026-05-15', '2026-06-02'];
    db.medical_records.push({ id: nextId('medical_records'), patient_id: patIds[0], doctor_id: docIds[0], date: dates[0], type: 'General Checkup', diagnosis: 'Viral Fever', notes: 'Patient reported mild fever. Prescribed rest.' });
    db.medical_records.push({ id: nextId('medical_records'), patient_id: patIds[0], doctor_id: docIds[2], date: dates[1], type: 'Specialist Visit', diagnosis: 'Pre-Diabetes Screening', notes: 'HbA1c levels slightly elevated. Prescribed lifestyle changes and Metformin.' });
    db.medical_records.push({ id: nextId('medical_records'), patient_id: patIds[0], doctor_id: docIds[0], date: dates[2], type: 'Surgery', diagnosis: 'Appendectomy', notes: 'Minor surgical intervention. Recovery is smooth.' });

    // PRESCRIPTIONS
    db.prescriptions.push({ id: nextId('prescriptions'), patient_id: patIds[0], doctor_id: docIds[2], date: dates[1], medication: 'Metformin', dosage: '500mg', frequency: 'Twice a day', duration: '3 Months', instructions: '1 tablet daily after dinner', follow_up_date: '2026-09-15' });
    db.prescriptions.push({ id: nextId('prescriptions'), patient_id: patIds[0], doctor_id: docIds[0], date: dates[0], medication: 'Paracetamol', dosage: '650mg', frequency: 'As needed', duration: '5 Days', instructions: 'Take after meals for fever', follow_up_date: 'None' });

    // LAB REPORTS
    db.lab_reports.push({ id: nextId('lab_reports'), patient_id: patIds[0], doctor_id: docIds[0], date: dates[0], type: 'CBC Blood Test', result: 'WBC slightly elevated (11,000/mcL). Indicates mild infection.', file_url: 'report_cbc.pdf' });
    db.lab_reports.push({ id: nextId('lab_reports'), patient_id: patIds[0], doctor_id: docIds[2], date: dates[1], type: 'HbA1c Sugar Test', result: 'Result: 5.9% (Pre-diabetic range)', file_url: 'report_hba1c.pdf' });
    db.lab_reports.push({ id: nextId('lab_reports'), patient_id: patIds[0], doctor_id: docIds[1], date: dates[2], type: 'ECG Report', result: 'Normal Sinus Rhythm', file_url: 'report_ecg.pdf' });

    // APPOINTMENTS
    db.appointments.push({ id: nextId('appointments'), patient_id: patIds[0], doctor_id: docIds[0], date: '2026-05-01', time: '10:00 AM', status: 'Completed' });
    db.appointments.push({ id: nextId('appointments'), patient_id: patIds[0], doctor_id: docIds[2], date: '2026-06-15', time: '02:30 PM', status: 'Upcoming' });

    saveDb();
    
    // NOTIFICATIONS & ACTIVITY (these auto-save)
    notifyUser(patIds[0], 'Your HbA1c Lab Report has been uploaded by Dr. Faisal Lone.');
    notifyUser(patIds[0], 'Upcoming Appointment Reminder: Tomorrow at 02:30 PM with Dr. Faisal Lone.');

    logActivity('Patient Registered: Sara Khan');
    logActivity('Doctor Login: Dr. Sana Bhat');
    logActivity('QR Scan Completed for Ali Khan');
    logActivity('Lab Report Uploaded: HbA1c');
    logActivity('Prescription Issued: Metformin');
    
    console.log("JSON Demo data successfully loaded.");
  }
}
seedDemoData();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({error: 'Unauthorized'});
  try { req.user = jwt.verify(token, SECRET); next(); } catch (e) { res.status(401).json({error: 'Invalid token'}); }
};

app.post('/api/register', async (req, res) => {
  const { role, email, password, name, dob, blood_group, specialization } = req.body;
  try {
    if (db.users.find(u => u.email === email)) throw new Error('Email already exists');
    const hash = bcrypt.hashSync(password, 10);
    const userId = nextId('users');
    db.users.push({ id: userId, role, email, password: hash, name });

    if (role === 'patient') {
      const qrData = JSON.stringify({ patient_id: userId });
      const qrCode = await QRCode.toDataURL(qrData);
      db.patients.push({ id: nextId('patients'), user_id: userId, dob, gender: '', blood_group, height: '', weight: '', bmi: '', address: '', phone: '', emergency_contact: '', allergies: '', vaccinations: '', insurance: '', qr_code: qrCode });
      logActivity('Patient Registered: ' + name);
    } else if (role === 'doctor') {
      db.doctors.push({ id: nextId('doctors'), user_id: userId, specialization, qualification: '', experience: '', hospital_affiliation: '', photo: '' });
      logActivity('Doctor Registered: ' + name);
    }
    saveDb();
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET);
  logActivity(user.role==='admin' ? 'Admin Login' : (user.role==='doctor' ? 'Doctor Login: ' : 'Patient Login: ') + user.name);
  res.json({ token, role: user.role });
});

app.get('/api/me', auth, (req, res) => {
  const user = { ...db.users.find(u => u.id === req.user.id) };
  if (!user.id) return res.status(404).json({error: 'User not found'});
  delete user.password;
  if (user.role === 'patient') {
    const p = db.patients.find(p => p.user_id === user.id);
    if(p) user.qr_code = p.qr_code;
  }
  res.json(user);
});

// Join Helpers
const getDocName = id => { const d = db.users.find(u=>u.id==id); return d?d.name:'Unknown'; };
const getPatName = id => { const p = db.users.find(u=>u.id==id); return p?p.name:'Unknown'; };

app.get('/api/view/:type/:id?', (req, res) => {
  const { type, id } = req.params;
  const numId = parseInt(id);
  try {
    if (type === 'patient') {
      const u = db.users.find(u => u.id === numId);
      const p = db.patients.find(p => p.user_id === numId);
      const records = db.medical_records.filter(m => m.patient_id === numId).map(m => ({...m, doctor_name: getDocName(m.doctor_id)})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      const prescriptions = db.prescriptions.filter(p => p.patient_id === numId).map(p => ({...p, doctor_name: getDocName(p.doctor_id)})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      const labs = db.lab_reports.filter(l => l.patient_id === numId).map(l => ({...l, doctor_name: getDocName(l.doctor_id)})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      const appointments = db.appointments.filter(a => a.patient_id === numId).map(a => ({...a, doctor_name: getDocName(a.doctor_id)})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      const family = db.family_members.filter(f => f.patient_id === numId);
      const notifications = db.notifications.filter(n => n.user_id === numId).sort((a,b)=>b.id-a.id);
      
      const conditionMap = {};
      family.forEach(f => {
        if (f.condition && f.condition.trim().toLowerCase() !== 'none' && f.condition.trim().toLowerCase() !== 'healthy' && !f.condition.trim().toLowerCase().includes('observation')) {
          const parts = f.condition.split(',').map(s => s.trim());
          parts.forEach(c => { if(c) { if(!conditionMap[c]) conditionMap[c] = []; conditionMap[c].push(f.relation); } });
        }
      });
      const risks = Object.keys(conditionMap).filter(c => conditionMap[c].length >= 2).map(c => ({ condition: c, members: conditionMap[c], count: conditionMap[c].length }));
      
      res.json({ patient: {...u, ...p}, records, prescriptions, labs, appointments, family, notifications, risks });
    }
    else if (type === 'doctor') {
      const u = db.users.find(u => u.id === numId);
      const d = db.doctors.find(d => d.user_id === numId);
      const patientsTreatedIds = [...new Set(db.medical_records.filter(m => m.doctor_id === numId).map(m => m.patient_id))];
      const patientsTreated = db.users.filter(u => patientsTreatedIds.includes(u.id));
      const prescriptions = db.prescriptions.filter(p => p.doctor_id === numId).map(p => ({...p, patient_name: getPatName(p.patient_id)}));
      const appointments = db.appointments.filter(a => a.doctor_id === numId).map(a => ({...a, patient_name: getPatName(a.patient_id)})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      res.json({ doctor: {...u, ...d}, patientsTreated, prescriptions, appointments });
    }
    else if (type === 'record') {
      const r = db.medical_records.find(m => m.id === numId);
      res.json({ record: r ? {...r, patient_name: getPatName(r.patient_id), doctor_name: getDocName(r.doctor_id)} : null });
    }
    else if (type === 'prescription') {
      const p = db.prescriptions.find(p => p.id === numId);
      res.json({ prescription: p ? {...p, patient_name: getPatName(p.patient_id), doctor_name: getDocName(p.doctor_id)} : null });
    }
    else if (type === 'lab') {
      const l = db.lab_reports.find(l => l.id === numId);
      res.json({ lab: l ? {...l, patient_name: getPatName(l.patient_id), doctor_name: getDocName(l.doctor_id)} : null });
    }
    else if (type === 'activity') {
      res.json({ activity: db.activity_logs.find(a => a.id === numId) });
    }
    else if (type === 'all_patients') {
      const list = db.patients.map(p => { const u = db.users.find(u=>u.id===p.user_id); return { id: u.id, name: u.name, email: u.email, dob: p.dob, blood_group: p.blood_group }; });
      res.json({ list });
    }
    else if (type === 'all_doctors') {
      const list = db.doctors.map(d => { const u = db.users.find(u=>u.id===d.user_id); return { id: u.id, name: u.name, email: u.email, specialization: d.specialization }; });
      res.json({ list });
    }
    else if (type === 'all_records') {
      const list = db.medical_records.map(m => ({ ...m, patient_name: getPatName(m.patient_id), doctor_name: getDocName(m.doctor_id) }));
      res.json({ list });
    }
    else if (type === 'all_prescriptions') {
      const list = db.prescriptions.map(p => ({ ...p, patient_name: getPatName(p.patient_id), doctor_name: getDocName(p.doctor_id) }));
      res.json({ list });
    }
    else if (type === 'all_scans') {
      const list = db.activity_logs.filter(a => a.action.includes('QR Scan'));
      res.json({ list });
    }
    else res.status(404).json({error: 'Type not found'});
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/demo-data', (req, res) => {
  const patients = db.patients.map(p => { const u = db.users.find(u=>u.id===p.user_id); return { id: u.id, name: u.name, email: u.email, dob: p.dob, blood_group: p.blood_group }; });
  const doctors = db.doctors.map(d => { const u = db.users.find(u=>u.id===d.user_id); return { id: u.id, name: u.name, email: u.email, specialization: d.specialization }; });
  const prescriptions = db.prescriptions.map(p => ({ ...p, patient_name: getPatName(p.patient_id), doctor_name: getDocName(p.doctor_id) }));
  const family_trees = db.family_members.map(f => ({ ...f, patient_name: getPatName(f.patient_id) }));
  res.json({ patients, doctors, prescriptions, family_trees });
});

app.get('/api/analytics', (req, res) => {
  const diseases = {};
  db.family_members.forEach(f => {
    if(f.condition !== 'Healthy' && !f.condition.includes('Observation')) { const c = f.condition.trim(); diseases[c] = (diseases[c] || 0) + 1; }
  });
  db.medical_records.forEach(r => { const c = r.diagnosis.trim(); diseases[c] = (diseases[c] || 0) + 1; });
  
  const docAct = db.users.filter(u=>u.role==='doctor').map(d => {
    const records_count = db.medical_records.filter(m => m.doctor_id === d.id).length;
    return { name: d.name, records_count };
  });
  
  const ages = {'0-18':0, '19-35':0, '36-50':0, '51+':0};
  const bloods = {};
  const currentYear = new Date().getFullYear();
  db.patients.forEach(p => {
      if(p.dob) {
        const age = currentYear - parseInt(p.dob.split('-')[0]);
        if(age <= 18) ages['0-18']++; else if(age <= 35) ages['19-35']++; else if(age <= 50) ages['36-50']++; else ages['51+']++;
      }
      if(p.blood_group) bloods[p.blood_group] = (bloods[p.blood_group] || 0) + 1;
  });

  const meds = {};
  db.prescriptions.forEach(m => { meds[m.medication] = (meds[m.medication] || 0) + 1; });

  res.json({ diseases, docAct, ages, bloods, meds });
});

app.get('/api/admin/stats', auth, (req, res) => {
  if(req.user.role !== 'admin') return res.status(403).json({error: 'Forbidden'});
  const stats = {
    patients: db.patients.length,
    doctors: db.doctors.length,
    records: db.medical_records.length,
    prescriptions: db.prescriptions.length,
    labs: db.lab_reports.length,
    qr_scans: db.activity_logs.filter(a => a.action.includes('QR Scan')).length
  };
  const users = db.users.map(u => ({ id: u.id, role: u.role, email: u.email, name: u.name }));
  const activities = [...db.activity_logs].sort((a,b)=>b.id-a.id).slice(0, 15);
  res.json({ stats, users, activities });
});

app.post('/api/family', auth, (req, res) => {
  const { name, relation, condition } = req.body;
  db.family_members.push({ id: nextId('family_members'), patient_id: req.user.id, name, relation, condition });
  logActivity('Family Member Added: ' + relation);
  saveDb();
  res.json({ success: true });
});

app.post('/api/records', auth, (req, res) => {
  const { patient_id, diagnosis, notes } = req.body;
  const date = new Date().toISOString().split('T')[0];
  db.medical_records.push({ id: nextId('medical_records'), patient_id, doctor_id: req.user.id, date, type: 'Clinical Visit', diagnosis, notes });
  logActivity('Medical Record Added for Patient ID: ' + patient_id);
  saveDb();
  res.json({ success: true });
});

app.post('/api/prescriptions', auth, (req, res) => {
  const { patient_id, medication, instructions } = req.body;
  const date = new Date().toISOString().split('T')[0];
  db.prescriptions.push({ id: nextId('prescriptions'), patient_id, doctor_id: req.user.id, date, medication, dosage: '', frequency: '', duration: '', instructions, follow_up_date: '' });
  logActivity('Prescription Added: ' + medication);
  saveDb();
  res.json({ success: true });
});

app.post('/api/log', auth, (req, res) => {
  logActivity(req.body.action);
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => { console.log('MedMe Presentation Prototype running on port ' + PORT); });
