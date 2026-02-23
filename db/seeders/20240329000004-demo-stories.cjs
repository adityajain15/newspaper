'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First get the frontpage IDs
    const frontpages = await queryInterface.sequelize.query(
      'SELECT id, newspaper_slug FROM "Frontpages"',
      { type: Sequelize.QueryTypes.SELECT },
    )

    const nytToday = frontpages.find(
      (f) => f.newspaper_slug === 'new-york-times',
    )
    const wapoToday = frontpages.find(
      (f) => f.newspaper_slug === 'washington-post',
    )
    const guardianToday = frontpages.find(
      (f) => f.newspaper_slug === 'the-guardian',
    )

    await queryInterface.bulkInsert(
      'Stories',
      [
        {
          frontpage_id: nytToday.id,
          headline: 'Major Tech Companies Announce AI Partnership',
          summary:
            'Leading technology companies join forces to develop ethical AI standards and practices.',
          sentiment: 'positive',
          people: ['John Smith', 'Sarah Johnson'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          frontpage_id: nytToday.id,
          headline: 'Global Climate Summit Reaches Historic Agreement',
          summary:
            'World leaders commit to unprecedented measures to combat climate change.',
          sentiment: 'positive',
          people: ['President Biden', 'Prime Minister Johnson'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          frontpage_id: wapoToday.id,
          headline: 'New Economic Policy Sparks Market Rally',
          summary:
            "Investors respond positively to government's new economic stimulus package.",
          sentiment: 'positive',
          people: ['Treasury Secretary', 'Federal Reserve Chair'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          frontpage_id: guardianToday.id,
          headline: 'Sports Star Announces Retirement',
          summary:
            'After 15 years at the top, legendary athlete calls time on illustrious career.',
          sentiment: 'neutral',
          people: ['David Thompson'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Stories', null, {})
  },
}
