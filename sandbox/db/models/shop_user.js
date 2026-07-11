module.exports = (sequelize, DataTypes) => {
  const ShopUser = sequelize.define(
    'ShopUser',
    {
      name: DataTypes.STRING,
      email: DataTypes.STRING,
    },
    { tableName: 'shop_users', underscored: true },
  );
  ShopUser.associate = (models) => {
    ShopUser.hasMany(models.Comment, { foreignKey: 'shop_user_id' });
  };
  return ShopUser;
};
