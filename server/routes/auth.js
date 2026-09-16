const express = require('express');
const { pool } = require('../db');
const { hashPassword, verifyPassword } = require('../auth');

const router = express.Router();

const CURRENT_YEAR_MONTH = '202609';

async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0];
}

async function findAdminByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM admins WHERE lower(email) = lower($1)', [email]);
  return rows[0];
}

router.post('/signup/user', async (req, res) => {
  const { name, email, password, department, employeeNo } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ errorCode: 'MISSING_FIELDS', message: '이름, 이메일, 비밀번호는 필수입니다.' });
  }
  if ((await findUserByEmail(email)) || (await findAdminByEmail(email))) {
    return res.status(409).json({ errorCode: 'EMAIL_ALREADY_EXISTS', message: '이미 가입된 이메일입니다.' });
  }

  const { rows } = await pool.query(
    'INSERT INTO users (company_id, employee_no, name, department, email, password_hash) VALUES (1, $1, $2, $3, $4, $5) RETURNING *',
    [employeeNo || null, name, department || '미배정', email, hashPassword(password)]
  );
  const user = rows[0];

  if (!user.employee_no) {
    const employeeNoValue = `E-${user.id}`;
    await pool.query('UPDATE users SET employee_no = $1 WHERE id = $2', [employeeNoValue, user.id]);
    user.employee_no = employeeNoValue;
  }

  await pool.query('INSERT INTO meal_balances (user_id, year_month, remaining_amount, is_rolled_over) VALUES ($1, $2, 0, FALSE)', [user.id, CURRENT_YEAR_MONTH]);
  await pool.query("INSERT INTO point_ledgers (user_id, point_type, amount, status, expired_at) VALUES ($1, 'GENERAL', 0, 'ACTIVE', NULL)", [user.id]);

  res.json({ role: 'user', id: user.id, name: user.name, department: user.department, employeeNo: user.employee_no });
});

router.post('/signup/admin', async (req, res) => {
  const { name, email, password, adminKey } = req.body;

  if (!name || !email || !password || !adminKey) {
    return res.status(400).json({ errorCode: 'MISSING_FIELDS', message: '이름, 이메일, 비밀번호, 관리자 인증 키는 필수입니다.' });
  }
  if (adminKey !== process.env.ADMIN_SIGNUP_KEY) {
    return res.status(403).json({ errorCode: 'INVALID_ADMIN_KEY', message: '관리자 인증 키가 올바르지 않습니다.' });
  }
  if (await findAdminByEmail(email)) {
    return res.status(409).json({ errorCode: 'EMAIL_ALREADY_EXISTS', message: '이미 가입된 이메일입니다.' });
  }

  const passwordHash = hashPassword(password);
  const { rows } = await pool.query(
    'INSERT INTO admins (company_id, name, email, password_hash) VALUES (1, $1, $2, $3) RETURNING *',
    [name, email, passwordHash]
  );
  const admin = rows[0];

  // 관리자도 임직원이므로, 같은 이메일/비밀번호로 포인트 상점을 쓸 수 있는 임직원 계정을 함께 만든다.
  // (반대 방향은 하지 않음 - 임직원 가입이 관리자 인증 키 없이 관리자 권한을 얻으면 안 되므로)
  const existingUser = await findUserByEmail(email);
  if (!existingUser) {
    const { rows: userRows } = await pool.query(
      'INSERT INTO users (company_id, employee_no, name, department, email, password_hash) VALUES (1, NULL, $1, $2, $3, $4) RETURNING *',
      [name, '경영지원팀', email, passwordHash]
    );
    const newUser = userRows[0];
    await pool.query('UPDATE users SET employee_no = $1 WHERE id = $2', [`E-${newUser.id}`, newUser.id]);
    await pool.query('INSERT INTO meal_balances (user_id, year_month, remaining_amount, is_rolled_over) VALUES ($1, $2, 0, FALSE)', [newUser.id, CURRENT_YEAR_MONTH]);
    await pool.query("INSERT INTO point_ledgers (user_id, point_type, amount, status, expired_at) VALUES ($1, 'GENERAL', 0, 'ACTIVE', NULL)", [newUser.id]);
  }

  res.json({ role: 'admin', id: admin.id, name: admin.name });
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ errorCode: 'MISSING_FIELDS', message: '이메일, 비밀번호, 역할은 필수입니다.' });
  }

  if (role === 'admin') {
    const admin = await findAdminByEmail(email);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    return res.json({ role: 'admin', id: admin.id, name: admin.name });
  }

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }
  res.json({ role: 'user', id: user.id, name: user.name, department: user.department, employeeNo: user.employee_no });
});

module.exports = router;
