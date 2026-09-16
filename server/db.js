const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SEED_PATH = path.join(__dirname, 'data', 'seed.json');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mealforward',
});

async function bumpSequence(table) {
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
  );
}

// server/data/seed.json은 PostgreSQL이 비어 있을 때 초기 데이터로 쓰이는 "시드 소스"다.
// (실제 서비스 데이터는 항상 PostgreSQL이 진실 공급원이며, 파일은 사람이 보기 편하도록
// 매 변경마다 mirrorToJsonFile()로 다시 써지는 거울일 뿐이다.)
async function seedFromJsonFile() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));

  for (const c of seed.companies) {
    await pool.query('INSERT INTO companies (id, name, biz_no, fiscal_year_end_month) VALUES ($1, $2, $3, $4)', [
      c.id, c.name, c.bizNo, c.fiscalYearEndMonth,
    ]);
  }
  for (const u of seed.users) {
    await pool.query(
      'INSERT INTO users (id, company_id, employee_no, name, department, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [u.id, u.companyId, u.employeeNo, u.name, u.department, u.email, u.passwordHash]
    );
  }
  for (const a of seed.admins) {
    await pool.query('INSERT INTO admins (id, company_id, name, email, password_hash) VALUES ($1, $2, $3, $4, $5)', [
      a.id, a.companyId, a.name, a.email, a.passwordHash,
    ]);
  }
  for (const b of seed.mealBalances) {
    await pool.query(
      'INSERT INTO meal_balances (id, user_id, year_month, remaining_amount, is_rolled_over) VALUES ($1, $2, $3, $4, $5)',
      [b.id, b.userId, b.yearMonth, b.remainingAmount, b.isRolledOver]
    );
  }
  for (const l of seed.pointLedgers) {
    await pool.query(
      'INSERT INTO point_ledgers (id, user_id, point_type, amount, status, expired_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [l.id, l.userId, l.pointType, l.amount, l.status, l.expiredAt]
    );
  }
  for (const p of seed.products) {
    await pool.query('INSERT INTO products (id, name, category, price, is_cash_like, sort_order) VALUES ($1, $2, $3, $4, $5, $6)', [
      p.id, p.name, p.category, p.price, p.isCashLike, p.sortOrder ?? 100,
    ]);
  }
  const policy = seed.guardrailPolicy;
  await pool.query(
    'INSERT INTO guardrail_policy (id, block_gift_cards, block_cash_equivalents, risk_threshold) VALUES (1, $1, $2, $3)',
    [policy.blockGiftCards, policy.blockCashEquivalents, policy.riskThreshold]
  );

  for (const table of ['companies', 'users', 'admins', 'meal_balances', 'point_ledgers', 'products']) {
    await bumpSequence(table);
  }
}

async function init() {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await pool.query(schemaSql);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM companies');
  if (rows[0].count === 0) {
    await seedFromJsonFile();
    console.log('[DB] PostgreSQL seeded from server/data/seed.json.');
  } else {
    console.log('[DB] Using existing PostgreSQL data.');
  }
}

function nextIdFrom(rows) {
  return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}

// PostgreSQL이 진실 공급원이지만, seed.json도 사람이 읽기 편하도록 항상 최신 상태로 맞춰둔다.
async function mirrorToJsonFile() {
  const [companies, users, admins, mealBalances, pointLedgers, paymentTransactions, guardrailLogs, products, policyRows] =
    await Promise.all([
      pool.query('SELECT * FROM companies ORDER BY id'),
      pool.query('SELECT * FROM users ORDER BY id'),
      pool.query('SELECT * FROM admins ORDER BY id'),
      pool.query('SELECT * FROM meal_balances ORDER BY id'),
      pool.query('SELECT * FROM point_ledgers ORDER BY id'),
      pool.query('SELECT * FROM payment_transactions ORDER BY id'),
      pool.query('SELECT * FROM guardrail_logs ORDER BY id'),
      pool.query('SELECT * FROM products ORDER BY sort_order, id'),
      pool.query('SELECT * FROM guardrail_policy WHERE id = 1'),
    ]);

  const iso = (v) => (v instanceof Date ? v.toISOString() : v);

  const data = {
    companies: companies.rows.map((c) => ({ id: c.id, name: c.name, bizNo: c.biz_no, fiscalYearEndMonth: c.fiscal_year_end_month })),
    users: users.rows.map((u) => ({
      id: u.id, companyId: u.company_id, employeeNo: u.employee_no, name: u.name,
      department: u.department, email: u.email, passwordHash: u.password_hash,
    })),
    admins: admins.rows.map((a) => ({ id: a.id, companyId: a.company_id, name: a.name, email: a.email, passwordHash: a.password_hash })),
    mealBalances: mealBalances.rows.map((b) => ({
      id: b.id, userId: b.user_id, yearMonth: b.year_month, remainingAmount: b.remaining_amount,
      isRolledOver: b.is_rolled_over, createdAt: iso(b.created_at),
    })),
    pointLedgers: pointLedgers.rows.map((l) => ({
      id: l.id, userId: l.user_id, pointType: l.point_type, amount: l.amount,
      status: l.status, expiredAt: iso(l.expired_at), createdAt: iso(l.created_at),
    })),
    paymentTransactions: paymentTransactions.rows.map((t) => ({
      id: t.id, userId: t.user_id, itemName: t.item_name, mccCode: t.mcc_code,
      generalAmount: t.general_amount, flexiAmount: t.flexi_amount, totalAmount: t.total_amount,
      approvalStatus: t.approval_status, redemptionStatus: t.redemption_status, voucherCode: t.voucher_code,
      createdAt: iso(t.created_at),
    })),
    guardrailLogs: guardrailLogs.rows.map((g) => ({
      id: g.id, paymentId: g.payment_id, riskScore: g.risk_score, isBlocked: g.is_blocked,
      blockReason: g.block_reason, source: g.source, createdAt: iso(g.created_at),
    })),
    guardrailPolicy: policyRows.rows[0]
      ? {
          blockGiftCards: policyRows.rows[0].block_gift_cards,
          blockCashEquivalents: policyRows.rows[0].block_cash_equivalents,
          riskThreshold: policyRows.rows[0].risk_threshold,
        }
      : { blockGiftCards: true, blockCashEquivalents: true, riskThreshold: 0.7 },
    products: products.rows.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, isCashLike: p.is_cash_like, sortOrder: p.sort_order })),
    nextIds: {
      paymentTransactions: nextIdFrom(paymentTransactions.rows),
      guardrailLogs: nextIdFrom(guardrailLogs.rows),
      users: nextIdFrom(users.rows),
      admins: nextIdFrom(admins.rows),
      mealBalances: nextIdFrom(mealBalances.rows),
      pointLedgers: nextIdFrom(pointLedgers.rows),
    },
  };

  fs.writeFileSync(SEED_PATH, JSON.stringify(data, null, 2));
}

module.exports = { pool, init, mirrorToJsonFile };
