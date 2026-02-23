'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable the vector extension
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS vector;',
    )

    // Add vector column to Stories table using raw SQL
    await queryInterface.sequelize.query(`
      ALTER TABLE "Stories" 
      ADD COLUMN story_embedding vector(1536) NULL;
    `)

    // Create index for fast similarity search
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS stories_story_embedding_idx 
      ON "Stories" USING ivfflat (story_embedding vector_cosine_ops)
      WITH (lists = 100);
    `)
  },

  async down(queryInterface, Sequelize) {
    // Remove the vector column
    await queryInterface.sequelize.query(`
      ALTER TABLE "Stories" 
      DROP COLUMN story_embedding;
    `)
  },
}
