# NosChat - Modern Messaging Application

NosChat is a modern, real-time messaging application built with Node.js, React, WebSocket, and gRPC. It features a sleek dark UI and supports instant messaging and video/audio calls.

## Features

- **Real-time Messaging**: Instant message delivery using WebSocket
- **User Authentication**: Secure JWT-based authentication
- **Direct & Group Conversations**: Support for both one-on-one and group chats
- **Audio/Video Calls**: gRPC-based call system with WebRTC signaling
- **Modern Dark UI**: Sleek, responsive design with Tailwind CSS
- **Typing Indicators**: Real-time typing status
- **Message Status**: Sent, delivered, and read indicators
- **User Search**: Find and connect with other users
- **Online Status**: Real-time user presence tracking

## Tech Stack

### Backend
- **Node.js & TypeScript**: Core runtime and language
- **Express**: REST API framework
- **Socket.IO**: WebSocket communication
- **gRPC**: High-performance call system
- **MongoDB**: NoSQL database
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **Winston**: Logging

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Zustand**: State management
- **Axios**: HTTP client
- **Socket.IO Client**: WebSocket client

### Infrastructure
- **Docker & Docker Compose**: Containerization
- **Nginx**: Reverse proxy and SSL termination
- **MongoDB**: Database

## Project Structure

```
NosChat/
├── backend/                 # Backend Node.js application
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── grpc/          # gRPC service implementation
│   │   └── index.ts       # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # State management
│   │   ├── services/      # API & Socket services
│   │   └── styles/        # CSS styles
│   ├── Dockerfile
│   └── package.json
├── shared/                # Shared types and proto files
│   ├── proto/            # gRPC proto definitions
│   └── types/            # TypeScript type definitions
├── nginx/                # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- MongoDB 7 or higher
- Docker & Docker Compose (for containerized deployment)

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd NosChat
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

3. **Set up environment variables**

Backend (.env):
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

Frontend (.env):
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name noschat-mongo mongo:7

# Or use your local MongoDB installation
```

5. **Run the development servers**

In separate terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- gRPC Server: localhost:50051

### Docker Deployment

1. **Build and start all services**
```bash
docker-compose up -d
```

2. **View logs**
```bash
docker-compose logs -f
```

3. **Stop services**
```bash
docker-compose down
```

## Production Deployment

### Domain Configuration

The application is configured for the domain `chat.nos-project.pro`.

1. **Update DNS records**
   - Point your domain to your server IP
   - Set up A records for chat.nos-project.pro

2. **SSL Certificates**

Option 1 - Let's Encrypt:
```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d chat.nos-project.pro

# Copy certificates
sudo cp /etc/letsencrypt/live/chat.nos-project.pro/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/chat.nos-project.pro/privkey.pem nginx/ssl/
```

Option 2 - Manual certificates:
- Place your SSL certificate as `nginx/ssl/fullchain.pem`
- Place your private key as `nginx/ssl/privkey.pem`

3. **Environment Variables**

Create a `.env` file in the root directory:
```bash
JWT_SECRET=your-secure-random-secret-key-here
```

4. **Deploy**
```bash
docker-compose -f docker-compose.yml up -d
```

## API Documentation

### Authentication

**Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Conversations

**Get All Conversations**
```http
GET /api/conversations
Authorization: Bearer <token>
```

**Create Conversation**
```http
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "participantIds": ["userId1", "userId2"],
  "type": "direct"
}
```

**Get Messages**
```http
GET /api/conversations/:conversationId/messages?limit=50&offset=0
Authorization: Bearer <token>
```

**Search Users**
```http
GET /api/conversations/search?query=john
Authorization: Bearer <token>
```

## WebSocket Events

### Client → Server

- `send_message`: Send a new message
- `typing_start`: User started typing
- `typing_stop`: User stopped typing
- `message_read`: Mark message as read
- `join_conversation`: Join a conversation room
- `leave_conversation`: Leave a conversation room

### Server → Client

- `new_message`: New message received
- `message_sent`: Message sent confirmation
- `user_typing`: User typing status
- `user_status_changed`: User online/offline status
- `message_delivered`: Message delivered
- `message_read`: Message read by recipient

## gRPC Services

### Call Service

- `InitiateCall`: Start a new call
- `AcceptCall`: Accept an incoming call
- `RejectCall`: Reject an incoming call
- `EndCall`: End an active call
- `SignalingStream`: Bidirectional streaming for WebRTC signaling

## Development

### Code Structure

- Follow TypeScript best practices
- Use functional components in React
- Implement proper error handling
- Write clean, documented code

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

**Backend**
```bash
cd backend
npm run build
```

**Frontend**
```bash
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- All passwords are hashed using bcrypt
- JWT tokens for secure authentication
- CORS protection enabled
- Rate limiting recommended for production
- SQL injection protection via MongoDB
- XSS protection via React

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Socket.IO for real-time communication
- gRPC for high-performance RPC
- React team for the amazing UI library
- Tailwind CSS for the styling framework
