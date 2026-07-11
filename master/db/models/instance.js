module.exports = (sequelize, DataTypes) => {
  const Instance = sequelize.define(
    'Instance',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      participant_id: DataTypes.INTEGER,
      container_id: DataTypes.STRING,
      status: DataTypes.STRING,
      host_port: DataTypes.INTEGER,
      restart_count: DataTypes.INTEGER,
      env_json: DataTypes.TEXT,
    },
    { tableName: 'instances', underscored: true },
  );
  Instance.associate = (models) => {
    Instance.belongsTo(models.Participant, { foreignKey: 'participant_id' });
  };
  return Instance;
};
