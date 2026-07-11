module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    'CartItem',
    {
      participant_user_id: DataTypes.STRING,
      product_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    { tableName: 'cart_items', underscored: true },
  );
  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Product, { foreignKey: 'product_id' });
  };
  return CartItem;
};
