import cors from '@fastify/cors'
import fastify from 'fastify'
import NewspaperDatabase from '../db/index.js'
import SimilarityService from '../scheduler/src/similarityService.js'

const server = fastify({ logger: true })

// Initialize the similarity service
const similarityService = new SimilarityService()

const db = new NewspaperDatabase(
  process.env.POSTGRES_URL ||
    'postgresql://postgres:postgres@localhost:5432/dockerapp',
)

//const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

async function start() {
  await server.register(cors, {
    origin: '*',
  })

  await db.initializeDatabase()

  server.get('/frontpages/:date', async function handler(request, reply) {
    return request.params.date
      ? await db.getFrontpages(request.params.date)
      : await db.getFrontpages()
  })

  server.get('/topstories/:date', async function handler(request, reply) {
    let requestedDate = request.params.date || db.getTodaysDate()
    const topStories = await db.getTopStories(requestedDate, 'topstories')

    return await Promise.all(
      topStories.map(async (topStory) => {
        // Convert Sequelize model to plain object to avoid circular references
        const { theme_embedding, createdAt, updatedAt, ...topStoryData } =
          topStory.toJSON()

        return {
          ...topStoryData,
          similarStories: await similarityService.findSimilarItems(
            topStory,
            db,
            {
              threshold: 0.6,
              timeWindow: 180,
              type: 'topstory',
            },
          ),
        }
      }),
    )
  })

  server.get('/topthemes/:date', async function handler(request, reply) {
    return request.params.date
      ? await db.getTopStories(request.params.date, 'topthemes')
      : await db.getTopStories(db.getTodaysDate(), 'topthemes')
  })

  server.get('/stories/:id', async function handler(request, reply) {
    const story = await db.Story.findByPk(request.params.id)
    if (!story) {
      return reply.status(404).send({ error: 'Story not found' })
    }

    const similarStories = await similarityService.findSimilarStories(
      story,
      db,
      {
        threshold: 0.6,
        timeWindow: 180,
        excludeStoryId: request.params.id,
      },
    )

    let { story_embedding, createdAt, updatedAt, ...storyWithoutEmbedding } =
      story.toJSON()

    return { story: storyWithoutEmbedding, similarStories }
  })

  server.get('/clusters', async function handler(request, reply) {
    const clusters = await similarityService.groupSimilarStories(db)
    return clusters
  })

  server.get('/compact', async function handler(request, reply) {
    const newspapers = await db.Newspaper.findAll({
      attributes: ['name', 'city', 'state'],
      include: [
        {
          model: db.Frontpage,
          as: 'frontpages',
          attributes: ['id'],
          where: {
            date: new Date().toISOString().split('T')[0],
          },
          include: [
            {
              model: db.Story,
              as: 'stories',
              attributes: ['id', 'headline', 'summary'],
              include: [
                {
                  model: db.Category,
                  as: 'categories',
                  attributes: ['name'],
                  through: {
                    attributes: [],
                  },
                },
              ],
            },
          ],
        },
      ],
    })
  })

  server.listen({ port: 8080, host: '0.0.0.0' }, (err) => {
    if (err) {
      server.log.error(err)
      process.exit(1)
    }
  })
}

start().catch((err) => {
  console.log(err)
  process.exit(1)
})
