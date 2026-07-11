module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define(
    'Task',
    {
      slug: DataTypes.STRING,
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      sort_order: DataTypes.INTEGER,
    },
    { tableName: 'tasks', underscored: true },
  );
  Task.associate = (models) => {
    Task.hasMany(models.TaskCompletion, { foreignKey: 'task_id' });
  };
  return Task;
};
