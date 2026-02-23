'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('top_stories', 'type', {
      type: Sequelize.ENUM('topstories', 'topthemes'),
      allowNull: false,
      defaultValue: 'topstories',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('top_stories', 'type')
    // Remove the ENUM type as well
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS enum_top_stories_type;',
    )
  },
}
