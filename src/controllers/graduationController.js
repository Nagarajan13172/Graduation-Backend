const db = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'Uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    console.error('Invalid file type:', file.mimetype, 'for file:', file.originalname);
    return cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for most files
  }
});

// File upload fields for registration
const uploadFields = upload.fields([
  { name: 'applicant_photo', maxCount: 1 },
  { name: 'aadhar_copy', maxCount: 1 },
  { name: 'residence_certificate', maxCount: 1 },
  { name: 'degree_certificate', maxCount: 1 },
  { name: 'other_university_certificate', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);

// Single file upload for the upload route
const singleUpload = upload.single('file');

// Enums
const GENDER_ENUM = ['Male', 'Female', 'Other'];
const LUNCH_ENUM = ['VEG', 'NON-VEG'];
const COMMUNITY_ENUM = ['OC', 'BC', 'SC', 'ST', 'MBC'];
const DISTRICT_ENUM = ['Dharmapuri', 'Krishnagiri', 'Namakkal', 'Salem'];
const COMPANION_ENUM = [
  '1 Veg',
  '1 Non veg',
  '2 Veg',
  '2 Non Veg',
  '1 Veg and 1 Non veg'
];

const isEmail = (s) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => !!s && /^\d{10}$/.test(s);
const isAadhar = (s) => !!s && /^\d{12}$/.test(s);
const isDate = (s) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (['yes', 'true', '1'].includes(t)) return true;
    if (['no', 'false', '0'].includes(t)) return false;
  }
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  return null;
};

exports.checkEmail = (req, res) => {
  const { email } = req.query;
  if (!email || !isEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  db.get(`SELECT email FROM students WHERE email = ?`, [email], (err, row) => {
    if (err) {
      console.error('DB fetch error for email check:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to check email' });
    }
    return res.status(200).json({ exists: !!row });
  });
};

exports.register = (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err.message, err.stack);
      return res.status(400).json({ error: err.message });
    }

    const {
      full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
      place_of_birth, community, mother_tongue, aadhar_number, degree_name, university_name,
      degree_pattern, convocation_year, occupation, address, declaration, lunch_required, companion_option
    } = req.body;

    const is_registered_graduate = toBool(req.body.is_registered_graduate);

    console.log('Register request:', { body: req.body, files: Object.keys(req.files || {}) });

    // Validate all fields
    if (!full_name) return res.status(400).json({ error: 'Full name is required' });
    if (!date_of_birth || !isDate(date_of_birth)) return res.status(400).json({ error: 'Valid date of birth (YYYY-MM-DD) is required' });
    if (!gender || !GENDER_ENUM.includes(gender)) return res.status(400).json({ error: `Gender must be one of ${GENDER_ENUM.join(', ')}` });
    if (!guardian_name) return res.status(400).json({ error: 'Guardian name is required' });
    if (!nationality) return res.status(400).json({ error: 'Nationality is required' });
    if (!religion) return res.status(400).json({ error: 'Religion is required' });
    if (email && !isEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!mobile_number || !isPhone(mobile_number)) return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
    if (!place_of_birth || !DISTRICT_ENUM.includes(place_of_birth)) return res.status(400).json({ error: `Place of birth must be one of ${DISTRICT_ENUM.join(', ')}` });
    if (!community || !COMMUNITY_ENUM.includes(community)) return res.status(400).json({ error: `Community must be one of ${COMMUNITY_ENUM.join(', ')}` });
    if (!mother_tongue) return res.status(400).json({ error: 'Mother tongue is required' });
    if (!req.files?.applicant_photo) return res.status(400).json({ error: 'Applicant photo is required' });
    if (req.files.applicant_photo[0].size > 2 * 1024 * 1024) return res.status(400).json({ error: 'Applicant photo must be less than 2MB' });
    if (!aadhar_number || !isAadhar(aadhar_number)) return res.status(400).json({ error: 'Aadhar number must be exactly 12 digits' });
    if (!req.files?.aadhar_copy) return res.status(400).json({ error: 'Aadhar copy is required' });
    if (req.files.aadhar_copy[0].size > 2 * 1024 * 1024) return res.status(400).json({ error: 'Aadhar copy must be less than 2MB' });
    if (!req.files?.residence_certificate) return res.status(400).json({ error: 'Residence certificate is required' });
    if (req.files.residence_certificate[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Residence certificate must be less than 5MB' });
    if (!degree_name) return res.status(400).json({ error: 'Degree name is required' });
    if (!university_name) return res.status(400).json({ error: 'University name is required' });
    if (!degree_pattern) return res.status(400).json({ error: 'Degree pattern is required' });
    if (!convocation_year) return res.status(400).json({ error: 'Convocation year is required' });
    if (!req.files?.degree_certificate) return res.status(400).json({ error: 'Degree certificate is required' });
    if (req.files.degree_certificate[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Degree certificate must be less than 5MB' });
    if (is_registered_graduate === null) return res.status(400).json({ error: 'is_registered_graduate must be Yes/No or boolean' });
    if (is_registered_graduate && !req.files?.other_university_certificate) return res.status(400).json({ error: 'Other university certificate is required when registered with another university' });
    if (req.files?.other_university_certificate && req.files.other_university_certificate[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Other university certificate must be less than 5MB' });
    if (!occupation) return res.status(400).json({ error: 'Occupation is required' });
    if (!address) return res.status(400).json({ error: 'Address is required' });
    if (!req.files?.signature) return res.status(400).json({ error: 'Signature is required' });
    if (req.files.signature[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Signature must be less than 5MB' });
    if (!toBool(declaration)) return res.status(400).json({ error: 'Declaration must be true' });
    if (!lunch_required || !LUNCH_ENUM.includes(lunch_required)) return res.status(400).json({ error: `Lunch required must be one of ${LUNCH_ENUM.join(', ')}` });
    if (!companion_option || !COMPANION_ENUM.includes(companion_option)) return res.status(400).json({ error: `Companion option must be one of: ${COMPANION_ENUM.join(' | ')}` });

    // Check email uniqueness if provided
    if (email) {
      const emailExists = await new Promise((resolve, reject) => {
        db.get(`SELECT email FROM students WHERE email = ?`, [email], (err, row) => {
          if (err) {
            console.error('DB fetch error for email uniqueness:', err.message, err.stack);
            reject(err);
          }
          resolve(!!row);
        });
      });
      if (emailExists) return res.status(409).json({ error: 'Email is already registered' });
    }

    const params = [
      full_name.toUpperCase(),
      date_of_birth,
      gender,
      guardian_name,
      nationality,
      religion,
      email || null,
      mobile_number,
      place_of_birth,
      community,
      mother_tongue,
      req.files.applicant_photo[0].path,
      aadhar_number,
      req.files.aadhar_copy[0].path,
      req.files.residence_certificate[0].path,
      degree_name,
      university_name,
      degree_pattern,
      convocation_year,
      req.files.degree_certificate[0].path,
      is_registered_graduate ? 1 : 0,
      req.files?.other_university_certificate ? req.files.other_university_certificate[0].path : null,
      occupation,
      address,
      req.files.signature[0].path,
      toBool(declaration) ? 1 : 0,
      lunch_required,
      companion_option
    ];

    db.run(
      `
      INSERT INTO students (
        full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
        place_of_birth, community, mother_tongue, applicant_photo_path, aadhar_number, aadhar_copy_path,
        residence_certificate_path, degree_name, university_name, degree_pattern, convocation_year,
        degree_certificate_path, is_registered_graduate, other_university_certificate_path, occupation,
        address, signature_path, declaration, lunch_required, companion_option, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      params,
      function (err) {
        if (err) {
          if (String(err.message).includes('UNIQUE')) {
            if (err.message.includes('email')) {
              return res.status(409).json({ error: 'Email is already registered' });
            }
          }
          console.error('DB insert error:', err.message, err.stack);
          return res.status(500).json({ error: 'Failed to register' });
        }
        console.log('Registration successful:', { id: this.lastID });
        return res.status(200).json({ message: 'Registered successfully', id: this.lastID });
      }
    );
  });
};

exports.list = (req, res) => {
  db.all(`SELECT * FROM students ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error('DB fetch error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
    res.json(rows);
  });
};

exports.uploadFile = (req, res) => {
  singleUpload(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message, err.stack);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File uploaded:', { file_path: req.file.path, filename: req.file.filename });
    res.status(200).json({
      message: 'File uploaded successfully',
      file_path: req.file.path,
      filename: req.file.filename
    });
  });
};

exports.getFile = (req, res) => {
  const { studentId, fileType } = req.params;
  const validFileTypes = [
    'applicant_photo',
    'aadhar_copy',
    'residence_certificate',
    'degree_certificate',
    'other_university_certificate',
    'signature'
  ];

  if (!validFileTypes.includes(fileType)) {
    console.error(`Invalid file type requested: ${fileType}`);
    return res.status(400).json({ error: 'Invalid file type' });
  }

  if (!studentId || isNaN(studentId)) {
    console.error(`Invalid studentId: ${studentId}`);
    return res.status(400).json({ error: 'Valid student ID is required' });
  }

  db.get(`SELECT ${fileType}_path FROM students WHERE id = ?`, [studentId], (err, row) => {
    if (err) {
      console.error('DB fetch error for file:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch file' });
    }
    if (!row || !row[`${fileType}_path`]) {
      console.error(`File not found for studentId: ${studentId}, fileType: ${fileType}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = row[`${fileType}_path`];
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist on server: ${filePath}`);
      return res.status(404).json({ error: 'File not found on server' });
    }

    const mimeType = path.extname(filePath).toLowerCase() === '.pdf' ? 'application/pdf' :
                     (path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileType}${path.extname(filePath)}`);
    fs.createReadStream(filePath).pipe(res);
  });
};

exports.getAllFiles = (req, res) => {
  const { studentId } = req.params;

  if (!studentId || isNaN(studentId)) {
    console.error(`Invalid studentId: ${studentId}`);
    return res.status(400).json({ error: 'Valid student ID is required' });
  }

  db.get(
    `SELECT full_name, applicant_photo_path, aadhar_copy_path, residence_certificate_path, degree_certificate_path, 
            other_university_certificate_path, signature_path 
     FROM students WHERE id = ?`,
    [studentId],
    (err, row) => {
      if (err) {
        console.error('DB fetch error for files:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch files' });
      }
      if (!row) {
        console.error(`Student not found for studentId: ${studentId}`);
        return res.status(404).json({ error: 'Student not found' });
      }

      const filePaths = [
        { path: row.applicant_photo_path, name: 'applicant_photo.jpg' },
        { path: row.aadhar_copy_path, name: 'aadhar_copy.pdf' },
        { path: row.residence_certificate_path, name: 'residence_certificate.pdf' },
        { path: row.degree_certificate_path, name: 'degree_certificate.pdf' },
        { path: row.other_university_certificate_path, name: 'other_university_certificate.pdf' },
        { path: row.signature_path, name: 'signature.jpg' }
      ].filter(file => file.path && fs.existsSync(file.path));

      if (filePaths.length === 0) {
        console.error(`No valid files found for studentId: ${studentId}`);
        return res.status(404).json({ error: 'No files found for this student' });
      }

      const studentName = row.full_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${studentName}_documents.zip`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        console.error('Archiver error:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to create zip file' });
      });

      archive.on('warning', (err) => {
        console.warn('Archiver warning:', err.message);
      });

      archive.pipe(res);

      filePaths.forEach(file => {
        console.log(`Adding file to ZIP: ${file.path} as ${file.name}`);
        archive.file(file.path, { name: file.name });
      });

      archive.finalize().catch(err => {
        console.error('Error finalizing ZIP archive:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to finalize zip file' });
      });
    }
  );
};

module.exports = exports;