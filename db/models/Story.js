import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const StoryModel = sequelize.define(
    'Story',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      headline: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sentiment: {
        type: DataTypes.ENUM('positive', 'neutral', 'negative'),
        allowNull: true,
      },
      people: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      story_embedding: {
        type: 'vector(1536)',
        allowNull: true,
      },
    },
    {
      timestamps: true,
    },
  )

  return StoryModel
}
