'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Frontpages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      newspaper_slug: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Newspapers',
          key: 'slug',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      imageMedium: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      imageLarge: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pdf: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Frontpages')
  },
}
