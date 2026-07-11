const { Router } = require('express');
const ctrl = require('../controllers/shop.controller');
const { streamChatEvents } = require('../services/chatService');

const productsRouter = Router();
productsRouter.get('/', ctrl.getAllProducts);
productsRouter.get('/:id', ctrl.getOneProduct);
productsRouter.get('/:id/comments', ctrl.getComments);
productsRouter.post('/:id/comments', ctrl.createComment);
productsRouter.post('/:id/ratings', ctrl.rateProduct);

const cartRouter = Router();
cartRouter.get('/', ctrl.getCart);
cartRouter.post('/', ctrl.addToCart);
cartRouter.delete('/:itemId', ctrl.removeFromCart);
cartRouter.post('/checkout', ctrl.checkout);

const ordersRouter = Router();
ordersRouter.get('/', ctrl.getPurchases);

const chatRouter = Router();
chatRouter.post('/stream', async (req, res) => {
  const { text, messages = [], agent_mode = 'mono' } = req.body ?? {};
  if (!text?.trim()) return res.status(400).json({ error: 'text required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let closed = false;
  res.on('close', () => { closed = true; });

  try {
    for await (const chunk of streamChatEvents({ messages, text, agentMode: agent_mode })) {
      if (closed) break;
      send(chunk.event, chunk.data);
    }
  } catch (err) {
    if (!closed) send('error', { message: err.message });
  } finally {
    if (!closed) res.end();
  }
});

const adminRouter = Router();
adminRouter.post('/sql', ctrl.adminSql);
adminRouter.get('/stats', ctrl.adminStats);

module.exports = { productsRouter, cartRouter, ordersRouter, chatRouter, adminRouter };
