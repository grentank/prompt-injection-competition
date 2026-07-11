module.exports = (sequelize, DataTypes) => {
  const PromptAttempt = sequelize.define(
    'PromptAttempt',
    {
      participant_id: DataTypes.INTEGER,
      last_prompt: DataTypes.TEXT,
      prompt_count: DataTypes.INTEGER,
    },
    { tableName: 'prompt_attempts', underscored: true, createdAt: false },
  );
  PromptAttempt.associate = (models) => {
    PromptAttempt.belongsTo(models.Participant, { foreignKey: 'participant_id' });
  };
  return PromptAttempt;
};
