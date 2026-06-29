import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Explainer API',
      version: '1.0.0',
      description: 'Backend API for Explainer application',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            name: {
              type: 'string',
              description: 'User name',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'premium'],
              description: 'User role',
            },
            subscription: {
              type: 'object',
              properties: {
                plan: {
                  type: 'string',
                  enum: ['free', 'basic', 'pro', 'enterprise'],
                },
                status: {
                  type: 'string',
                  enum: ['active', 'cancelled', 'expired'],
                },
              },
            },
            usage: {
              type: 'object',
              properties: {
                videosGenerated: { type: 'number' },
                storageUsed: { type: 'number' },
                monthlyVideoLimit: { type: 'number' },
                monthlyStorageLimit: { type: 'number' },
              },
            },
            preferences: {
              type: 'object',
              properties: {
                theme: { type: 'string', enum: ['light', 'dark'] },
                language: { type: 'string' },
                notifications: { type: 'boolean' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              description: 'Success message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
