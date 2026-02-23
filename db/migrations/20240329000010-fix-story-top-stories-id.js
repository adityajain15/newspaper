'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First drop the existing table
    await queryInterface.dropTable('story_top_stories')

    // Recreate the table without the id column
    await queryInterface.createTable('story_top_stories', {
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
      top_story_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'top_stories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })

    // Add unique constraint to prevent duplicate associations
    await queryInterface.addIndex(
      'story_top_stories',
      ['story_id', 'top_story_id'],
      {
        unique: true,
        name: 'story_top_stories_unique',
      },
    )
  },

  async down(queryInterface, Sequelize) {
    // First drop the existing table
    await queryInterface.dropTable('story_top_stories')

    // Recreate the table with the id column
    await queryInterface.createTable('story_top_stories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
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
      top_story_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'top_stories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })

    // Add unique constraint to prevent duplicate associations
    await queryInterface.addIndex(
      'story_top_stories',
      ['story_id', 'top_story_id'],
      {
        unique: true,
        name: 'story_top_stories_unique',
      },
    )
  },
}
