const {
  Product,
  Comment,
  ShopUser,
  ProductRating,
  CartItem,
  Purchase,
  PurchaseItem,
  sequelize,
} = require('../../db/models');

async function getAllProducts(_req, res) {
  try {
    const products = await Product.findAll({
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM comments WHERE comments.product_id = Product.id)'),
            'comment_count',
          ],
        ],
      },
      order: [['id', 'ASC']],
      raw: true,
    });
    res.json(
      products.map((p) => ({
        ...p,
        comment_count: Number(p.comment_count) || 0,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOneProduct(req, res) {
  const product = await Product.findByPk(req.params.id, {
    include: [{ model: Comment, include: [ShopUser] }],
  });
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
}

async function getComments(req, res) {
  const comments = await Comment.findAll({
    where: { product_id: req.params.id },
    include: [ShopUser],
    order: [['created_at', 'DESC']],
  });
  res.json(comments);
}

async function createComment(req, res) {
  const { body, author_name } = req.body || {};
  if (!body?.trim()) return res.status(400).json({ error: 'body required' });

  const [shopUser] = await ShopUser.findOrCreate({
    where: { email: `${author_name || 'guest'}@local` },
    defaults: { name: author_name || 'Гость' },
  });

  const comment = await Comment.create({
    shop_user_id: shopUser.id,
    product_id: req.params.id,
    body: body.trim(),
  });

  res.status(201).json(comment);
}

async function rateProduct(req, res) {
  const { rating, participant_user_id } = req.body || {};
  const pid = participant_user_id || 'guest';
  const value = Number(rating);
  if (!value || value < 1 || value > 5) {
    return res.status(400).json({ error: 'rating 1-5 required' });
  }

  try {
    const [record] = await ProductRating.findOrCreate({
      where: { participant_user_id: pid, product_id: req.params.id },
      defaults: { rating: value },
    });
    if (record.rating !== value) {
      return res.status(409).json({ error: 'Rating already set' });
    }

    const avg = await ProductRating.findOne({
      where: { product_id: req.params.id },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg']],
      raw: true,
    });
    await Product.update({ rating_avg: Number(avg?.avg || value) }, { where: { id: req.params.id } });

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getCart(req, res) {
  const pid = req.query.participant_user_id || 'guest';
  const items = await CartItem.findAll({
    where: { participant_user_id: pid },
    include: [Product],
  });
  res.json(items);
}

async function addToCart(req, res) {
  const { product_id, quantity, participant_user_id } = req.body || {};
  const pid = participant_user_id || 'guest';
  const [item] = await CartItem.findOrCreate({
    where: { participant_user_id: pid, product_id },
    defaults: { quantity: quantity || 1 },
  });
  if (item.quantity !== (quantity || 1)) {
    await item.update({ quantity: item.quantity + (quantity || 1) });
  }
  res.json(item);
}

async function removeFromCart(req, res) {
  const pid = req.query.participant_user_id || 'guest';
  await CartItem.destroy({ where: { id: req.params.itemId, participant_user_id: pid } });
  res.json({ ok: true });
}

async function checkout(req, res) {
  const pid = req.body?.participant_user_id || 'guest';
  const items = await CartItem.findAll({ where: { participant_user_id: pid }, include: [Product] });
  if (!items.length) return res.status(400).json({ error: 'Cart empty' });

  let total = 0;
  const purchase = await Purchase.create({ participant_user_id: pid, total_cost: 0, source: 'checkout' });

  for (const item of items) {
    const product = item.Product;
    if (!product || product.stock_quantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product?.name}` });
    }
    total += product.price * item.quantity;
    await PurchaseItem.create({
      purchase_id: purchase.id,
      product_id: product.id,
      quantity: item.quantity,
      price: product.price,
    });
    await product.update({ stock_quantity: product.stock_quantity - item.quantity });
  }

  await purchase.update({ total_cost: total });
  await CartItem.destroy({ where: { participant_user_id: pid } });
  res.json({ purchase, total });
}

async function getPurchases(req, res) {
  const pid = req.query.participant_user_id || 'guest';
  const purchases = await Purchase.findAll({
    where: { participant_user_id: pid },
    include: [PurchaseItem],
    order: [['created_at', 'DESC']],
  });
  res.json(purchases);
}

async function adminSql(req, res) {
  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error: 'query required' });
  try {
    const [rows, meta] = await sequelize.query(query);
    res.json({ rows, meta });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function adminStats(_req, res) {
  const [rows] = await sequelize.query('SELECT COUNT(*) as cnt, AVG(price) as avg_price FROM products');
  const row = rows[0] || {};
  res.json({
    products_count: Number(row.cnt) || 0,
    avg_price: Number(row.avg_price) || 0,
  });
}

module.exports = {
  getAllProducts,
  getOneProduct,
  getComments,
  createComment,
  rateProduct,
  getCart,
  addToCart,
  removeFromCart,
  checkout,
  getPurchases,
  adminSql,
  adminStats,
};
