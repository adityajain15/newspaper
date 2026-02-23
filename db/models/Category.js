import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const CategoryModel = sequelize.define(
    'Category',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
    },
    {
      timestamps: true,
    },
  )

  return CategoryModel
}
