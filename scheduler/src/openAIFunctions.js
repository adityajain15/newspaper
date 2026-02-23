import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const storySchema = {
  name: 'news_stories',
  schema: {
    type: 'object',
    properties: {
      stories: {
        type: 'array',
        description: 'A list of news stories',
        items: {
          type: 'object',
          properties: {
            headline: {
              type: 'string',
              description: 'The headline for the story',
            },
            summary: {
              type: 'string',
              description: 'A 1 paragraph summary for the story',
            },
            sentiment: {
              type: 'string',
              description:
                'Whether a Public Relations professional, representing the people/organization/company/brand mentioned in the story, would conclude that the story is positive, neutral or negative for their client',
              enum: ['positive', 'neutral', 'negative'],
            },
            categories: {
              type: 'array',
              description: 'A list of categories for the story',
              items: {
                type: 'string',
              },
            },
            people: {
              type: 'array',
              description:
                'A list of entities mentioned in the story (exclude author names)',
              items: {
                type: 'string',
              },
            },
          },
          required: [
            'headline',
            'summary',
            'sentiment',
            'categories',
            'people',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['stories'],
    additionalProperties: false,
  },
  strict: true,
}

export const getNewspaper = async (item) => {
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Extract all stories in this newspaper. For each story respect the JSON format provided. Do not include the authors of the story in the people field.',
          },
          {
            type: 'input_image',
            image_url: item.images.large,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        ...storySchema,
      },
    },
  })
  // Validate response structure
  if (!response.output[0].content[0].text) {
    throw new Error('Invalid response structure from OpenAI API')
  }
  let parsedContent
  try {
    parsedContent = JSON.parse(response.output[0].content[0].text)
  } catch (parseError) {
    throw new Error(
      `Failed to parse OpenAI response as JSON: ${parseError.message}`,
    )
  }

  return {
    content: parsedContent,
    tokens: response.usage?.total_tokens || 0,
  }
}

const themePrompt =
  'what are the dominant themes/topics in the news today? provide stories for each such theme. Be concise in your answer and verify that you are not hallucinating by providing story ids'

const topStoriesPrompt =
  'what are the top stories that have been reported by multiple outlets? be concise in your answer and verify that you are not hallucinating by providing story ids'

// Helper function for exponential backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const executeWithExponentialBackoff = async (
  operation,
  maxRetries = 3,
  baseDelay = 1000,
) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()

      // Check if the run failed
      if (result && result.status === 'failed') {
        if (attempt === maxRetries) {
          const lastError = result.last_error || {}
          console.error(
            `Run failed after ${maxRetries + 1} attempts. Last error code: ${
              lastError.code || 'unknown'
            }, Last error message: ${lastError.message || 'unknown'}`,
          )
          return null
        }

        const delay = baseDelay * Math.pow(2, attempt)
        console.log(
          `Run failed (attempt ${attempt + 1}/${
            maxRetries + 1
          }), retrying in ${delay}ms...`,
        )
        await sleep(delay)
        continue
      }

      return result
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(
          `Operation failed after ${maxRetries + 1} attempts:`,
          error.message,
        )
        throw error
      }

      const delay = baseDelay * Math.pow(2, attempt)
      console.log(
        `Operation failed (attempt ${attempt + 1}/${
          maxRetries + 1
        }), retrying in ${delay}ms...`,
      )
      await sleep(delay)
    }
  }
}

export const getTopStories = async (type) => {
  const assistant = await client.beta.assistants.retrieve(
    'asst_4KOz4tPhcfqN78sSpwBnmdHP',
  )

  const thread = await client.beta.threads.create({
    messages: [
      {
        role: 'user',
        content: type === 'topstories' ? topStoriesPrompt : themePrompt,
      },
    ],
  })

  const run = await executeWithExponentialBackoff(async () => {
    return await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    })
  })

  if (run && run.status === 'completed') {
    const messages = await client.beta.threads.messages.list(thread.id)
    const responseMessage = messages.getPaginatedItems()[0]
    const { text } = responseMessage.content[0]
    return JSON.parse(text.value)
  }

  return null
}

const createNewVectorStore = async (name) => {
  const vectorStore = await client.vectorStores.create({
    name: name,
  })

  if (!vectorStore || !vectorStore.id) {
    throw new Error('Failed to create vector store: Invalid response')
  }

  console.log(`Created new vector store with ID: ${vectorStore.id}`)
  return vectorStore
}

const findOrCreateVectorStore = async (name) => {
  try {
    const query = await client.vectorStores.list()

    if (!query || !query.data) {
      throw new Error('Invalid response from vectorStores.list()')
    }

    // First try to find existing newsbot vector store
    const existingStore = query.data.find((store) => store.name === name)
    if (existingStore) {
      console.log(`Using existing vector store with ID: ${existingStore.id}`)
      return existingStore
    }

    // If no newsbot store exists, create one
    return await createNewVectorStore(name)
  } catch (error) {
    console.error('Error in findOrCreateVectorStore:', error.message)
    throw new Error(`Vector store operation failed: ${error.message}`)
  }
}

export const createVectorStore = async (name) => {
  try {
    const vectorStore = await findOrCreateVectorStore(name)
    return vectorStore.id
  } catch (error) {
    console.error('Error in createVectorStore:', error.message)
    throw new Error(`Vector store operation failed: ${error.message}`)
  }
}

export const deleteFilesFromVectorStore = async (vectorStoreId) => {
  const files = await client.vectorStores.files.list(vectorStoreId)
  for (const file of files.data) {
    await client.vectorStores.files.del(vectorStoreId, file.id)
    await client.files.del(file.id)
  }
}

export const deleteAllFiles = async () => {
  const files = await client.files.list()
  for (const file of files.data) {
    await client.files.del(file.id)
  }
}

export const addFileToVectorStore = async (vectorStoreId, content, date) => {
  try {
    console.log('Adding file to vector store:', vectorStoreId)
    const files = await client.vectorStores.files.list(vectorStoreId)
    console.log('Files in vector store:', files.data)
    // Check if a file with the same date already exists
    const existingFile = files.data.find((file) => file.filename.includes(date))
    if (existingFile) {
      console.log(`File for date ${date} already exists, skipping creation`)
      return existingFile.id
    }

    // Create new file with date in filename
    const file = await client.files.create({
      file: new File(
        [JSON.stringify(content)],
        `newspaper_stories_${date}.json`,
        {
          type: 'application/json',
        },
      ),
      purpose: 'assistants',
    })

    await client.vectorStores.files.createAndPoll(vectorStoreId, {
      file_id: file.id,
    })

    console.log(
      `Successfully created and added file 'newspaper_stories_${date}.json' to vector store ${vectorStoreId}`,
    )
    return file.id
  } catch (error) {
    if (error.response) {
      console.error('API Response:', error.response.data)
    }
    throw new Error(`Failed to add file to vector store: ${error.message}`)
  }
}
