'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Format dates as YYYY-MM-DD strings
    const formatDate = (date) => {
      return date.toISOString().split('T')[0]
    }

    await queryInterface.bulkInsert(
      'Frontpages',
      [
        {
          newspaper_slug: 'new-york-times',
          date: formatDate(today),
          imageMedium: 'https://example.com/nyt-today-medium.jpg',
          imageLarge: 'https://example.com/nyt-today-large.jpg',
          pdf: 'https://example.com/nyt-today.pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          newspaper_slug: 'new-york-times',
          date: formatDate(yesterday),
          imageMedium: 'https://example.com/nyt-yesterday-medium.jpg',
          imageLarge: 'https://example.com/nyt-yesterday-large.jpg',
          pdf: 'https://example.com/nyt-yesterday.pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          newspaper_slug: 'washington-post',
          date: formatDate(today),
          imageMedium: 'https://example.com/wapo-today-medium.jpg',
          imageLarge: 'https://example.com/wapo-today-large.jpg',
          pdf: 'https://example.com/wapo-today.pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          newspaper_slug: 'the-guardian',
          date: formatDate(today),
          imageMedium: 'https://example.com/guardian-today-medium.jpg',
          imageLarge: 'https://example.com/guardian-today-large.jpg',
          pdf: 'https://example.com/guardian-today.pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Frontpages', null, {})
  },
}
