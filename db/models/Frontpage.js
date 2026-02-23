import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const FrontpageModel = sequelize.define(
    'Frontpage',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      date: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imageMedium: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      imageLarge: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pdf: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
    },
  )

  return FrontpageModel
}
