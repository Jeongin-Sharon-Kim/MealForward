const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// 관리자만 수동 트리거할 수 있도록 로그인 세션을 검사한다.
router.use(async (req, res, next) => {
  const adminId = Number(req.header('x-admin-id'));
  if (!Number.isInteger(adminId)) {
    return res.status(401).json({ errorCode: 'ADMIN_AUTH_REQUIRED', message: '관리자 로그인이 필요합니다.' });
  }
  const { rows } = await pool.query('SELECT * FROM admins WHERE id = $1', [adminId]);
  if (!rows[0]) {
    return res.status(401).json({ errorCode: 'ADMIN_AUTH_REQUIRED', message: '관리자 로그인이 필요합니다.' });
  }
  next();
});

// 매년 9/30 23:59:59 스케줄러가 자동 실행하는 이월 포인트 소멸 배치.
// 데모 환경에서는 수동 트리거로 동일 로직을 시뮬레이션한다.
router.post('/expire-ledgers', async (req, res) => {
  const { rows: expirable } = await pool.query(
    "SELECT * FROM point_ledgers WHERE point_type = 'FLEXI_MEAL' AND status = 'ACTIVE' AND expired_at IS NOT NULL AND expired_at <= now()"
  );

  const expiredAmount = expirable.reduce((sum, l) => sum + l.amount, 0);

  for (const ledger of expirable) {
    await pool.query("UPDATE point_ledgers SET status = 'EXPIRED' WHERE id = $1", [ledger.id]);
  }

  res.json({ expiredCount: expirable.length, expiredAmount });
});

module.exports = router;
