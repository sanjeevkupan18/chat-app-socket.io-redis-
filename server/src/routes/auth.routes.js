import express from 'express'
import protect from '../middleware/authMiddleware.js'
import { registerUser, loginUser, logoutUser } from '../controllers/auth.controller.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/logout', protect, logoutUser)


export default router
