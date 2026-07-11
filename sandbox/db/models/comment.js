module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    'Comment',
    {
      shop_user_id: DataTypes.INTEGER,
      product_id: DataTypes.INTEGER,
      body: DataTypes.TEXT,
    },
    { tableName: 'comments', underscored: true },
  );
  Comment.associate = (models) => {
    Comment.belongsTo(models.ShopUser, { foreignKey: 'shop_user_id' });
    Comment.belongsTo(models.Product, { foreignKey: 'product_id' });
  };
  return Comment;
};
