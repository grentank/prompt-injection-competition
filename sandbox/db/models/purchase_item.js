module.exports = (sequelize, DataTypes) => {
  const PurchaseItem = sequelize.define(
    'PurchaseItem',
    {
      purchase_id: DataTypes.INTEGER,
      product_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
      price: DataTypes.FLOAT,
    },
    { tableName: 'purchase_items', underscored: true },
  );
  PurchaseItem.associate = (models) => {
    PurchaseItem.belongsTo(models.Purchase, { foreignKey: 'purchase_id' });
  };
  return PurchaseItem;
};
