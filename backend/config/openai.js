/**
 * Azure OpenAI API Configuration
 * Sets up and exports the OpenAI client for use throughout the application
 */

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const config = require('./config');
const logger = require('../utils/logger');

// Extract Azure OpenAI configuration from central config
const { API_KEY, ENDPOINT, API_VERSION, DEPLOYMENT_NAME } = config.AZURE_OPENAI;

// Create Azure OpenAI client
let openaiClient;
try {
  openaiClient = new OpenAIClient(
    ENDPOINT,
    new AzureKeyCredential(API_KEY),
    { apiVersion: API_VERSION }
  );
  logger.info('Azure OpenAI client initialized successfully');
} catch (error) {
  logger.error(`Failed to initialize Azure OpenAI client: ${error.message}`);
  // Create a mock client for development if real client fails
  if (config.IS_DEVELOPMENT) {
    openaiClient = createMockOpenAIClient();
    logger.warn('Using mock OpenAI client for development');
  } else {
    throw error; // Re-throw in production
  }
}

/**
 * Creates a chat completion using the Azure OpenAI API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Additional options for the API call
 * @returns {Promise<Object>} - The API response
 */
async function createChatCompletion(messages, options = {}) {
  try {
    const defaultOptions = {
      temperature: 0.3,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      responseFormat: { type: "json_object" }
    };

    const response = await openaiClient.getChatCompletions(
      DEPLOYMENT_NAME,
      messages,
      { ...defaultOptions, ...options }
    );

    return response;
  } catch (error) {
    logger.error(`OpenAI API error: ${error.message}`);
    throw new Error(`Failed to get completion: ${error.message}`);
  }
}

/**
 * Creates a mock OpenAI client for development/testing
 * @returns {Object} - Mock OpenAI client
 */
function createMockOpenAIClient() {
  return {
    getChatCompletions: async (deploymentName, messages, options) => {
      logger.debug(`Mock OpenAI call to ${deploymentName}`);
      logger.debug(`Messages: ${JSON.stringify(messages)}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock response based on the system message
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      
      if (systemMessage.includes('analyze and rank news articles')) {
        return mockNewsAnalysisResponse();
      } else if (systemMessage.includes('trending topics')) {
        return mockTrendingTopicsResponse();
      } else {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                result: "This is a mock response from the OpenAI client",
                input: messages.map(m => m.content).join(' | ')
              })
            }
          }]
        };
      }
    }
  };
}

/**
 * Creates a mock response for news analysis requests
 * @returns {Object} - Mock response
 */
function mockNewsAnalysisResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          articles: [
            {
              relevanceScore: 85,
              explanation: "This is a high-impact global news story with significant implications.",
              tags: ["politics", "global", "economy"],
              isBreakingNews: true
            },
            {
              relevanceScore: 72,
              explanation: "Technology advancement with broad implications for the industry.",
              tags: ["technology", "innovation", "business"],
              isBreakingNews: false
            },
            {
              relevanceScore: 65,
              explanation: "Important scientific development with potential healthcare applications.",
              tags: ["science", "health", "research"],
              isBreakingNews: false
            }
          ]
        })
      }
    }]
  };
}

/**
 * Creates a mock response for trending topics requests
 * @returns {Object} - Mock response
 */
function mockTrendingTopicsResponse() {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          topics: [
            { topic: "Climate Change", count: 15 },
            { topic: "Artificial Intelligence", count: 12 },
            { topic: "Global Economy", count: 10 },
            { topic: "Healthcare Innovation", count: 8 },
            { topic: "Space Exploration", count: 7 }
          ]
        })
      }
    }]
  };
}

module.exports = {
  openaiClient,
  createChatCompletion,
  DEPLOYMENT_NAME
};
