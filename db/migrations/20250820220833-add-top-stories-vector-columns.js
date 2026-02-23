'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enable the vector extension
    await queryInterface.sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS vector;',
    )

    // Add vector column to Top Stories table using raw SQL
    await queryInterface.sequelize.query(`
      ALTER TABLE "top_stories" 
      ADD COLUMN theme_embedding vector(1536) NULL;
    `)

    // Create index for fast similarity search
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS top_stories_theme_embedding_idx 
      ON "top_stories" USING ivfflat (theme_embedding vector_cosine_ops)
      WITH (lists = 100);
    `)
  },

  async down(queryInterface, Sequelize) {
    // Remove the vector column
    await queryInterface.sequelize.query(`
      ALTER TABLE "top_stories" 
      DROP COLUMN theme_embedding;
    `)
  },
}
