module.exports = (sequelize, DataTypes) => {
  const TaskCompletion = sequelize.define(
    'TaskCompletion',
    {
      participant_id: DataTypes.INTEGER,
      task_id: DataTypes.INTEGER,
      completed_at: DataTypes.DATE,
      auto_detected: DataTypes.BOOLEAN,
      manual_override: DataTypes.BOOLEAN,
    },
    { tableName: 'task_completions', underscored: true },
  );
  TaskCompletion.associate = (models) => {
    TaskCompletion.belongsTo(models.Participant, { foreignKey: 'participant_id' });
    TaskCompletion.belongsTo(models.Task, { foreignKey: 'task_id' });
  };
  return TaskCompletion;
};
