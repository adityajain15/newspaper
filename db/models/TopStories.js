import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const TopStories = sequelize.define(
    'TopStories',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM('topstories', 'topthemes'),
        allowNull: false,
        defaultValue: 'topstories',
      },
      theme_headline: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      theme_summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      date: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      theme_embedding: {
        type: 'vector(1536)',
        allowNull: true,
      },
    },
    {
      tableName: 'top_stories',
      timestamps: true,
    },
  )

  return TopStories
}
