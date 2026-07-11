module.exports = (sequelize, DataTypes) => {
  const Participant = sequelize.define(
    'Participant',
    {
      nickname: DataTypes.STRING,
      password_hash: DataTypes.STRING,
    },
    { tableName: 'participants', underscored: true },
  );
  Participant.associate = (models) => {
    Participant.hasOne(models.Instance, { foreignKey: 'participant_id' });
    Participant.hasMany(models.TaskCompletion, { foreignKey: 'participant_id' });
    Participant.hasOne(models.PromptAttempt, { foreignKey: 'participant_id' });
  };
  return Participant;
};
