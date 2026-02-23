import OpenAI from 'openai'
import { Matrix } from 'ml-matrix'
import hclustPkg from 'ml-hclust'
import kmeansPkg from 'ml-kmeans'
import distancePkg from 'ml-distance'

const { agnes } = hclustPkg // Changed from hclust to agnes
const { kmeans } = kmeansPkg
const cosine = distancePkg.similarity.cosine

class SimilarityService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.similarityThreshold = 0.75
  }

  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) return null

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.trim(),
      })
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      return null
    }
  }

  buildStoryText(item, type = 'story') {
    if (type === 'topstory') {
      // For TopStories, combine theme_headline and theme_summary
      const parts = [item.theme_headline, item.theme_summary].filter(Boolean)
      return parts.join(' ')
    } else {
      // For regular Stories, combine headline and summary
      const parts = [item.headline, item.summary].filter(Boolean)
      return parts.join(' ')
    }
  }

  async updateEmbedding(item, db, type = 'story') {
    const itemText = this.buildStoryText(item, type)
    const embedding = await this.generateEmbedding(itemText)

    if (embedding) {
      const vectorString = `[${embedding.join(',')}]`
      const tableName = type === 'topstory' ? 'top_stories' : 'Stories'
      const columnName =
        type === 'topstory' ? 'theme_embedding' : 'story_embedding'

      await db.sequelize.query(
        `UPDATE "${tableName}" SET ${columnName} = $1::vector WHERE id = $2`,
        {
          bind: [vectorString, item.id],
        },
      )
      return embedding
    }

    return null
  }

  async findSimilarItems(newItem, db, options = {}) {
    const {
      type = 'story', // 'story' or 'topstory' - indicates what type of input we have
      limit = null,
      threshold = this.similarityThreshold,
      timeWindow = 30,
      excludeItemId = null,
    } = options

    let newItemEmbedding
    const embeddingColumn =
      type === 'topstory' ? 'theme_embedding' : 'story_embedding'

    if (newItem[embeddingColumn]) {
      newItemEmbedding = newItem[embeddingColumn]
    } else {
      const itemText = this.buildStoryText(newItem, type)
      newItemEmbedding = await this.generateEmbedding(itemText)

      if (!newItemEmbedding) {
        console.warn(
          'Could not generate embedding for item:',
          type === 'topstory' ? newItem.theme_headline : newItem.headline,
        )
        return []
      }
    }

    // Always search in Stories table, regardless of input type
    const sqlQuery = `
      SELECT 
        s.id,
        s.headline,
        s.summary,
        s.sentiment,
        s.people,
        s."createdAt",
        f.date,
        n.name as newspaper_name,
        n.slug as newspaper_slug,
        n.city,
        n.state,
        1 - (s.story_embedding <=> $1) as similarity_score
      FROM "Stories" s
      JOIN "Frontpages" f ON s.frontpage_id = f.id
      JOIN "Newspapers" n ON f.newspaper_slug = n.slug
      WHERE s.story_embedding IS NOT NULL
        AND f.date >= $2
        AND 1 - (s.story_embedding <=> $1) >= $3
      ORDER BY s.story_embedding <=> $1
    `

    // Add LIMIT clause only if limit is specified
    const bindParams = [
      newItemEmbedding,
      new Date(Date.now() - timeWindow * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      threshold,
    ]

    if (limit !== null) {
      sqlQuery += ' LIMIT $4'
      bindParams.push(limit)
    }

    const similarStories = await db.sequelize.query(sqlQuery, {
      bind: bindParams,
      type: db.sequelize.QueryTypes.SELECT,
    })

    return similarStories
  }

  // Convenience methods for backward compatibility
  async updateStoryEmbedding(story, db) {
    return this.updateEmbedding(story, db, 'story')
  }

  // New methods for TopStories
  async updateTopStoryEmbedding(topStory, db) {
    return this.updateEmbedding(topStory, db, 'topstory')
  }

  // Simplified cosine similarity using ml-distance
  cosineSimilarity(vec1, vec2) {
    return cosine(vec1, vec2)
  }

  // Convert PostgreSQL vector to JavaScript array
  convertEmbeddingToArray(embedding) {
    if (!embedding) return null

    // If it's already an array, return it
    if (Array.isArray(embedding)) {
      return embedding
    }

    // If it's a string (PostgreSQL vector format), parse it
    if (typeof embedding === 'string') {
      // Remove brackets and split by commas
      const cleanString = embedding.replace(/[\[\]]/g, '')
      return cleanString.split(',').map(Number)
    }

    // If it's an object with values property (Sequelize vector format)
    if (embedding && typeof embedding === 'object' && embedding.values) {
      return embedding.values
    }

    console.warn('Unknown embedding format:', typeof embedding, embedding)
    return null
  }

  // Simplified similarity matrix using ml-matrix
  calculateSimilarityMatrix(stories) {
    const embeddings = stories.map((s) =>
      this.convertEmbeddingToArray(s.story_embedding),
    )

    // Filter out any null embeddings
    const validEmbeddings = embeddings.filter((emb) => emb !== null)

    if (validEmbeddings.length === 0) {
      return []
    }

    const matrix = new Matrix(validEmbeddings)

    // Calculate cosine similarity manually
    const similarityMatrix = []
    for (let i = 0; i < matrix.rows; i++) {
      similarityMatrix[i] = []
      for (let j = 0; j < matrix.rows; j++) {
        if (i === j) {
          similarityMatrix[i][j] = 1.0
        } else {
          const vec1 = matrix.getRow(i)
          const vec2 = matrix.getRow(j)
          const similarity = this.cosineSimilarity(vec1, vec2)
          similarityMatrix[i][j] = similarity

          // Debug: Log some similarity scores
          if (i === 0 && j < 5) {
            console.log(
              `Similarity between story 0 and ${j}: ${similarity.toFixed(3)}`,
            )
          }
        }
      }
    }

    return similarityMatrix
  }

  // Hierarchical clustering using ml-hclust
  hierarchicalClustering(stories, similarityMatrix, options) {
    const { similarityThreshold, minClusterSize } = options

    console.log(`Clustering with threshold: ${similarityThreshold}`)
    console.log(
      `Similarity matrix size: ${similarityMatrix.length}x${similarityMatrix[0].length}`,
    )

    // Convert similarity to distance matrix
    const distanceMatrix = similarityMatrix.map((row) =>
      row.map((sim) => 1 - sim),
    )

    // Perform clustering using agnes instead of hclust
    const tree = agnes(distanceMatrix, {
      method: 'average', // or 'ward', 'single', 'complete'
    })

    // Cut tree at threshold
    const clusterAssignments = tree.cut(1 - similarityThreshold)
    console.log(`Cluster assignments:`, clusterAssignments)
    console.log(`Number of unique clusters:`, new Set(clusterAssignments).size)

    // Group stories by cluster
    const clusters = {}
    clusterAssignments.forEach((clusterId, storyIndex) => {
      if (!clusters[clusterId]) {
        clusters[clusterId] = []
      }
      clusters[clusterId].push(stories[storyIndex])
    })

    // Filter by minimum size and format
    return Object.values(clusters)
      .filter((cluster) => cluster.length >= minClusterSize)
      .map((stories, index) => ({
        id: `cluster_${index}`,
        stories,
        size: stories.length,
        centroid: this.calculateCentroid(
          stories.map((s) => this.convertEmbeddingToArray(s.story_embedding)),
        ),
      }))
  }

  // K-means using ml-kmeans
  async kMeansClustering(stories, k = 5) {
    const embeddings = stories.map((s) =>
      this.convertEmbeddingToArray(s.story_embedding),
    )

    const result = kmeans(embeddings, k, {
      maxIterations: 100,
      tolerance: 1e-4,
      seed: 42,
    })

    // Group stories by cluster
    const clusters = {}
    result.clusters.forEach((clusterId, storyIndex) => {
      if (!clusters[clusterId]) {
        clusters[clusterId] = []
      }
      clusters[clusterId].push(stories[storyIndex])
    })

    return Object.values(clusters)
      .filter((cluster) => cluster.length > 0)
      .map((stories, index) => ({
        id: `cluster_${index}`,
        stories,
        size: stories.length,
        centroid: result.centroids[index],
      }))
  }

  // Simplified centroid calculation using ml-matrix
  calculateCentroid(embeddings) {
    if (!embeddings || embeddings.length === 0) return null

    const matrix = new Matrix(embeddings)
    return matrix.mean('column') // Returns number[] directly, no need for to1DArray()
  }

  // Main function to group similar stories
  async groupSimilarStories(db, options = {}) {
    const {
      date = null, // Will default to today in getStoriesWithEmbeddings
      similarityThreshold = 0.5,
      minClusterSize = 2,
      maxClusterSize = 10,
      clusteringMethod = 'hierarchical', // 'hierarchical' or 'kmeans'
      k = 5, // for k-means
    } = options

    // 1. Fetch all stories for the given date with embeddings
    const stories = await db.getStoriesWithEmbeddings(date)
    console.log(`Found ${stories.length} stories FOR CLUSTERING`)
    if (stories.length === 0) {
      return []
    }

    // 2. Perform clustering based on method
    let clusters
    if (clusteringMethod === 'kmeans') {
      clusters = await this.kMeansClustering(stories, k)
    } else {
      // Hierarchical clustering
      const similarityMatrix = this.calculateSimilarityMatrix(stories)
      clusters = this.hierarchicalClustering(stories, similarityMatrix, {
        similarityThreshold,
        minClusterSize,
        maxClusterSize,
      })
    }

    // 3. Format results with additional metadata
    return clusters.map((cluster, index) => ({
      clusterId: index + 1,
      size: cluster.size,
      stories: cluster.stories.map((story) => ({
        id: story.id,
        headline: story.headline,
        summary: story.summary,
        sentiment: story.sentiment,
        people: story.people,
        newspaper: {
          name: story.newspaper_name,
          slug: story.newspaper_slug,
          city: story.city,
          state: story.state,
        },
        createdAt: story.createdAt,
      })),
      // Calculate cluster theme (most representative headline)
      representativeHeadline: this.findRepresentativeHeadline(cluster.stories),
      // Calculate average similarity within cluster
      cohesion: this.calculateClusterCohesion(cluster.stories),
      // Get sentiment distribution
      sentimentDistribution: this.calculateSentimentDistribution(
        cluster.stories,
      ),
      // Get newspaper distribution
      newspaperDistribution: this.calculateNewspaperDistribution(
        cluster.stories,
      ),
    }))
  }

  // Find the most representative headline in a cluster
  findRepresentativeHeadline(stories) {
    if (stories.length === 1) {
      return stories[0].headline
    }

    // For simplicity, return the shortest headline (often more concise)
    return stories.reduce((shortest, current) =>
      current.headline.length < shortest.headline.length ? current : shortest,
    ).headline
  }

  // Calculate how cohesive a cluster is (average similarity within cluster)
  calculateClusterCohesion(stories) {
    if (stories.length <= 1) return 1.0

    let totalSimilarity = 0
    let pairCount = 0

    for (let i = 0; i < stories.length; i++) {
      for (let j = i + 1; j < stories.length; j++) {
        totalSimilarity += this.cosineSimilarity(
          this.convertEmbeddingToArray(stories[i].story_embedding),
          this.convertEmbeddingToArray(stories[j].story_embedding),
        )
        pairCount++
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 1.0
  }

  // Calculate sentiment distribution within a cluster
  calculateSentimentDistribution(stories) {
    const distribution = { positive: 0, neutral: 0, negative: 0 }

    stories.forEach((story) => {
      if (story.sentiment) {
        distribution[story.sentiment]++
      }
    })

    return distribution
  }

  // Calculate newspaper distribution within a cluster
  calculateNewspaperDistribution(stories) {
    const distribution = {}

    stories.forEach((story) => {
      const newspaper = story.newspaper_name
      distribution[newspaper] = (distribution[newspaper] || 0) + 1
    })

    return distribution
  }
}

export default SimilarityService
