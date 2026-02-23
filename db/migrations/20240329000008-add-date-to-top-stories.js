'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('top_stories', 'date', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: new Date().toISOString().split('T')[0], // Default to current date in YYYY-MM-DD format
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('top_stories', 'date')
  },
}
