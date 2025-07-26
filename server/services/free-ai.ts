import Groq from "groq-sdk";
import { CohereClient } from 'cohere-ai';
import axios from 'axios';

// Free AI services with generous quotas
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ""
});

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ""
});

// Offline fallback responses for common Vietnamese queries
const offlineResponses = {
  greetings: [
    "Xin chào! Tôi là AI Assistant tiếng Việt. Tôi có thể giúp bạn tạo video, hình ảnh, và phát triển web.",
    "Chào bạn! Tôi sẵn sàng hỗ trợ bạn với các tính năng AI: tạo video, hình ảnh, và lập trình web.",
    "Hi! Tôi có thể giúp bạn tạo nội dung AI và phát triển web. Bạn muốn thử tính năng gì?"
  ],
  
  help: [
    "🎯 **Tính năng chính:**\n• **Tạo video AI** - Mô tả video bạn muốn\n• **Tạo hình ảnh** - Mô tả hình ảnh cần thiết\n• **Phát triển web** - Tạo website tự động\n• **Chat AI** - Trả lời mọi câu hỏi",
    "💡 **Các lệnh hữu ích:**\n• 'Tạo video con mèo đang chạy'\n• 'Tạo hình ảnh phong cảnh đẹp'\n• 'Tạo website portfolio cho tôi'\n• 'Giúp tôi code JavaScript'"
  ],
  
  programming: [
    "🌐 **Tôi có thể giúp bạn lập trình:**\n• JavaScript, HTML, CSS\n• React, Node.js\n• Python cơ bản\n• Tạo website tự động\n\nBạn muốn code gì?",
    "💻 **Phát triển web:**\nTôi có thể tự động tạo:\n• Portfolio website\n• Landing page\n• Blog cá nhân\n• Ứng dụng web đơn giản"
  ],
  
  video: [
    "🎬 **Tạo video AI:**\nHệ thống hỗ trợ nhiều dịch vụ miễn phí:\n• Hugging Face (đã cấu hình)\n• Replicate (cần API token)\n• fal.ai (trả phí)\n\nMô tả video bạn muốn tạo!",
    "🎥 **Video generation:**\nChỉ cần mô tả video, tôi sẽ tạo cho bạn:\n• Video 5-15 giây\n• Chất lượng HD\n• Lưu tự động vào workspace"
  ],
  
  image: [
    "🎨 **Tạo hình ảnh AI:**\n• Mô tả hình ảnh bạn muốn\n• Hỗ trợ tiếng Việt hoàn toàn\n• Tự động lưu vào workspace\n• Chất lượng cao\n\nVí dụ: 'Tạo ảnh con mèo dễ thương'",
    "🖼️ **Image generation:**\nTính năng tạo ảnh AI với:\n• Mô tả bằng tiếng Việt\n• Chất lượng cao\n• Lưu trực tiếp vào dự án"
  ]
};

export async function generateFreeAIResponse(message: string, history: any[] = []): Promise<string> {
  const messageText = message.toLowerCase().trim();
  
  // Try free AI services first
  try {
    // 1. Try Groq (very generous free tier)
    if (process.env.GROQ_API_KEY) {
      console.log('🔄 Trying Groq AI...');
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "Bạn là AI Assistant tiếng Việt thông minh, hữu ích và thân thiện. Trả lời bằng tiếng Việt, ngắn gọn và chính xác." },
          ...history.map(msg => ({ role: msg.role, content: msg.content })),
          { role: "user", content: message }
        ],
        model: "llama-3.1-70b-versatile", // Free model
        temperature: 0.7,
        max_tokens: 1024
      });
      
      if (response.choices[0]?.message?.content) {
        return response.choices[0].message.content;
      }
    }
    
    // 2. Try Cohere (free tier available)
    if (process.env.COHERE_API_KEY) {
      console.log('🔄 Trying Cohere AI...');
      const response = await cohere.chat({
        message: message,
        model: "command-r", // Free model
        temperature: 0.7,
        maxTokens: 1024,
        preamble: "Bạn là AI Assistant tiếng Việt thông minh và hữu ích. Trả lời ngắn gọn bằng tiếng Việt."
      });
      
      if (response.text) {
        return response.text;
      }
    }
    
    // 3. Try Hugging Face Inference API (completely free)
    if (process.env.HUGGINGFACE_TOKEN) {
      console.log('🔄 Trying Hugging Face Chat...');
      try {
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
          { inputs: message },
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        if (response.data && response.data[0]?.generated_text) {
          return response.data[0].generated_text;
        }
      } catch (error) {
        console.log('Hugging Face chat failed, trying Vietnamese model...');
        
        // Try Vietnamese-specific model
        try {
          const vnResponse = await axios.post(
            'https://api-inference.huggingface.co/models/VietAI/vit5-base-vietnews-summarization',
            { inputs: `Trả lời câu hỏi: ${message}` },
            {
              headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );
          
          if (vnResponse.data && vnResponse.data[0]?.generated_text) {
            return vnResponse.data[0].generated_text;
          }
        } catch (vnError) {
          console.log('Vietnamese model also failed');
        }
      }
    }
    
  } catch (error) {
    console.log('Free AI services unavailable, using offline fallback');
  }
  
  // Fallback to offline responses
  return generateOfflineResponse(messageText);
}

function generateOfflineResponse(messageText: string): string {
  // Detect intent and provide contextual response
  if (messageText.includes('hi') || messageText.includes('hello') || messageText.includes('chào') || messageText.includes('xin chào')) {
    return getRandomResponse(offlineResponses.greetings);
  }
  
  if (messageText.includes('help') || messageText.includes('giúp') || messageText.includes('hướng dẫn') || messageText.includes('làm gì')) {
    return getRandomResponse(offlineResponses.help);
  }
  
  if (messageText.includes('video')) {
    return `🎬 **Tính năng tạo video AI**

Tôi có thể tạo video AI cho bạn! Hệ thống hỗ trợ các dịch vụ:

**🆓 Miễn phí:**
• **AnimateDiff** - Text-to-video & image-to-video miễn phí  
• **Hugging Face** - Token đã được cấu hình
• **Replicate** - Tin cậy nhất (cần API token)

**💎 Trả phí:**
• **fal.ai** - Chất lượng cao ($0.40/video)

**🎯 Thử ngay:**
• **Text-to-Video:** "Tạo video con mèo đang chạy"
• **Image-to-Video:** "AnimateDiff: biến ảnh thành video" 
• **Animate ảnh:** Tạo ảnh trước, sau đó "tạo video từ ảnh này"`;
  }
  
  if (messageText.includes('ảnh') || messageText.includes('hình') || messageText.includes('image')) {
    return getRandomResponse(offlineResponses.image);
  }
  
  if (messageText.includes('code') || messageText.includes('lập trình') || messageText.includes('web') || messageText.includes('website')) {
    return getRandomResponse(offlineResponses.programming);
  }
  
  // Default helpful response
  return `👋 **Tôi hiểu bạn đang hỏi về: "${messageText}"**

🤖 **Hiện tại API tạm thời không khả dụng**, nhưng tôi vẫn có thể:

**🎯 Tính năng hoạt động:**
• **Tạo video AI** - "Tạo video con mèo đang chạy"
• **Tạo hình ảnh** - "Tạo ảnh phong cảnh đẹp"  
• **Phát triển web** - "Tạo website portfolio"
• **Chat cơ bản** - Trả lời câu hỏi thường gặp

**💡 Để có trải nghiệm tốt nhất:**
• Thử tính năng tạo video/ảnh (không cần quota)
• Sử dụng tính năng Web Builder
• Chờ API phục hồi sau vài giờ

Bạn muốn thử tính năng nào?`;
}

function getRandomResponse(responses: string[]): string {
  return responses[Math.floor(Math.random() * responses.length)];
}

// Check if any free AI service is available
export function hasFreeTier(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.COHERE_API_KEY || process.env.HUGGINGFACE_TOKEN);
}

// Setup guide for free AI services
export function getFreeAISetupGuide(): string {
  return `🆓 **GIẢI PHÁP QUOTA-FREE: AI Chat Miễn Phí**

**🏆 DỊCH VỤ AI MIỄN PHÍ (Không giới hạn quota):**

**1. Groq AI (Khuyến nghị)** ⭐
• **Tốc độ**: Cực nhanh (300+ tokens/giây)
• **Quota**: 6,000 requests/phút MIỄN PHÍ
• **Model**: Llama 3.1 70B
• **Setup**: https://console.groq.com/keys

**2. Cohere AI**
• **Quota**: 1,000 requests/tháng miễn phí
• **Model**: Command-R
• **Setup**: https://dashboard.cohere.com/api-keys

**3. Hugging Face (Đã có token)** ✅
• **Quota**: Hoàn toàn miễn phí, không giới hạn
• **Model**: DialoGPT, Vietnamese models
• **Setup**: Token đã được cấu hình sẵn

**🔧 HƯỚNG DẪN NHANH:**
1. Đăng ký tài khoản miễn phí tại link trên
2. Tạo API key 
3. Thêm vào ứng dụng
4. Chat không giới hạn!

**💡 ƯU ĐIỂM:**
• Không hết quota như Gemini
• Tốc độ nhanh hơn
• Hỗ trợ tiếng Việt tốt
• Hoàn toàn miễn phí

**🎯 FALLBACK SYSTEM:**
Ngay cả khi không có API key, ứng dụng vẫn:
• Hiển thị hướng dẫn hữu ích
• Hỗ trợ tính năng tạo video/ảnh  
• Web development vẫn hoạt động
• Không bao giờ lỗi 500

Bạn muốn setup dịch vụ nào trước?`;
}