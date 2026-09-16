const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// 관리자 로그인 세션(adminId)을 x-admin-id 헤더로 전달받아 검증한다.
// 데모 목적의 가벼운 가드이며, 실제 운영에서는 서명된 세션 토큰으로 대체되어야 한다.
router.use(async (req, res, next) => {
  const adminId = Number(req.header('x-admin-id'));
  if (!Number.isInteger(adminId)) {
    return res.status(401).json({ errorCode: 'ADMIN_AUTH_REQUIRED', message: '관리자 로그인이 필요합니다.' });
  }
  const { rows } = await pool.query('SELECT * FROM admins WHERE id = $1', [adminId]);
  if (!rows[0]) {
    return res.status(401).json({ errorCode: 'ADMIN_AUTH_REQUIRED', message: '관리자 로그인이 필요합니다.' });
  }
  req.admin = rows[0];
  next();
});

router.get('/settlements/summary', async (req, res) => {
  const { rows: totalRows } = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM point_ledgers WHERE point_type = 'FLEXI_MEAL'"
  );

  // 같은 사용자가 같은 상품을 반복 시도해서 여러 번 차단된 경우, 동일한 리스크를 중복 집계하지
  // 않도록 (user_id, item_name) 조합당 최초 차단 1건만 센다.
  const { rows: blockedLogs } = await pool.query(
    `SELECT DISTINCT ON (t.user_id, t.item_name) g.*, t.total_amount
     FROM guardrail_logs g
     JOIN payment_transactions t ON t.id = g.payment_id
     WHERE g.is_blocked = TRUE
     ORDER BY t.user_id, t.item_name, g.created_at ASC`
  );
  const savedTaxRiskCost = blockedLogs.reduce((sum, g) => sum + g.total_amount, 0);

  res.json({
    fiscalYear: '2026',
    totalRolledOverAmount: totalRows[0].total,
    blockedCountByAI: blockedLogs.length,
    savedTaxRiskCost,
  });
});

router.get('/settlements/list', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.name, u.department,
            COALESCE((SELECT SUM(amount) FROM point_ledgers
                      WHERE user_id = u.id AND point_type = 'FLEXI_MEAL' AND status = 'ACTIVE'), 0) AS rolled
     FROM users u
     ORDER BY u.id`
  );

  res.json(
    rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      department: r.department,
      rolledAmount: r.rolled,
      status: r.rolled > 0 ? 'ACTIVE' : 'NONE',
    }))
  );
});

router.get('/guardrail-policy', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM guardrail_policy WHERE id = 1');
  const policy = rows[0];
  res.json({
    blockGiftCards: policy.block_gift_cards,
    blockCashEquivalents: policy.block_cash_equivalents,
    riskThreshold: policy.risk_threshold,
  });
});

router.put('/guardrail-policy', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM guardrail_policy WHERE id = 1');
  const current = rows[0];
  const { blockGiftCards, blockCashEquivalents, riskThreshold } = req.body;

  const next = {
    blockGiftCards: blockGiftCards ?? current.block_gift_cards,
    blockCashEquivalents: blockCashEquivalents ?? current.block_cash_equivalents,
    riskThreshold: riskThreshold ?? current.risk_threshold,
  };

  await pool.query(
    'UPDATE guardrail_policy SET block_gift_cards = $1, block_cash_equivalents = $2, risk_threshold = $3 WHERE id = 1',
    [next.blockGiftCards, next.blockCashEquivalents, next.riskThreshold]
  );

  res.json(next);
});

router.post('/settlements/finalize', async (req, res) => {
  const { fiscalYear } = req.body;
  res.json({
    success: true,
    fiscalYear: fiscalYear || '2026',
    erpSyncStatus: 'SYNCED',
  });
});

// 복지 상품(포인트 상점) 등록/수정/삭제 - 관리자 전용 권한
router.get('/products', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY sort_order, id');
  res.json(
    rows.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, isCashLike: p.is_cash_like, sortOrder: p.sort_order }))
  );
});

router.post('/products', async (req, res) => {
  const { name, category, price, isCashLike, sortOrder } = req.body;
  if (!name || !category || !(price > 0)) {
    return res.status(400).json({ errorCode: 'MISSING_FIELDS', message: '상품명, 카테고리, 가격을 확인해주세요.' });
  }

  const { rows } = await pool.query(
    'INSERT INTO products (name, category, price, is_cash_like, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, category, price, Boolean(isCashLike), sortOrder ?? 100]
  );
  const p = rows[0];
  res.json({ id: p.id, name: p.name, category: p.category, price: p.price, isCashLike: p.is_cash_like, sortOrder: p.sort_order });
});

router.put('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existing } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!existing[0]) {
    return res.status(404).json({ errorCode: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다.' });
  }

  const current = existing[0];
  const { name, category, price, isCashLike, sortOrder } = req.body;
  const next = {
    name: name ?? current.name,
    category: category ?? current.category,
    price: price ?? current.price,
    isCashLike: isCashLike ?? current.is_cash_like,
    sortOrder: sortOrder ?? current.sort_order,
  };

  const { rows } = await pool.query(
    'UPDATE products SET name = $1, category = $2, price = $3, is_cash_like = $4, sort_order = $5 WHERE id = $6 RETURNING *',
    [next.name, next.category, next.price, Boolean(next.isCashLike), next.sortOrder, id]
  );
  const p = rows[0];
  res.json({ id: p.id, name: p.name, category: p.category, price: p.price, isCashLike: p.is_cash_like, sortOrder: p.sort_order });
});

router.delete('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  if (!rowCount) {
    return res.status(404).json({ errorCode: 'PRODUCT_NOT_FOUND', message: '상품을 찾을 수 없습니다.' });
  }
  res.json({ success: true });
});

module.exports = router;
