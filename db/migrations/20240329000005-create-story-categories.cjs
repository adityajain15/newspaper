'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('story_categories', {
      story_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Stories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Add a unique constraint to prevent duplicate story-category pairs
    await queryInterface.addConstraint('story_categories', {
      fields: ['story_id', 'category_id'],
      type: 'unique',
      name: 'story_categories_story_id_category_id_unique',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('story_categories')
  },
}
