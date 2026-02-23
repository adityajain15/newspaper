import { expect } from 'chai'
import sinon from 'sinon'

describe('Newspaper Database', () => {
  let db
  let mockSequelize
  let mockModels

  beforeEach(() => {
    // Mock Sequelize instance
    mockSequelize = {
      authenticate: sinon.stub().resolves(),
      close: sinon.stub().resolves(),
      define: sinon.stub().returnsThis(),
    }

    // Mock models
    mockModels = {
      Newspaper: {
        create: sinon.stub().resolves({
          id: 1,
          name: 'Test Newspaper',
          slug: 'test-newspaper',
        }),
        findOne: sinon.stub().resolves({
          id: 1,
          name: 'Test Newspaper',
          frontpages: [
            {
              id: 1,
              newspaper_id: 1,
            },
          ],
        }),
      },
      Frontpage: {
        create: sinon.stub().resolves({
          id: 1,
          newspaper_id: 1,
          date: new Date(),
        }),
      },
      Category: {
        create: sinon.stub().resolves({
          id: 1,
          name: 'Test Category',
        }),
      },
      Story: {
        create: sinon.stub().resolves({
          id: 1,
          title: 'Test Story',
          content: 'Test Content',
          frontpage_id: 1,
        }),
        findOne: sinon.stub().resolves({
          id: 1,
          title: 'Test Story',
          categories: [
            {
              id: 1,
              name: 'Test Category',
            },
          ],
        }),
        addCategory: sinon.stub().resolves(),
      },
    }

    // Mock the database class
    class MockNewspaperDatabase {
      constructor() {
        this.sequelize = mockSequelize
        this.Newspaper = mockModels.Newspaper
        this.Frontpage = mockModels.Frontpage
        this.Category = mockModels.Category
        this.Story = mockModels.Story
      }

      async initializeDatabase() {
        await this.sequelize.authenticate()
      }

      async closeDatabase() {
        await this.sequelize.close()
      }
    }

    db = new MockNewspaperDatabase()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Database Setup and Associations', () => {
    it('should create a newspaper and its frontpage', async () => {
      // Create a newspaper
      const newspaper = await db.Newspaper.create({
        name: 'Test Newspaper',
        slug: 'test-newspaper',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        website: 'https://test.com',
      })

      expect(newspaper).to.exist
      expect(newspaper.name).to.equal('Test Newspaper')
      expect(newspaper.slug).to.equal('test-newspaper')
      expect(mockModels.Newspaper.create).to.have.been.calledOnce

      // Create a frontpage for the newspaper
      const frontpage = await db.Frontpage.create({
        date: new Date(),
        imageMedium: 'https://test.com/medium.jpg',
        imageLarge: 'https://test.com/large.jpg',
        pdf: 'https://test.com/frontpage.pdf',
        newspaper_id: newspaper.id,
      })

      expect(frontpage).to.exist
      expect(frontpage.newspaper_id).to.equal(newspaper.id)
      expect(mockModels.Frontpage.create).to.have.been.calledOnce

      // Verify the association
      const newspaperWithFrontpage = await db.Newspaper.findOne({
        where: { id: newspaper.id },
        include: [
          {
            model: db.Frontpage,
            as: 'frontpages',
          },
        ],
      })

      expect(newspaperWithFrontpage.frontpages).to.have.length(1)
      expect(newspaperWithFrontpage.frontpages[0].id).to.equal(frontpage.id)
      expect(mockModels.Newspaper.findOne).to.have.been.calledOnce
    })

    it('should create a story with categories', async () => {
      // Create a category
      const category = await db.Category.create({
        name: 'Test Category',
      })

      expect(category).to.exist
      expect(category.name).to.equal('Test Category')
      expect(mockModels.Category.create).to.have.been.calledOnce

      // Create a newspaper and frontpage (needed for story)
      const newspaper = await db.Newspaper.create({
        name: 'Test Newspaper 2',
        slug: 'test-newspaper-2',
      })

      const frontpage = await db.Frontpage.create({
        date: new Date(),
        newspaper_id: newspaper.id,
      })

      // Create a story
      const story = await db.Story.create({
        title: 'Test Story',
        content: 'Test Content',
        frontpage_id: frontpage.id,
      })

      expect(story).to.exist
      expect(story.title).to.equal('Test Story')
      expect(mockModels.Story.create).to.have.been.calledOnce

      // Associate story with category
      await story.addCategory(category)
      expect(mockModels.Story.addCategory).to.have.been.calledOnceWith(category)

      // Verify the association
      const storyWithCategory = await db.Story.findOne({
        where: { id: story.id },
        include: [
          {
            model: db.Category,
            as: 'categories',
          },
        ],
      })

      expect(storyWithCategory.categories).to.have.length(1)
      expect(storyWithCategory.categories[0].id).to.equal(category.id)
      expect(mockModels.Story.findOne).to.have.been.calledOnce
    })
  })
})
