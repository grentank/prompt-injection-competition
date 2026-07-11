const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const {
  productsRouter,
  cartRouter,
  ordersRouter,
  chatRouter,
  adminRouter,
} = require('./routes');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, instanceId: process.env.INSTANCE_ID });
});

app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);

module.exports = app;
