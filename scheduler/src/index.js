import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import fetchNewspaperMetadata from './fetchNewspaperMetadata.js'
import { getNewspaper } from './openAIFunctions.js'
import SimilarityService from './similarityService.js'

// Initialize the similarity service
const similarityService = new SimilarityService()

export const fetchAndCreateAllNewspapers = async (db) => {
  let newspapers
  let totalTokens = 0
  let allContent = []
  try {
    newspapers = await fetchNewspaperMetadata()
  } catch (error) {
    console.error('Error fetching newspapers:', error)
  }
  try {
    console.log('Running scheduled task...')
    // Process all newspapers
    if (newspapers && newspapers.length > 0) {
      console.log(`Processing ${newspapers.length} newspapers...`)

      for (const newspaper of newspapers) {
        try {
          // Check if we already have a frontpage for this newspaper for this date
          let frontpage = await db.Frontpage.findOne({
            where: {
              newspaper_slug: newspaper.newsPaper.slug,
              date: newspaper.date,
            },
          })

          if (frontpage) {
            console.log(
              `Frontpage already exists for ${newspaper.newsPaper.name} on ${newspaper.date}`,
            )
            continue
          }

          // Process the newspaper
          const { content: newspaperData, tokens } = await getNewspaper(
            newspaper,
          )
          totalTokens += tokens
          await createNewspaper(newspaperData, newspaper, db)
          allContent.push(newspaperData)
          console.log(
            `Successfully processed newspaper: ${newspaper.newsPaper.name}`,
          )
        } catch (error) {
          console.error(
            `Error processing newspaper ${newspaper.newsPaper.name}:`,
            error,
          )
          // Continue with the next newspaper even if one fails
          continue
        }
      }

      console.log('Finished processing all newspapers')
      console.log(`Total tokens used: ${totalTokens}`)
    } else {
      console.log('No newspapers available to process')
    }
  } catch (error) {
    console.error('Error in scheduled task:', error)
    // If frontpage was created but stories failed, we might want to clean it up
    if (frontpage?.id) {
      try {
        await frontpage.destroy()
        console.log('Cleaned up incomplete frontpage due to error')
      } catch (cleanupError) {
        console.error('Failed to clean up incomplete frontpage:', cleanupError)
      }
    }
    throw error // Re-throw the error for the caller to handle
  }
}

export const createNewspaper = async (parsedContent, newspaper, db) => {
  // Start a transaction to ensure data consistency
  const transaction = await db.sequelize.transaction()
  let frontpage = null
  let createdStories = []

  try {
    // Create or find the newspaper
    const [newspaperModel] = await db.Newspaper.findOrCreate({
      where: {
        slug: newspaper.newsPaper.slug,
      },
      defaults: {
        name: newspaper.newsPaper.name,
        city: newspaper.newsPaper.city,
        state: newspaper.newsPaper.state,
        country: newspaper.newsPaper.country,
        region: newspaper.newsPaper.region,
        latitude: newspaper.newsPaper.latitude,
        longitude: newspaper.newsPaper.longitude,
        website: newspaper.newsPaper.website,
      },
      transaction,
    })

    // Create a new frontpage with metadata from the newspaper
    frontpage = await db.Frontpage.create(
      {
        date: newspaper.date, // Keep as string in YYYY-MM-DD format
        imageMedium: newspaper.images.medium,
        imageLarge: newspaper.images.large,
        pdf: newspaper.pdf,
        newspaper_slug: newspaperModel.slug, // Use newspaper_slug instead of newspaper_id
      },
      { transaction },
    )

    // Validate parsed content structure
    if (!parsedContent.stories || !Array.isArray(parsedContent.stories)) {
      throw new Error('Invalid stories format in OpenAI response')
    }

    // Create stories from the response
    for (const storyData of parsedContent.stories) {
      // Validate story data
      if (!storyData.headline) {
        console.warn('Skipping invalid story: missing headline')
        continue
      }

      try {
        // Create the story with all available fields
        const story = await db.Story.create(
          {
            headline: storyData.headline,
            summary: storyData.summary,
            sentiment: storyData.sentiment,
            people: storyData.people,
            frontpage_id: frontpage.id,
          },
          { transaction },
        )
        createdStories.push(story)
        // Create or find categories and associate them with the story
        if (Array.isArray(storyData.categories)) {
          for (const categoryName of storyData.categories) {
            if (typeof categoryName !== 'string' || !categoryName.trim()) {
              console.warn('Skipping invalid category name:', categoryName)
              continue
            }

            try {
              const [category] = await db.Category.findOrCreate({
                where: { name: categoryName.trim() },
                transaction,
              })
              await story.addCategory(category, { transaction })
            } catch (categoryError) {
              console.error(
                `Failed to process category ${categoryName}:`,
                categoryError,
              )
              // Continue with other categories even if one fails
            }
          }
        }
      } catch (storyError) {
        console.error('Failed to create story:', storyError)
        // Continue with other stories even if one fails
      }
    }

    // Commit the transaction if everything succeeded
    await transaction.commit()

    for (const story of createdStories) {
      try {
        await similarityService.updateStoryEmbedding(story, db)
        console.log(`Generated embedding for story: "${story.headline}"`)
      } catch (embeddingError) {
        console.error(
          `Error generating embedding for story ${story.id}:`,
          embeddingError,
        )
      }
    }

    console.log(
      `Successfully created frontpage with ${parsedContent.stories.length} stories`,
    )
  } catch (error) {
    // Rollback the transaction if anything failed
    await transaction.rollback()
    console.error('Failed to create newspaper:', error)

    // Clean up the frontpage if it was created but the transaction failed
    if (frontpage?.id) {
      try {
        await frontpage.destroy()
        console.log('Cleaned up incomplete frontpage due to error')
      } catch (cleanupError) {
        console.error('Failed to clean up incomplete frontpage:', cleanupError)
      }
    }
    throw error
  }
}

export const checkIfTopStoriesExist = async (db, type) => {
  const topStories = await db.getTopStories(db.getTodaysDate(), type)
  if (topStories.length > 0) {
    return true
  }
  return false
}

export const createTopStories = async (content, type, db) => {
  try {
    const today = db.getTodaysDate()

    // Create a transaction to ensure data consistency
    const result = await db.sequelize.transaction(async (t) => {
      const createdThemes = []

      for (const theme of content.themes) {
        // Get all the stories for this theme first
        const storyIds = theme.coverage.map((c) => parseInt(c.story_id))
        console.log('Looking for stories with IDs:', storyIds)

        const stories = await db.Story.findAll({
          where: {
            id: storyIds,
          },
          transaction: t,
        })

        // Check for missing stories
        const foundStoryIds = stories.map((story) => story.id)
        const missingStoryIds = storyIds.filter(
          (id) => !foundStoryIds.includes(id),
        )

        if (missingStoryIds.length > 0) {
          throw new Error(
            `Some stories referenced in theme "${
              theme.theme_headline
            }" were not found in the database: ${missingStoryIds.join(', ')}`,
          )
        }

        if (stories.length === 0) {
          throw new Error(
            `No stories found for theme "${theme.theme_headline}". Cannot create top story without associated stories.`,
          )
        }

        // Create the top story record
        const topStory = await db.TopStories.create(
          {
            theme_headline: theme.theme_headline,
            theme_summary: theme.theme_summary,
            date: today,
            type: type,
          },
          { transaction: t },
        )

        // Associate stories with the top story
        await topStory.setStories(stories, { transaction: t })

        createdThemes.push(topStory)
      }

      return createdThemes
    })

    for (const topStory of result) {
      try {
        await similarityService.updateTopStoryEmbedding(topStory, db)
        console.log(
          `Generated embedding for top story: "${topStory.theme_headline}"`,
        )
      } catch (embeddingError) {
        console.error(
          `Error generating embedding for top story ${topStory.id}:`,
          embeddingError,
        )
      }
    }

    console.log(`Successfully created ${result.length} top story themes`)
    return result
  } catch (error) {
    console.error('Error creating top stories:', error.message)
    throw error
  }
}

export const createJSONFromContent = async (content, date) => {
  try {
    const json = JSON.stringify(content)
    // Go up one level from src to reach the fixtures directory
    const fixturesDir = path.join(__dirname, '..', 'fixtures')
    const jsonFilePath = path.join(
      fixturesDir,
      `newspaper_stories_${date}.json`,
    )
    fs.writeFileSync(jsonFilePath, json)
    console.log(`JSON file created successfully at ${jsonFilePath}`)
  } catch (error) {
    console.error('Error creating JSON from content:', error)
  }
}

/**
 * Creates a CSV file from the allContent array
 * @param {Array} content - Array of newspaper content
 */
export const createCSVFromContent = async (content) => {
  try {
    // Use the existing fixtures directory in the scheduler folder
    const fixturesDir = path.join(__dirname, 'fixtures')

    // Create CSV file
    const csvFilePath = path.join(
      fixturesDir,
      `newspaper_stories_${new Date().toISOString().split('T')[0]}.csv`,
    )

    // CSV header
    let csvContent =
      'Date,Newspaper Name,City,State,Headline,Summary,Sentiment,Categories,People\n'

    // Process each frontpage's content
    content.forEach((frontpage) => {
      if (frontpage && frontpage.stories && Array.isArray(frontpage.stories)) {
        frontpage.stories.forEach((story) => {
          // Escape commas and quotes in text fields
          const headline = `"${story.headline.replace(/"/g, '""')}"`
          const summary = `"${story.summary.replace(/"/g, '""')}"`
          const categories = `"${story.categories
            .join('; ')
            .replace(/"/g, '""')}"`
          const people = `"${story.people.join('; ').replace(/"/g, '""')}"`

          // Add row to CSV
          csvContent += `${frontpage.date},${frontpage.name},${frontpage.city},${frontpage.state},${headline},${summary},${story.sentiment},${categories},${people}\n`
        })
      }
    })

    // Write to file
    fs.writeFileSync(csvFilePath, csvContent)
    console.log(`CSV file created successfully at ${csvFilePath}`)
  } catch (error) {
    console.error('Error creating CSV file:', error)
  }
}

// Generate embeddings for stories and top stories that don't have them
export const generateMissingEmbeddings = async (db) => {
  try {
    console.log('Checking for stories without embeddings...')

    const storiesWithoutEmbeddings = await db.Story.findAll({
      where: {
        story_embedding: null,
      },
      // No limit - process all stories without embeddings
    })

    if (storiesWithoutEmbeddings.length === 0) {
      console.log('All stories have embeddings!')
    } else {
      console.log(
        `Found ${storiesWithoutEmbeddings.length} stories without embeddings`,
      )

      for (const story of storiesWithoutEmbeddings) {
        try {
          await similarityService.updateStoryEmbedding(story, db)
          console.log(`Generated embedding for story: "${story.headline}"`)
        } catch (error) {
          console.error(
            `Error generating embedding for story ${story.id}:`,
            error,
          )
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log('Checking for top stories without embeddings...')

    const topStoriesWithoutEmbeddings = await db.TopStories.findAll({
      where: {
        theme_embedding: null,
      },
      // No limit - process all top stories without embeddings
    })

    if (topStoriesWithoutEmbeddings.length === 0) {
      console.log('All top stories have embeddings!')
    } else {
      console.log(
        `Found ${topStoriesWithoutEmbeddings.length} top stories without embeddings`,
      )

      for (const topStory of topStoriesWithoutEmbeddings) {
        try {
          await similarityService.updateTopStoryEmbedding(topStory, db)
          console.log(
            `Generated embedding for top story: "${topStory.theme_headline}"`,
          )
        } catch (error) {
          console.error(
            `Error generating embedding for top story ${topStory.id}:`,
            error,
          )
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  } catch (error) {
    console.error('Error in generateMissingEmbeddings:', error)
  }
}
