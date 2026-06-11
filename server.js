const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
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
const db = new Database(path.join(dbDir, 'medme.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, email TEXT UNIQUE, password TEXT, name TEXT);
  CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, dob TEXT, gender TEXT, blood_group TEXT, height TEXT, weight TEXT, bmi TEXT, address TEXT, phone TEXT, emergency_contact TEXT, allergies TEXT, vaccinations TEXT, insurance TEXT, qr_code TEXT);
  CREATE TABLE IF NOT EXISTS doctors (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, specialization TEXT, qualification TEXT, experience TEXT, hospital_affiliation TEXT, photo TEXT);
  CREATE TABLE IF NOT EXISTS medical_records (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, doctor_id INTEGER, date TEXT, type TEXT, diagnosis TEXT, notes TEXT);
  CREATE TABLE IF NOT EXISTS prescriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, doctor_id INTEGER, date TEXT, medication TEXT, dosage TEXT, frequency TEXT, duration TEXT, instructions TEXT, follow_up_date TEXT);
  CREATE TABLE IF NOT EXISTS lab_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, doctor_id INTEGER, date TEXT, type TEXT, result TEXT, file_url TEXT);
  CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, doctor_id INTEGER, date TEXT, time TEXT, status TEXT);
  CREATE TABLE IF NOT EXISTS family_members (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, name TEXT, relation TEXT, condition TEXT);
  CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, time TEXT);
  CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, message TEXT, date TEXT);
`);

const SECRET = 'medme_secret_key_123_university_prototype';

function logActivity(action) {
  const time = new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'short', timeStyle: 'short' });
  db.prepare('INSERT INTO activity_logs (action, time) VALUES (?, ?)').run(action, time);
}

function notifyUser(userId, message) {
  const date = new Date().toLocaleString('en-US', { hour12: true, dateStyle: 'short', timeStyle: 'short' });
  db.prepare('INSERT INTO notifications (user_id, message, date) VALUES (?, ?, ?)').run(userId, message, date);
}

async function seedDemoData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    console.log("Seeding COMPLETE HEALTHCARE ECOSYSTEM demo data...");
    const hash = bcrypt.hashSync('password', 10);
    const hashAdmin = bcrypt.hashSync('admin123', 10);
    
    db.prepare('INSERT INTO users (role, email, password, name) VALUES (?, ?, ?, ?)').run('admin', 'admin@medme.com', hashAdmin, 'System Admin');

    // DOCTORS
    const docs = [
      {email: 'ahmed@medme.com', name: 'Dr. Ahmed Mir', spec: 'General Physician', qual: 'MBBS, MD', exp: '15 Years', hosp: 'MedMe Central Hospital'},
      {email: 'sana@medme.com', name: 'Dr. Sana Bhat', spec: 'Cardiologist', qual: 'MBBS, DM Cardiology', exp: '10 Years', hosp: 'MedMe Heart Institute'},
      {email: 'faisal@medme.com', name: 'Dr. Faisal Lone', spec: 'Diabetologist', qual: 'MBBS, MD Endocrinology', exp: '12 Years', hosp: 'MedMe Central Hospital'}
    ];
    const docIds = [];
    for(let d of docs) {
      const info = db.prepare('INSERT INTO users (role, email, password, name) VALUES (?, ?, ?, ?)').run('doctor', d.email, hash, d.name);
      db.prepare('INSERT INTO doctors (user_id, specialization, qualification, experience, hospital_affiliation, photo) VALUES (?, ?, ?, ?, ?, ?)').run(info.lastInsertRowid, d.spec, d.qual, d.exp, d.hosp, 'https://ui-avatars.com/api/?name='+encodeURIComponent(d.name)+'&background=2563eb&color=fff');
      docIds.push(info.lastInsertRowid);
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
      const info = db.prepare('INSERT INTO users (role, email, password, name) VALUES (?, ?, ?, ?)').run('patient', p.email, hash, p.name);
      const uId = info.lastInsertRowid;
      const qrCode = await QRCode.toDataURL(JSON.stringify({ patient_id: uId }));
      db.prepare('INSERT INTO patients (user_id, dob, gender, blood_group, height, weight, bmi, address, phone, emergency_contact, allergies, vaccinations, insurance, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(uId, p.dob, p.gender, p.blood, p.ht, p.wt, p.bmi, p.add, p.phone, p.emg, p.all, p.vac, p.ins, qrCode);
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
    for(let f of familyData) db.prepare('INSERT INTO family_members (patient_id, name, relation, condition) VALUES (?, ?, ?, ?)').run(patIds[0], f.name, f.relation, f.condition);

    // RECORDS
    const dates = ['2026-05-01', '2026-05-15', '2026-06-02'];
    db.prepare('INSERT INTO medical_records (patient_id, doctor_id, date, type, diagnosis, notes) VALUES (?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[0], dates[0], 'General Checkup', 'Viral Fever', 'Patient reported mild fever and fatigue. Prescribed rest and paracetamol.');
    db.prepare('INSERT INTO medical_records (patient_id, doctor_id, date, type, diagnosis, notes) VALUES (?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[2], dates[1], 'Specialist Visit', 'Pre-Diabetes Screening', 'HbA1c levels slightly elevated. Prescribed lifestyle changes and Metformin.');
    db.prepare('INSERT INTO medical_records (patient_id, doctor_id, date, type, diagnosis, notes) VALUES (?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[0], dates[2], 'Surgery', 'Appendectomy', 'Minor surgical intervention. Recovery is smooth.');

    // PRESCRIPTIONS
    db.prepare('INSERT INTO prescriptions (patient_id, doctor_id, date, medication, dosage, frequency, duration, instructions, follow_up_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[2], dates[1], 'Metformin', '500mg', 'Twice a day', '3 Months', '1 tablet daily after dinner', '2026-09-15');
    db.prepare('INSERT INTO prescriptions (patient_id, doctor_id, date, medication, dosage, frequency, duration, instructions, follow_up_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[0], dates[0], 'Paracetamol', '650mg', 'As needed', '5 Days', 'Take after meals for fever', 'None');

    // LAB REPORTS
    db.prepare('INSERT INTO lab_reports (patient_id, doctor_id, date, type, result, file_url) VALUES (?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[0], dates[0], 'CBC Blood Test', 'WBC slightly elevated (11,000/mcL). Indicates mild infection.', 'report_cbc.pdf');
    db.prepare('INSERT INTO lab_reports (patient_id, doctor_id, date, type, result, file_url) VALUES (?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[2], dates[1], 'HbA1c Sugar Test', 'Result: 5.9% (Pre-diabetic range)', 'report_hba1c.pdf');
    db.prepare('INSERT INTO lab_reports (patient_id, doctor_id, date, type, result, file_url) VALUES (?, ?, ?, ?, ?, ?)').run(patIds[0], docIds[1], dates[2], 'ECG Report', 'Normal Sinus Rhythm', 'report_ecg.pdf');

    // APPOINTMENTS
    db.prepare('INSERT INTO appointments (patient_id, doctor_id, date, time, status) VALUES (?, ?, ?, ?, ?)').run(patIds[0], docIds[0], '2026-05-01', '10:00 AM', 'Completed');
    db.prepare('INSERT INTO appointments (patient_id, doctor_id, date, time, status) VALUES (?, ?, ?, ?, ?)').run(patIds[0], docIds[2], '2026-06-15', '02:30 PM', 'Upcoming');

    // NOTIFICATIONS
    notifyUser(patIds[0], 'Your HbA1c Lab Report has been uploaded by Dr. Faisal Lone.');
    notifyUser(patIds[0], 'Upcoming Appointment Reminder: Tomorrow at 02:30 PM with Dr. Faisal Lone.');

    // ACTIVITY LOGS
    logActivity('Patient Registered: Sara Khan');
    logActivity('Doctor Login: Dr. Sana Bhat');
    logActivity('QR Scan Completed for Ali Khan');
    logActivity('Lab Report Uploaded: HbA1c');
    logActivity('Prescription Issued: Metformin');
    
    console.log("Demo data successfully loaded.");
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
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (role, email, password, name) VALUES (?, ?, ?, ?)').run(role, email, hash, name);
    const userId = info.lastInsertRowid;
    if (role === 'patient') {
      const qrData = JSON.stringify({ patient_id: userId });
      const qrCode = await QRCode.toDataURL(qrData);
      db.prepare('INSERT INTO patients (user_id, dob, blood_group, qr_code) VALUES (?, ?, ?, ?)').run(userId, dob, blood_group, qrCode);
      logActivity('Patient Registered: ' + name);
    } else if (role === 'doctor') {
      db.prepare('INSERT INTO doctors (user_id, specialization) VALUES (?, ?)').run(userId, specialization);
      logActivity('Doctor Registered: ' + name);
    }
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET);
  logActivity(user.role==='admin' ? 'Admin Login' : (user.role==='doctor' ? 'Doctor Login: ' : 'Patient Login: ') + user.name);
  res.json({ token, role: user.role });
});

app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, role, email, name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({error: 'User not found'});
  if (user.role === 'patient') {
    const p = db.prepare('SELECT qr_code FROM patients WHERE user_id = ?').get(user.id);
    user.qr_code = p.qr_code;
  }
  res.json(user);
});

// Demo Endpoints without Auth
app.get('/api/view/:type/:id?', (req, res) => {
  const { type, id } = req.params;
  try {
    if (type === 'patient') {
      const u = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id);
      const p = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(id);
      const records = db.prepare('SELECT m.*, d.name as doctor_name FROM medical_records m JOIN users d ON m.doctor_id = d.id WHERE m.patient_id = ? ORDER BY date DESC').all(id);
      const prescriptions = db.prepare('SELECT p.*, d.name as doctor_name FROM prescriptions p JOIN users d ON p.doctor_id = d.id WHERE p.patient_id = ? ORDER BY date DESC').all(id);
      const labs = db.prepare('SELECT l.*, d.name as doctor_name FROM lab_reports l JOIN users d ON l.doctor_id = d.id WHERE l.patient_id = ? ORDER BY date DESC').all(id);
      const appointments = db.prepare('SELECT a.*, d.name as doctor_name FROM appointments a JOIN users d ON a.doctor_id = d.id WHERE a.patient_id = ? ORDER BY date DESC').all(id);
      const family = db.prepare('SELECT * FROM family_members WHERE patient_id = ?').all(id);
      const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC').all(id);
      
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
      const u = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id);
      const d = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(id);
      const patientsTreated = db.prepare('SELECT DISTINCT p.id, p.name FROM medical_records m JOIN users p ON m.patient_id = p.id WHERE m.doctor_id = ?').all(id);
      const prescriptions = db.prepare('SELECT p.*, pat.name as patient_name FROM prescriptions p JOIN users pat ON p.patient_id = pat.id WHERE p.doctor_id = ?').all(id);
      const appointments = db.prepare('SELECT a.*, p.name as patient_name FROM appointments a JOIN users p ON a.patient_id = p.id WHERE a.doctor_id = ? ORDER BY date DESC').all(id);
      res.json({ doctor: {...u, ...d}, patientsTreated, prescriptions, appointments });
    }
    else if (type === 'record') {
      const r = db.prepare('SELECT m.*, pat.name as patient_name, doc.name as doctor_name FROM medical_records m JOIN users pat ON m.patient_id = pat.id JOIN users doc ON m.doctor_id = doc.id WHERE m.id = ?').get(id);
      res.json({ record: r });
    }
    else if (type === 'prescription') {
      const p = db.prepare('SELECT p.*, pat.name as patient_name, doc.name as doctor_name FROM prescriptions p JOIN users pat ON p.patient_id = pat.id JOIN users doc ON p.doctor_id = doc.id WHERE p.id = ?').get(id);
      res.json({ prescription: p });
    }
    else if (type === 'lab') {
      const l = db.prepare('SELECT l.*, pat.name as patient_name, doc.name as doctor_name FROM lab_reports l JOIN users pat ON l.patient_id = pat.id JOIN users doc ON l.doctor_id = doc.id WHERE l.id = ?').get(id);
      res.json({ lab: l });
    }
    else if (type === 'activity') {
      const a = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(id);
      res.json({ activity: a });
    }
    else if (type === 'all_patients') res.json({ list: db.prepare('SELECT u.id, u.name, u.email, p.dob, p.blood_group FROM patients p JOIN users u ON p.user_id = u.id').all() });
    else if (type === 'all_doctors') res.json({ list: db.prepare('SELECT u.id, u.name, u.email, d.specialization FROM doctors d JOIN users u ON d.user_id = u.id').all() });
    else if (type === 'all_records') res.json({ list: db.prepare('SELECT m.*, pat.name as patient_name, doc.name as doctor_name FROM medical_records m JOIN users pat ON m.patient_id = pat.id JOIN users doc ON m.doctor_id = doc.id').all() });
    else if (type === 'all_prescriptions') res.json({ list: db.prepare('SELECT p.*, pat.name as patient_name, doc.name as doctor_name FROM prescriptions p JOIN users pat ON p.patient_id = pat.id JOIN users doc ON p.doctor_id = doc.id').all() });
    else if (type === 'all_scans') res.json({ list: db.prepare("SELECT * FROM activity_logs WHERE action LIKE '%QR Scan%'").all() });
    else res.status(404).json({error: 'Type not found'});
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/demo-data', (req, res) => {
  const patients = db.prepare('SELECT u.id, u.name, u.email, p.dob, p.blood_group FROM patients p JOIN users u ON p.user_id = u.id').all();
  const doctors = db.prepare('SELECT u.id, u.name, u.email, d.specialization FROM doctors d JOIN users u ON d.user_id = u.id').all();
  const prescriptions = db.prepare('SELECT p.*, pat.name as patient_name, doc.name as doctor_name FROM prescriptions p JOIN users pat ON p.patient_id = pat.id JOIN users doc ON p.doctor_id = doc.id').all();
  const family_trees = db.prepare('SELECT f.*, u.name as patient_name FROM family_members f JOIN users u ON f.patient_id = u.id').all();
  res.json({ patients, doctors, prescriptions, family_trees });
});

app.get('/api/analytics', (req, res) => {
  const fam = db.prepare('SELECT condition FROM family_members WHERE condition != "Healthy" AND condition NOT LIKE "%Observation%"').all();
  const recs = db.prepare('SELECT diagnosis FROM medical_records').all();
  const diseases = {};
  fam.forEach(f => { const c = f.condition.trim(); diseases[c] = (diseases[c] || 0) + 1; });
  recs.forEach(r => { const c = r.diagnosis.trim(); diseases[c] = (diseases[c] || 0) + 1; });
  
  const docAct = db.prepare('SELECT d.name, COUNT(m.id) as records_count FROM users d LEFT JOIN medical_records m ON d.id = m.doctor_id WHERE d.role="doctor" GROUP BY d.id').all();
  
  const pats = db.prepare('SELECT dob, blood_group FROM patients').all();
  const ages = {'0-18':0, '19-35':0, '36-50':0, '51+':0};
  const bloods = {};
  const currentYear = new Date().getFullYear();
  pats.forEach(p => {
      if(p.dob) {
        const age = currentYear - parseInt(p.dob.split('-')[0]);
        if(age <= 18) ages['0-18']++; else if(age <= 35) ages['19-35']++; else if(age <= 50) ages['36-50']++; else ages['51+']++;
      }
      if(p.blood_group) bloods[p.blood_group] = (bloods[p.blood_group] || 0) + 1;
  });

  const medsRaw = db.prepare('SELECT medication FROM prescriptions').all();
  const meds = {};
  medsRaw.forEach(m => { meds[m.medication] = (meds[m.medication] || 0) + 1; });

  res.json({ diseases, docAct, ages, bloods, meds });
});

app.get('/api/admin/stats', auth, (req, res) => {
  if(req.user.role !== 'admin') return res.status(403).json({error: 'Forbidden'});
  const patients = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
  const doctors = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
  const records = db.prepare('SELECT COUNT(*) as c FROM medical_records').get().c;
  const prescriptions = db.prepare('SELECT COUNT(*) as c FROM prescriptions').get().c;
  const labs = db.prepare('SELECT COUNT(*) as c FROM lab_reports').get().c;
  const qr_scans = db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE action LIKE '%QR Scan%'").get().c;
  const users = db.prepare('SELECT id, role, email, name FROM users').all();
  const activities = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 15').all();
  res.json({ stats: { patients, doctors, records, prescriptions, labs, qr_scans }, users, activities });
});

const PORT = 4000;
app.listen(PORT, () => { console.log('MedMe Presentation Prototype running on http://localhost:' + PORT); });
