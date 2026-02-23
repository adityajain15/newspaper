import cron from 'node-cron'
import NewspaperDatabase from '../db/index.js'
import fetchNewspaperMetadata from './src/fetchNewspaperMetadata.js'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getTopStories,
  createVectorStore,
  addFileToVectorStore,
  deleteFilesFromVectorStore,
  deleteAllFiles,
} from './src/openAIFunctions.js'
import {
  createJSONFromContent,
  checkIfTopStoriesExist,
  createTopStories,
  fetchAndCreateAllNewspapers,
  generateMissingEmbeddings,
} from './src/index.js'

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new NewspaperDatabase(
  process.env.POSTGRES_URL ||
    'postgresql://postgres:postgres@localhost:5432/dockerapp',
)

async function runScheduledTask() {
  try {
    await fetchAndCreateAllNewspapers(db)
    const todayFrontPage = await db.getFrontpages()
    await createJSONFromContent(todayFrontPage, db.getTodaysDate())
    const vectorStoreId = await createVectorStore('newsbot')
    await deleteFilesFromVectorStore(vectorStoreId)
    await deleteAllFiles()
    await addFileToVectorStore(
      vectorStoreId,
      todayFrontPage,
      db.getTodaysDate(),
    )
    const topStoriesExist = await checkIfTopStoriesExist(db, 'topstories')
    if (topStoriesExist) {
      console.log('Top stories already exist')
    } else {
      const topStories = await getTopStories('topstories')
      await createTopStories(topStories, 'topstories', db)
      console.log('Top stories created')
    }
    const topThemesExist = await checkIfTopStoriesExist(db, 'topthemes')
    if (topThemesExist) {
      console.log('Top themes already exist')
    } else {
      const topThemes = await getTopStories('topthemes')
      await createTopStories(topThemes, 'topthemes', db)
      console.log('Top themes created')
    }

    // Generate embeddings for any stories that don't have them
    await generateMissingEmbeddings(db)
  } catch (error) {
    console.error('Error running scheduled task:', error)
  }
}

async function start() {
  try {
    await db.initializeDatabase()

    // Schedule the task to run every hour
    // cron.schedule('0 * * * *', runScheduledTask)

    // Run immediately on startup
    await runScheduledTask()
  } catch (error) {
    console.error('Failed to start scheduler:', error)
    process.exit(1)
  }
}

start()
