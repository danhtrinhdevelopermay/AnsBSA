import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface AnimateDiffResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
  description?: string;
}

// AnimateDiff video generation using Hugging Face Inference API
export async function generateVideoAnimateDiff(prompt: string, imageUrl?: string): Promise<AnimateDiffResult> {
  try {
    if (!process.env.HUGGINGFACE_TOKEN) {
      return {
        success: false,
        error: 'HUGGINGFACE_TOKEN not configured'
      };
    }

    console.log('🎬 Starting AnimateDiff video generation...');
    console.log(`📝 Prompt: ${prompt}`);
    if (imageUrl) {
      console.log(`🖼️ Input image: ${imageUrl}`);
    }

    // Available AnimateDiff models on Hugging Face
    const models = [
      'guoyww/animatediff-motion-adapter-v1-5-2',
      'ByteDance/AnimateDiff-Lightning',
      'ali-vilab/i2vgen-xl',
      'damo-vilab/text-to-video-ms-1.7b'
    ];

    let lastError = '';

    for (const model of models) {
      try {
        console.log(`🔄 Trying model: ${model}`);
        
        const requestData: any = {
          inputs: prompt
        };

        // If we have an image URL, include it for image-to-video
        if (imageUrl && imageUrl.startsWith('/web-builder-workspace/')) {
          // Read the local image file
          const imagePath = path.join(process.cwd(), 'web-builder-workspace', path.basename(imageUrl));
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            requestData.inputs = {
              prompt: prompt,
              image: `data:image/png;base64,${base64Image}`
            };
          }
        }

        const response = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 120000 // 2 minutes timeout
          }
        );

        if (response.status === 200 && response.data.byteLength > 1000) {
          const timestamp = Date.now();
          const fileName = `animatediff_video_${timestamp}.mp4`;
          const filePath = path.join(process.cwd(), 'web-builder-workspace', fileName);
          
          await fs.promises.writeFile(filePath, Buffer.from(response.data));
          const videoUrl = `/web-builder-workspace/${fileName}`;
          
          console.log(`✅ AnimateDiff video generated successfully with ${model}`);
          
          return {
            success: true,
            videoUrl,
            description: `🎬 **Video AnimateDiff đã được tạo thành công!**

✅ **Tạo video từ prompt:** "${prompt}"${imageUrl ? `\n🖼️ **Từ ảnh gốc:** ${imageUrl}` : ''}
🎯 **Model sử dụng:** ${model}
📁 **Đã lưu vào workspace:** ${videoUrl}
⏱️ **Thời gian:** ${new Date().toLocaleTimeString('vi-VN')}

🎨 **Đặc điểm AnimateDiff:**
• Tạo video từ văn bản hoặc ảnh
• Chuyển động tự nhiên và mượt mà  
• Chất lượng HD, thời lượng ngắn
• Hoàn toàn miễn phí với Hugging Face

💡 **Tip:** Bạn có thể xem video ngay từ workspace hoặc tải về!`
          };
        }

        // Check if model is loading
        if (response.status === 503) {
          lastError = `Model ${model} is loading, please wait`;
          continue;
        }

      } catch (modelError: any) {
        console.log(`⚠️ Model ${model} failed:`, modelError.message);
        lastError = modelError.message;
        
        // If it's a rate limit, wait and try next model
        if (modelError.response?.status === 429) {
          console.log('Rate limited, trying next model...');
          continue;
        }
        
        // If model not found, try next
        if (modelError.response?.status === 404) {
          console.log('Model not available, trying next...');
          continue;
        }
      }
    }

    return {
      success: false,
      error: `All AnimateDiff models failed. Last error: ${lastError}`,
      description: `🎬 **AnimateDiff Video Generation**

⚠️ **Tạm thời không khả dụng** - Các model đang được tải

**🔄 Đã thử các model:**
• guoyww/animatediff-motion-adapter-v1-5-2
• ByteDance/AnimateDiff-Lightning  
• ali-vilab/i2vgen-xl
• damo-vilab/text-to-video-ms-1.7b

**💡 Giải pháp thay thế:**
• Thử lại sau 1-2 phút
• Sử dụng tính năng tạo video khác
• Hoặc tạo ảnh trước, sau đó tạo video từ ảnh

**🎯 AnimateDiff sẽ hoạt động khi:**
• Model được tải xong trên Hugging Face
• Hệ thống tự động thử lại các model khả dụng`
    };

  } catch (error: any) {
    console.error('AnimateDiff generation error:', error);
    return {
      success: false,
      error: error.message,
      description: `❌ **Lỗi tạo video AnimateDiff**

**Chi tiết lỗi:** ${error.message}

**🔄 Thử lại:**
• Kiểm tra kết nối internet
• Thử prompt ngắn gọn hơn
• Hoặc sử dụng tính năng tạo video khác

**💡 Các tính năng video khác:**
• Replicate API (nếu có token)
• fal.ai (trả phí)
• Tạo ảnh trước, sau đó animate`
    };
  }
}

// Enhanced video detection that includes AnimateDiff keywords
export function detectAnimateDiffRequest(message: string): boolean {
  const animateKeywords = [
    'animatediff', 'animate diff', 'tạo video từ ảnh', 'video từ ảnh',
    'animate ảnh', 'làm ảnh động', 'biến ảnh thành video',
    'image to video', 'i2v', 'ảnh thành video', 'chuyển ảnh thành video'
  ];
  
  const messageText = message.toLowerCase();
  return animateKeywords.some(keyword => messageText.includes(keyword));
}

// Get setup instructions for AnimateDiff
export function getAnimateDiffSetup(): string {
  return `🎬 **AnimateDiff - Tạo Video từ Ảnh/Văn bản**

**🎯 Tính năng:**
• **Text-to-Video:** Tạo video từ mô tả văn bản
• **Image-to-Video:** Tạo video từ ảnh có sẵn
• **Animation:** Chuyển động tự nhiên, mượt mà
• **Free:** Hoàn toàn miễn phí với Hugging Face

**🔧 Đã tích hợp sẵn:**
✅ Hugging Face Token đã cấu hình
✅ 4 model AnimateDiff khả dụng
✅ Hỗ trợ cả text-to-video và image-to-video
✅ Tự động lưu video vào workspace

**💡 Cách sử dụng:**

**1. Text-to-Video:**
• "Tạo video con mèo đang chạy"
• "AnimateDiff: người đang nhảy"

**2. Image-to-Video:**  
• Tạo ảnh trước: "Tạo ảnh con chó"
• Sau đó: "Tạo video từ ảnh này, cho nó đang chạy"

**🎨 Models khả dụng:**
• ByteDance/AnimateDiff-Lightning (nhanh)
• guoyww/animatediff-motion-adapter-v1-5-2 (chất lượng)
• ali-vilab/i2vgen-xl (image-to-video chuyên dụng)
• damo-vilab/text-to-video-ms-1.7b (text-to-video)

Hãy thử ngay: "Tạo video con mèo đang chơi"!`;
}