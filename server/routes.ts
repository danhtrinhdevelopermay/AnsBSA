import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { insertChatSchema, insertMessageSchema } from "@shared/schema";
import { createFileSchema, updateFileSchema, executeCommandSchema } from "@shared/web-builder-schema";
import { generateChatResponse } from "./services/ai";
import { WebBuilderService } from "./services/web-builder";
import { 
  updateKnowledgeFromSources, 
  searchKnowledge, 
  getKnowledgeStats 
} from "./services/learning";
import { scrapeAndAnalyzeWebsite, formatWebAnalysisResult } from "./services/web-scraper";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all chats
  app.get("/api/chats", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      const chats = await storage.getUserChats(userId as string);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Không thể tải danh sách cuộc trò chuyện" });
    }
  });

  // Create new chat
  app.post("/api/chats", async (req, res) => {
    try {
      const validatedData = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(validatedData);
      res.json(chat);
    } catch (error) {
      res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
  });

  // Get chat messages
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const messages = await storage.getChatMessages(chatId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Không thể tải tin nhắn" });
    }
  });

  // Send message and get AI response
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        chatId
      });

      // Save user message
      const userMessage = await storage.createMessage(validatedData);
      
      // Get chat history for context
      const chatHistory = await storage.getChatMessages(chatId);
      
      // Generate AI response
      const aiResponse = await generateChatResponse(
        chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments
        }))
      );

      // Save AI response
      const assistantMessage = await storage.createMessage({
        chatId,
        userId: validatedData.userId,
        role: "assistant",
        content: aiResponse
      });

      // Update chat title if this is the first user message
      const userMessages = chatHistory.filter(msg => msg.role === "user");
      if (userMessages.length === 1) {
        // Simple title generation
        const title = validatedData.content.length > 50 
          ? validatedData.content.substring(0, 47) + "..."
          : validatedData.content;
        await storage.updateChatTitle(chatId, title);
      }

      res.json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error("Message error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Không thể gửi tin nhắn" });
    }
  });

  // Web Builder API endpoints
  
  // Create file
  app.post("/api/web-builder/files", async (req, res) => {
    try {
      const { name, content } = createFileSchema.parse(req.body);
      const result = await WebBuilderService.createFile(name, content);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }
  });

  // Update file
  app.put("/api/web-builder/files/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const { content } = updateFileSchema.parse(req.body);
      const result = await WebBuilderService.updateFile(fileName, content);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }
  });

  // Delete file
  app.delete("/api/web-builder/files/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const result = await WebBuilderService.deleteFile(fileName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  });

  // Read file
  app.get("/api/web-builder/files/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const result = await WebBuilderService.readFile(fileName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  });

  // List files
  app.get("/api/web-builder/files", async (req, res) => {
    try {
      const result = await WebBuilderService.listFiles();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  });

  // Create folder
  app.post("/api/web-builder/folders", async (req, res) => {
    try {
      const { name } = req.body;
      const result = await WebBuilderService.createFolder(name);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }
  });

  // Execute command
  app.post("/api/web-builder/execute", async (req, res) => {
    try {
      const { command } = executeCommandSchema.parse(req.body);
      const result = await WebBuilderService.executeCommand(command);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }
  });

  // Start dev server
  app.post("/api/web-builder/start-server", async (req, res) => {
    try {
      const result = await WebBuilderService.startDevServer();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  });

  // Website analysis API endpoint
  app.post("/api/analyze-website", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "URL không hợp lệ" 
        });
      }

      console.log(`🌐 Analyzing website: ${url}`);
      const result = await scrapeAndAnalyzeWebsite(url);
      
      res.json(result);
    } catch (error) {
      console.error("Website analysis API error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi phân tích website" 
      });
    }
  });

  // Learning API endpoints
  
  // Get knowledge statistics
  app.get("/api/learning/stats", async (req, res) => {
    try {
      const stats = getKnowledgeStats();
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error("Knowledge stats error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi lấy thống kê kiến thức" 
      });
    }
  });

  // Search knowledge
  app.get("/api/learning/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Query không hợp lệ" 
        });
      }

      const results = searchKnowledge(q);
      res.json({
        success: true,
        query: q,
        results
      });
    } catch (error) {
      console.error("Knowledge search error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi tìm kiếm kiến thức" 
      });
    }
  });

  // Manual knowledge update
  app.post("/api/learning/update", async (req, res) => {
    try {
      console.log('🧠 Manual knowledge update requested');
      await updateKnowledgeFromSources();
      
      const stats = getKnowledgeStats();
      res.json({
        success: true,
        message: "Đã cập nhật kiến thức thành công",
        stats
      });
    } catch (error) {
      console.error("Knowledge update error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi cập nhật kiến thức" 
      });
    }
  });

  // Admin API endpoints for Gemini multi-API management
  app.get("/api/admin/gemini/status", async (req, res) => {
    try {
      const { getGeminiStatusSummary, getQuotaWarning, geminiManager } = await import("./services/gemini-manager");
      const status = getGeminiStatusSummary();
      const quotaWarning = getQuotaWarning();
      const apis = geminiManager.getAllAPIs();
      
      res.json({
        status,
        quotaWarning,
        apis: apis.map(api => ({
          id: api.id,
          name: api.name,
          priority: api.priority,
          status: api.status,
          requestCount: api.requestCount,
          failureCount: api.failureCount,
          lastUsed: api.lastUsed,
          lastError: api.lastError,
          quotaUsage: api.quotaUsage
        }))
      });
    } catch (error) {
      console.error("Error getting Gemini status:", error);
      res.status(500).json({ message: "Không thể lấy trạng thái API" });
    }
  });

  app.post("/api/admin/gemini/add", async (req, res) => {
    try {
      const { geminiManager } = await import("./services/gemini-manager");
      const { key, name, priority } = req.body;
      
      if (!key || !name) {
        return res.status(400).json({ message: "API key và tên là bắt buộc" });
      }

      const newConfig = {
        id: `api_${Date.now()}`,
        key: key.trim(),
        priority: priority || 99,
        name: name.trim(),
        status: 'active' as const,
        lastUsed: null,
        requestCount: 0,
        failureCount: 0,
        lastError: null,
        maxRequestsPerMinute: 60,
        quotaUsage: {
          requests: 0,
          tokens: 0,
          images: 0,
          videos: 0,
          resetTime: new Date()
        }
      };

      geminiManager.addAPI(newConfig);
      
      res.json({ 
        message: `✅ Đã thêm API ${name} thành công`,
        api: {
          id: newConfig.id,
          name: newConfig.name,
          priority: newConfig.priority,
          status: newConfig.status
        }
      });
    } catch (error) {
      console.error("Error adding Gemini API:", error);
      res.status(500).json({ message: "Không thể thêm API mới" });
    }
  });

  // Get current user info (for refreshing credits)
  app.get('/api/auth/user', async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }
      
      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          credits: user.credits,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('❌ Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Authentication routes
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken } = req.body;
      
      // Use static import at top of file instead
      if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
      }
      
      // Development mode authentication bypass
      const userEmail = 'danhtrinh.ofct@gmail.com';
      const firebaseUid = 'dev-user-001';
      
      // Find or create user in database
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        user = await storage.createUser({
          email: userEmail,
          firebaseUid: firebaseUid,
          username: 'danhtrinh.ofct',
        });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          credits: user.credits,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('❌ Firebase login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/firebase-register', async (req, res) => {
    try {
      const { idToken, email, firebaseUid } = req.body;
      
      if (!idToken || !email) {
        return res.status(400).json({ error: 'ID token and email are required' });
      }
      
      // Development mode registration - check if user exists first
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      if (user) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Create new user in database
      user = await storage.createUser({
        email,
        firebaseUid,
        username: email.split('@')[0],
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          credits: user.credits,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('❌ Firebase register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Admin routes for user management
  app.get('/api/admin/users', async (req, res) => {
    try {
      const { users } = await import('@shared/schema');
      const allUsers = await db.select().from(users).orderBy(users.createdAt);
      
      res.json({
        success: true,
        users: allUsers.map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          credits: user.credits,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        }))
      });
    } catch (error) {
      console.error('❌ Admin users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put('/api/admin/users/:userId/credits', async (req, res) => {
    try {
      const { userId } = req.params;
      const { credits } = req.body;
      const { creditManager } = await import('./services/credit-manager.js');
      
      const result = await creditManager.setCredits(
        userId, 
        credits, 
        `Admin credit adjustment to ${credits}`
      );
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          newBalance: result.newBalance
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('❌ Admin credit update error:', error);
      res.status(500).json({ error: 'Failed to update credits' });
    }
  });

  app.get('/api/admin/users/:userId/transactions', async (req, res) => {
    try {
      const { userId } = req.params;
      const { creditManager } = await import('./services/credit-manager.js');
      
      const transactions = await creditManager.getCreditHistory(userId, 50);
      
      res.json({
        success: true,
        transactions
      });
    } catch (error) {
      console.error('❌ Admin transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.put('/api/admin/users/:userId/status', async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      await storage.updateUser(userId, { isActive });
      
      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('❌ Admin status update error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  // Quota analytics endpoint - chi tiết phân tích sử dụng quota
  app.get('/api/quota-analytics', async (req, res) => {
    try {
      const { quotaAnalytics } = await import('./services/quota-analytics.js');
      const report = quotaAnalytics.getQuotaReport();
      res.json(report);
    } catch (error) {
      console.error('❌ Quota analytics error:', error);
      res.status(500).json({ error: 'Failed to get quota analytics' });
    }
  });

  // Quota optimization endpoints
  app.get("/api/quota/status", async (req, res) => {
    try {
      const { getGeminiStatusSummary } = await import("./services/gemini-manager");
      const { getCacheStats } = await import("./services/quota-optimizer");
      
      const status = getGeminiStatusSummary();
      const cacheStats = getCacheStats();
      
      res.json({
        success: true,
        quota: status,
        cache: cacheStats,
        tips: [
          "💡 Sử dụng cache để tránh gọi API lặp lại",
          "💡 Hạn chế tạo ảnh/video khi không cần thiết", 
          "💡 DeepSearch tiết kiệm quota hơn khi hỏi thông tin thời sự",
          "💡 Chia câu hỏi dài thành câu ngắn để tối ưu"
        ]
      });
    } catch (error) {
      console.error("Error getting quota status:", error);
      res.status(500).json({ success: false, message: "Không thể lấy trạng thái quota" });
    }
  });

  app.post("/api/quota/optimize", async (req, res) => {
    try {
      const { cleanupExpiredCache } = await import("./services/quota-optimizer");
      const removed = cleanupExpiredCache();
      
      res.json({
        success: true,
        message: `✅ Đã dọn dẹp ${removed} cache entries hết hạn`,
        optimization: "Cache đã được tối ưu để tiết kiệm bộ nhớ"
      });
    } catch (error) {
      console.error("Error optimizing quota:", error);
      res.status(500).json({ success: false, message: "Không thể tối ưu quota" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
