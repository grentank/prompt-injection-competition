module.exports = (sequelize, DataTypes) => {
  const AdminUser = sequelize.define(
    'AdminUser',
    {
      username: DataTypes.STRING,
      password_hash: DataTypes.STRING,
    },
    { tableName: 'admin_users', underscored: true },
  );
  return AdminUser;
};
