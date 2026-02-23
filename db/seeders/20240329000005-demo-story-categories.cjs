'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First get the story IDs and headlines
    const stories = await queryInterface.sequelize.query(
      'SELECT id, headline FROM "Stories"',
      { type: Sequelize.QueryTypes.SELECT },
    )

    // Get category IDs
    const categories = await queryInterface.sequelize.query(
      'SELECT id, name FROM "Categories"',
      { type: Sequelize.QueryTypes.SELECT },
    )

    // Helper function to get category ID by name
    const getCategoryId = (name) => categories.find((c) => c.name === name).id

    // Helper function to get story ID by headline
    const getStoryId = (headline) =>
      stories.find((s) => s.headline === headline).id

    await queryInterface.bulkInsert(
      'story_categories',
      [
        // AI Partnership story categories
        {
          story_id: getStoryId('Major Tech Companies Announce AI Partnership'),
          category_id: getCategoryId('Technology'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          story_id: getStoryId('Major Tech Companies Announce AI Partnership'),
          category_id: getCategoryId('Business'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        // Climate Summit story categories
        {
          story_id: getStoryId(
            'Global Climate Summit Reaches Historic Agreement',
          ),
          category_id: getCategoryId('Politics'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        // Economic Policy story categories
        {
          story_id: getStoryId('New Economic Policy Sparks Market Rally'),
          category_id: getCategoryId('Business'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          story_id: getStoryId('New Economic Policy Sparks Market Rally'),
          category_id: getCategoryId('Politics'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },

        // Sports Star story categories
        {
          story_id: getStoryId('Sports Star Announces Retirement'),
          category_id: getCategoryId('Sports'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          story_id: getStoryId('Sports Star Announces Retirement'),
          category_id: getCategoryId('Entertainment'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('story_categories', null, {})
  },
}
