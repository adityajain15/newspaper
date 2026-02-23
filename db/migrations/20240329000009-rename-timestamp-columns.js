'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('top_stories', 'created_at', 'createdAt')
    await queryInterface.renameColumn('top_stories', 'updated_at', 'updatedAt')
    await queryInterface.renameColumn(
      'story_top_stories',
      'created_at',
      'createdAt',
    )
    await queryInterface.renameColumn(
      'story_top_stories',
      'updated_at',
      'updatedAt',
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'story_top_stories',
      'createdAt',
      'created_at',
    )
    await queryInterface.renameColumn(
      'story_top_stories',
      'updatedAt',
      'updated_at',
    )
    await queryInterface.renameColumn('top_stories', 'createdAt', 'created_at')
    await queryInterface.renameColumn('top_stories', 'updatedAt', 'updated_at')
  },
}
