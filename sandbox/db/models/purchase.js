module.exports = (sequelize, DataTypes) => {
  const Purchase = sequelize.define(
    'Purchase',
    {
      participant_user_id: DataTypes.STRING,
      total_cost: DataTypes.FLOAT,
      source: DataTypes.STRING,
    },
    { tableName: 'purchases', underscored: true },
  );
  Purchase.associate = (models) => {
    Purchase.hasMany(models.PurchaseItem, { foreignKey: 'purchase_id' });
  };
  return Purchase;
};
