const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const CURRENT_YEAR_MONTH = '202609';
const EXPIRATION_DATE = '2026-09-30T23:59:59Z';

router.get('/meal-balance', async (req, res) => {
  const userId = Number(req.query.userId);
  const { rows } = await pool.query('SELECT * FROM meal_balances WHERE user_id = $1 AND year_month = $2', [userId, CURRENT_YEAR_MONTH]);
  const balance = rows[0];

  if (!balance) {
    return res.status(404).json({ errorCode: 'USER_NOT_FOUND', message: '식대 잔액 정보를 찾을 수 없습니다.' });
  }

  res.json({
    userId,
    yearMonth: balance.year_month,
    remainingAmount: balance.remaining_amount,
    isRolledOver: balance.is_rolled_over,
    expirationDate: EXPIRATION_DATE,
  });
});

router.get('/points', async (req, res) => {
  const userId = Number(req.query.userId);
  const { rows: ledgers } = await pool.query("SELECT * FROM point_ledgers WHERE user_id = $1 AND status = 'ACTIVE'", [userId]);

  const generalPoint = ledgers
    .filter((l) => l.point_type === 'GENERAL')
    .reduce((sum, l) => sum + l.amount, 0);
  const flexiLedgers = ledgers.filter((l) => l.point_type === 'FLEXI_MEAL');
  const flexiMealPoint = flexiLedgers.reduce((sum, l) => sum + l.amount, 0);
  const flexiMealExpiredAt = flexiLedgers[0]?.expired_at ?? null;

  res.json({ userId, generalPoint, flexiMealPoint, flexiMealExpiredAt });
});

router.post('/rollover/apply', async (req, res) => {
  const { userId, yearMonth } = req.body;
  const { rows } = await pool.query('SELECT * FROM meal_balances WHERE user_id = $1 AND year_month = $2', [userId, yearMonth]);
  const balance = rows[0];

  if (!balance) {
    return res.status(404).json({ errorCode: 'USER_NOT_FOUND', message: '식대 잔액 정보를 찾을 수 없습니다.' });
  }

  if (balance.is_rolled_over) {
    return res.status(409).json({
      errorCode: 'DUPLICATE_ROLLOVER_REQUEST',
      message: '이미 당월 이월 처리가 완료되었습니다.',
    });
  }

  const rolledAmount = balance.remaining_amount;
  const expiredAt = '2027-09-30T23:59:59Z';

  await pool.query('UPDATE meal_balances SET is_rolled_over = TRUE, remaining_amount = 0 WHERE id = $1', [balance.id]);

  const { rows: existing } = await pool.query(
    "SELECT * FROM point_ledgers WHERE user_id = $1 AND point_type = 'FLEXI_MEAL' AND status = 'ACTIVE'",
    [userId]
  );

  if (existing[0]) {
    await pool.query('UPDATE point_ledgers SET amount = amount + $1 WHERE id = $2', [rolledAmount, existing[0].id]);
  } else {
    await pool.query(
      "INSERT INTO point_ledgers (user_id, point_type, amount, status, expired_at) VALUES ($1, 'FLEXI_MEAL', $2, 'ACTIVE', $3)",
      [userId, rolledAmount, expiredAt]
    );
  }

  res.json({
    success: true,
    rolledAmount,
    targetPointType: 'FLEXI_MEAL',
    expiredAt,
  });
});

// 구매 내역: 사용하기(바우처 코드 확인) / 환불하기(결제에 쓰인 포인트 종류로만 환불)
// Guardrail AX에 차단된(BLOCKED) 시도는 실제 결제가 이루어지지 않았으므로 목록에서 제외한다.
router.get('/purchases', async (req, res) => {
  const userId = Number(req.query.userId);
  const { rows } = await pool.query(
    `SELECT * FROM payment_transactions WHERE user_id = $1 AND approval_status = 'APPROVED' ORDER BY created_at DESC`,
    [userId]
  );

  res.json(
    rows.map((t) => ({
      id: t.id,
      itemName: t.item_name,
      generalAmount: t.general_amount,
      flexiAmount: t.flexi_amount,
      totalAmount: t.total_amount,
      approvalStatus: t.approval_status,
      redemptionStatus: t.redemption_status,
      voucherCode: t.redemption_status === 'USED' ? t.voucher_code : null,
      createdAt: t.created_at,
    }))
  );
});

router.post('/purchases/:id/use', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query('SELECT * FROM payment_transactions WHERE id = $1', [id]);
  const purchase = rows[0];

  if (!purchase) {
    return res.status(404).json({ errorCode: 'PURCHASE_NOT_FOUND', message: '구매 내역을 찾을 수 없습니다.' });
  }
  if (purchase.approval_status !== 'APPROVED') {
    return res.status(400).json({ errorCode: 'NOT_REDEEMABLE', message: '승인된 구매만 사용할 수 있습니다.' });
  }
  if (purchase.redemption_status !== 'UNUSED') {
    return res.status(409).json({ errorCode: 'ALREADY_REDEEMED', message: '이미 사용했거나 환불된 구매입니다.' });
  }

  await pool.query("UPDATE payment_transactions SET redemption_status = 'USED' WHERE id = $1", [id]);
  res.json({ success: true, voucherCode: purchase.voucher_code });
});

router.post('/purchases/:id/refund', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query('SELECT * FROM payment_transactions WHERE id = $1', [id]);
  const purchase = rows[0];

  if (!purchase) {
    return res.status(404).json({ errorCode: 'PURCHASE_NOT_FOUND', message: '구매 내역을 찾을 수 없습니다.' });
  }
  if (purchase.approval_status !== 'APPROVED') {
    return res.status(400).json({ errorCode: 'NOT_REFUNDABLE', message: '승인된 구매만 환불할 수 있습니다.' });
  }
  if (purchase.redemption_status !== 'UNUSED') {
    return res.status(409).json({ errorCode: 'ALREADY_REDEEMED', message: '이미 사용했거나 환불된 구매는 환불할 수 없습니다.' });
  }

  // 환불은 결제 당시 사용한 포인트 종류로만 되돌린다 (식대 이월 포인트로 결제 -> 식대 이월 포인트로 환불).
  const userId = purchase.user_id;

  if (purchase.general_amount > 0) {
    const { rows: g } = await pool.query(
      "SELECT * FROM point_ledgers WHERE user_id = $1 AND point_type = 'GENERAL' AND status = 'ACTIVE'",
      [userId]
    );
    if (g[0]) {
      await pool.query('UPDATE point_ledgers SET amount = amount + $1 WHERE id = $2', [purchase.general_amount, g[0].id]);
    } else {
      await pool.query(
        "INSERT INTO point_ledgers (user_id, point_type, amount, status) VALUES ($1, 'GENERAL', $2, 'ACTIVE')",
        [userId, purchase.general_amount]
      );
    }
  }

  if (purchase.flexi_amount > 0) {
    const { rows: f } = await pool.query(
      "SELECT * FROM point_ledgers WHERE user_id = $1 AND point_type = 'FLEXI_MEAL' AND status = 'ACTIVE'",
      [userId]
    );
    if (f[0]) {
      await pool.query('UPDATE point_ledgers SET amount = amount + $1 WHERE id = $2', [purchase.flexi_amount, f[0].id]);
    } else {
      await pool.query(
        "INSERT INTO point_ledgers (user_id, point_type, amount, status) VALUES ($1, 'FLEXI_MEAL', $2, 'ACTIVE')",
        [userId, purchase.flexi_amount]
      );
    }
  }

  await pool.query("UPDATE payment_transactions SET redemption_status = 'REFUNDED' WHERE id = $1", [id]);

  res.json({
    success: true,
    refundedGeneralAmount: purchase.general_amount,
    refundedFlexiAmount: purchase.flexi_amount,
  });
});

module.exports = router;
