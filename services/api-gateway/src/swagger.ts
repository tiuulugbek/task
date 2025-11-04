export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Acoustic Task Manager API',
    version: '1.0.0',
    description: 'Production-ready microservices-based Task Manager API',
  },
  servers: [
    {
      url: 'https://task.acoustic.uz/api',
      description: 'Production',
    },
  ],
  paths: {
    '/auth/telegram/verify': {
      post: {
        summary: 'Verify Telegram authentication',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  initData: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authentication successful' },
          '401': { description: 'Authentication failed' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user',
        responses: {
          '200': { description: 'User data' },
        },
      },
    },
    '/workspaces': {
      get: {
        summary: 'List workspaces',
        responses: {
          '200': { description: 'Workspace list' },
        },
      },
      post: {
        summary: 'Create workspace',
        responses: {
          '200': { description: 'Workspace created' },
        },
      },
    },
    '/projects': {
      get: {
        summary: 'List projects',
        responses: {
          '200': { description: 'Project list' },
        },
      },
      post: {
        summary: 'Create project',
        responses: {
          '200': { description: 'Project created' },
        },
      },
    },
    '/projects/{id}/board': {
      get: {
        summary: 'Get project board',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Board data' },
        },
      },
    },
    '/tasks': {
      get: {
        summary: 'List tasks',
        responses: {
          '200': { description: 'Task list' },
        },
      },
      post: {
        summary: 'Create task',
        responses: {
          '200': { description: 'Task created' },
        },
      },
    },
    '/tasks/search': {
      get: {
        summary: 'Search tasks',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'assigneeId', in: 'query', schema: { type: 'string' } },
          { name: 'labelId', in: 'query', schema: { type: 'string' } },
          { name: 'due', in: 'query', schema: { type: 'string', enum: ['overdue', 'today', 'week'] } },
        ],
        responses: {
          '200': { description: 'Search results' },
        },
      },
    },
    '/comments': {
      get: {
        summary: 'List comments',
        responses: {
          '200': { description: 'Comment list' },
        },
      },
      post: {
        summary: 'Create comment',
        responses: {
          '200': { description: 'Comment created' },
        },
      },
    },
    '/attachments': {
      post: {
        summary: 'Upload attachment',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  taskId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'File uploaded' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};
