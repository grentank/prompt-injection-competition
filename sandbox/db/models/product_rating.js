module.exports = (sequelize, DataTypes) => {
  const ProductRating = sequelize.define(
    'ProductRating',
    {
      participant_user_id: DataTypes.STRING,
      product_id: DataTypes.INTEGER,
      rating: DataTypes.INTEGER,
    },
    { tableName: 'product_ratings', underscored: true },
  );
  ProductRating.associate = (models) => {
    ProductRating.belongsTo(models.Product, { foreignKey: 'product_id' });
  };
  return ProductRating;
};
