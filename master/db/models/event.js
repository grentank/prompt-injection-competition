module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define(
    'Event',
    {
      participant_id: DataTypes.INTEGER,
      instance_id: DataTypes.STRING,
      event_type: DataTypes.STRING,
      payload_json: DataTypes.TEXT,
    },
    { tableName: 'events', underscored: true, updatedAt: false, createdAt: 'created_at' },
  );
  return Event;
};
