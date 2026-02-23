'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'Newspapers',
      [
        {
          slug: 'new-york-times',
          name: 'The New York Times',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          region: 'Northeast',
          latitude: '40.7128',
          longitude: '-74.0060',
          website: 'https://www.nytimes.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          slug: 'washington-post',
          name: 'The Washington Post',
          city: 'Washington',
          state: 'DC',
          country: 'USA',
          region: 'Mid-Atlantic',
          latitude: '38.9072',
          longitude: '-77.0369',
          website: 'https://www.washingtonpost.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          slug: 'the-guardian',
          name: 'The Guardian',
          city: 'London',
          country: 'UK',
          region: 'Europe',
          latitude: '51.5074',
          longitude: '-0.1278',
          website: 'https://www.theguardian.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Newspapers', null, {})
  },
}
