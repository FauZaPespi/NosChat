import { Router } from 'express';
import {
  getConversations,
  getConversation,
  createConversation,
  getMessages,
  searchUsers
} from '../controllers/conversationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticate);

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/search', searchUsers);
router.get('/:conversationId', getConversation);
router.get('/:conversationId/messages', getMessages);

export default router;
