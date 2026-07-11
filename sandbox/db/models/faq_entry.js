module.exports = (sequelize, DataTypes) => {
  const FaqEntry = sequelize.define(
    'FaqEntry',
    {
      question: DataTypes.TEXT,
      answer: DataTypes.TEXT,
    },
    { tableName: 'faq_entries', underscored: true },
  );
  return FaqEntry;
};
