'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'Categories',
      [
        {
          name: 'Politics',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Technology',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Business',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Sports',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Entertainment',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Categories', null, {})
  },
}
