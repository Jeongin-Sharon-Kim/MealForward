const express = require('express');
const { pool } = require('../db');
const { classifyPurchase } = require('../guardrail');

const router = express.Router();

function generateVoucherCode() {
  return Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join('-');
}

async function findActiveLedger(userId, pointType) {
  const { rows } = await pool.query(
    "SELECT * FROM point_ledgers WHERE user_id = $1 AND point_type = $2 AND status = 'ACTIVE'",
    [userId, pointType]
  );
  return rows[0];
}

// 결제는 일반 복지 포인트(GENERAL) / 식대 이월 포인트(FLEXI_MEAL)로 나눠서 낼 수 있다.
// Guardrail AX는 "식대 이월 포인트로 현금성 자산을 사는 행위"만 차단한다 - 같은 상품이라도
// 일반 복지 포인트로 결제하는 금액에는 적용되지 않는다.
router.post('/checkout', async (req, res) => {
  const { userId, itemName, mccCode, generalAmount = 0, flexiAmount = 0 } = req.body;
  const totalAmount = generalAmount + flexiAmount;

  if (totalAmount <= 0) {
    return res.status(400).json({ errorCode: 'INVALID_AMOUNT', message: '결제 금액을 확인해주세요.' });
  }

  const classification =
    flexiAmount > 0
      ? await classifyPurchase({ itemName, mccCode })
      : { isBlocked: false, riskScore: 0, blockReason: null, source: 'NOT_APPLICABLE_GENERAL_ONLY' };

  const isBlocked = classification.isBlocked;

  const { rows: txRows } = await pool.query(
    `INSERT INTO payment_transactions (user_id, item_name, mcc_code, general_amount, flexi_amount, total_amount, approval_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, itemName, mccCode || null, generalAmount, flexiAmount, totalAmount, isBlocked ? 'BLOCKED' : 'APPROVED']
  );
  const paymentId = txRows[0].id;

  if (flexiAmount > 0) {
    await pool.query(
      'INSERT INTO guardrail_logs (payment_id, risk_score, is_blocked, block_reason, source) VALUES ($1, $2, $3, $4, $5)',
      [paymentId, classification.riskScore, isBlocked, classification.blockReason, classification.source]
    );
  }

  if (isBlocked) {
    return res.status(400).json({
      errorCode: 'RESTRICTED_TAX_RISK_CATEGORY',
      isBlocked: true,
      blockedPortion: 'FLEXI_MEAL',
      riskScore: classification.riskScore,
      blockReason: classification.blockReason,
      hint: '식대 이월 포인트로는 구매할 수 없습니다. 일반 복지 포인트로 결제해보세요.',
    });
  }

  const generalLedger = await findActiveLedger(userId, 'GENERAL');
  const flexiLedger = await findActiveLedger(userId, 'FLEXI_MEAL');

  if (generalAmount > 0 && (!generalLedger || generalLedger.amount < generalAmount)) {
    return res.status(400).json({ errorCode: 'INSUFFICIENT_BALANCE', message: '일반 복지 포인트 잔액이 부족합니다.' });
  }
  if (flexiAmount > 0 && (!flexiLedger || flexiLedger.amount < flexiAmount)) {
    return res.status(400).json({ errorCode: 'INSUFFICIENT_BALANCE', message: '식대 이월 포인트 잔액이 부족합니다.' });
  }

  let generalRemaining = generalLedger ? generalLedger.amount : 0;
  let flexiRemaining = flexiLedger ? flexiLedger.amount : 0;

  if (generalAmount > 0) {
    generalRemaining -= generalAmount;
    await pool.query('UPDATE point_ledgers SET amount = $1 WHERE id = $2', [generalRemaining, generalLedger.id]);
  }
  if (flexiAmount > 0) {
    flexiRemaining -= flexiAmount;
    await pool.query('UPDATE point_ledgers SET amount = $1 WHERE id = $2', [flexiRemaining, flexiLedger.id]);
  }

  const voucherCode = generateVoucherCode();
  await pool.query('UPDATE payment_transactions SET voucher_code = $1 WHERE id = $2', [voucherCode, paymentId]);

  res.json({
    paymentId,
    status: 'APPROVED',
    generalRemaining,
    flexiRemaining,
  });
});

module.exports = router;
