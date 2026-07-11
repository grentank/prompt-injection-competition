module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      name: DataTypes.STRING,
      price: DataTypes.FLOAT,
      description: DataTypes.TEXT,
      image: DataTypes.STRING,
      stock_quantity: DataTypes.INTEGER,
      rating_avg: DataTypes.FLOAT,
    },
    { tableName: 'products', underscored: true },
  );
  Product.associate = (models) => {
    Product.hasMany(models.Comment, { foreignKey: 'product_id' });
    Product.hasMany(models.ProductRating, { foreignKey: 'product_id' });
    Product.hasMany(models.CartItem, { foreignKey: 'product_id' });
  };
  return Product;
};
