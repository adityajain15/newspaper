import { Sequelize, Op } from 'sequelize'
import Frontpage from './models/Frontpage.js'
import Story from './models/Story.js'
import Category from './models/Category.js'
import Newspaper from './models/Newspaper.js'
import TopStories from './models/TopStories.js'

export default class NewspaperDatabase {
  constructor(connectionString) {
    this.sequelize = new Sequelize(connectionString, {
      logging: false, // Set to console.log to see SQL queries
      dialect: 'postgres',
      pool: {
        max: 5, // Maximum number of connection in pool
        min: 0, // Minimum number of connection in pool
        acquire: 30000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
        idle: 10000, // The maximum time, in milliseconds, that a connection can be idle before being released
      },
      retry: {
        max: 3, // Maximum retry 3 times
        match: [
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/,
        ],
      },
    })

    // Initialize models with sequelize instance
    this.Newspaper = Newspaper(this.sequelize)
    this.Frontpage = Frontpage(this.sequelize)
    this.Story = Story(this.sequelize)
    this.Category = Category(this.sequelize)
    this.TopStories = TopStories(this.sequelize)

    // Define associations
    this.Newspaper.hasMany(this.Frontpage, {
      foreignKey: 'newspaper_slug',
      as: 'frontpages',
      onDelete: 'CASCADE', // Ensure referential integrity
    })

    this.Frontpage.belongsTo(this.Newspaper, {
      foreignKey: 'newspaper_slug',
      as: 'newspaper',
    })

    this.Frontpage.hasMany(this.Story, {
      foreignKey: 'frontpage_id',
      as: 'stories',
      onDelete: 'CASCADE', // Ensure referential integrity
    })

    this.Story.belongsTo(this.Frontpage, {
      foreignKey: 'frontpage_id',
      as: 'frontpage',
    })

    // Many-to-many relationship between Story and Category
    this.Story.belongsToMany(this.Category, {
      through: 'story_categories',
      foreignKey: 'story_id',
      otherKey: 'category_id',
      as: 'categories',
      onDelete: 'CASCADE', // Ensure referential integrity
    })

    this.Category.belongsToMany(this.Story, {
      through: 'story_categories',
      foreignKey: 'category_id',
      otherKey: 'story_id',
      as: 'stories',
      onDelete: 'CASCADE', // Ensure referential integrity
    })

    // Add association between Story and TopStories
    this.Story.belongsToMany(this.TopStories, {
      through: 'story_top_stories',
      foreignKey: 'story_id',
      otherKey: 'top_story_id',
      as: 'top_stories',
      onDelete: 'CASCADE',
    })

    this.TopStories.belongsToMany(this.Story, {
      through: 'story_top_stories',
      foreignKey: 'top_story_id',
      otherKey: 'story_id',
      as: 'stories',
      onDelete: 'CASCADE',
    })
  }

  getTodaysDate() {
    const dateToday = new Date()
    const nyDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(dateToday)
      .split('/')
      .map((part) => part.padStart(2, '0'))
    const formattedDate = `${nyDate[2]}-${nyDate[0]}-${nyDate[1]}`
    return formattedDate
  }

  async getTopStories(date, type) {
    // Use the date provided or today's date if no date is provided
    const todaysDate = this.getTodaysDate()
    console.log(
      `Fetching ${type} for date from the database:`,
      date || todaysDate,
    )

    // First check if we can connect to the database
    try {
      await this.sequelize.authenticate()
      console.log('Database connection is working')
    } catch (error) {
      console.error('Database connection error:', error)
      throw error
    }

    const topStories = await this.TopStories.findAll({
      where: { date: date || todaysDate, type: type },
      attributes: [
        'id',
        'theme_headline',
        'theme_summary',
        'date',
        'type',
        'theme_embedding',
      ],
      include: [
        {
          model: this.Story,
          as: 'stories',
          attributes: ['id', 'headline', 'summary', 'sentiment', 'people'],
          through: { attributes: [] },
          include: [
            {
              model: this.Frontpage,
              as: 'frontpage',
              attributes: ['pdf', 'imageMedium', 'imageLarge'],
              include: [
                {
                  model: this.Newspaper,
                  as: 'newspaper',
                  attributes: ['name', 'city', 'state'],
                },
              ],
            },
          ],
        },
      ],
    })
    return topStories
  }

  async getFrontpages(date) {
    // Use the date provided or today's date if no date is provided
    const todaysDate = this.getTodaysDate()
    console.log('Fetching frontpages for date:', date || todaysDate)

    // First check if we can connect to the database
    try {
      await this.sequelize.authenticate()
      console.log('Database connection is working')
    } catch (error) {
      console.error('Database connection error:', error)
      throw error
    }

    const frontpages = await this.Frontpage.findAll({
      where: { date: date || todaysDate },
      include: [
        {
          model: this.Newspaper,
          as: 'newspaper',
          attributes: ['name', 'city', 'state'],
        },
        {
          model: this.Story,
          as: 'stories',
          include: [
            {
              model: this.Category,
              as: 'categories',
              attributes: ['name'],
              through: { attributes: [] },
            },
          ],
          attributes: ['id', 'headline', 'summary', 'sentiment', 'people'],
        },
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['date'],
    })

    return frontpages.map((frontpage) => ({
      date: frontpage.date,
      name: frontpage.newspaper.name,
      city: frontpage.newspaper.city,
      state: frontpage.newspaper.state,
      stories: frontpage.stories.map((story) => ({
        id: story.id,
        headline: story.headline,
        summary: story.summary,
        sentiment: story.sentiment,
        people: story.people,
        categories: story.categories.map((category) => category.name),
      })),
    }))
  }

  async getStoriesWithEmbeddings(date) {
    // Use the date provided or today's date if no date is provided
    const todaysDate = this.getTodaysDate()
    const targetDate = date || todaysDate

    console.log('Fetching stories with embeddings for date:', targetDate)

    // First check if we can connect to the database
    try {
      await this.sequelize.authenticate()
      console.log('Database connection is working')
    } catch (error) {
      console.error('Database connection error:', error)
      throw error
    }

    const stories = await this.Story.findAll({
      attributes: [
        'id',
        'headline',
        'summary',
        'sentiment',
        'people',
        'story_embedding',
        'createdAt',
      ],
      include: [
        {
          model: this.Frontpage,
          as: 'frontpage',
          attributes: ['date'],
          where: { date: targetDate },
          include: [
            {
              model: this.Newspaper,
              as: 'newspaper',
              attributes: ['name', 'slug', 'city', 'state'],
            },
          ],
        },
      ],
      where: {
        story_embedding: {
          [Op.ne]: null,
        },
      },
      order: [['createdAt', 'DESC']],
    })

    // Transform the data to match the expected format
    return stories.map((story) => ({
      id: story.id,
      headline: story.headline,
      summary: story.summary,
      sentiment: story.sentiment,
      people: story.people,
      story_embedding: story.story_embedding,
      createdAt: story.createdAt,
      date: story.frontpage.date,
      newspaper_name: story.frontpage.newspaper.name,
      newspaper_slug: story.frontpage.newspaper.slug,
      city: story.frontpage.newspaper.city,
      state: story.frontpage.newspaper.state,
    }))
  }

  async initializeDatabase() {
    // We no longer use sync() since we're using migrations
    await this.sequelize.authenticate()
    console.log('Database connection established successfully')
  }

  async closeDatabase() {
    try {
      await this.sequelize.close()
      console.log('Database connection closed successfully')
    } catch (error) {
      console.error('Error closing database connection:', error)
      throw error
    }
  }
}
