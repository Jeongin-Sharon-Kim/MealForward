const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/products', async (req, res) => {
  const { category } = req.query;
  const { rows } = category
    ? await pool.query('SELECT * FROM products WHERE category = $1 ORDER BY sort_order, id', [category])
    : await pool.query('SELECT * FROM products ORDER BY sort_order, id');

  res.json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      isCashLike: p.is_cash_like,
    }))
  );
});

module.exports = router;
