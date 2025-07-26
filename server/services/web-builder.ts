import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Web Builder workspace directory
const WORKSPACE_DIR = path.join(process.cwd(), 'web-builder-workspace');

// Ensure workspace directory exists
async function ensureWorkspaceDir() {
  try {
    await fs.access(WORKSPACE_DIR);
  } catch {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  }
}

export class WebBuilderService {
  
  /**
   * Tạo project web nâng cao từ yêu cầu AI
   */
  async createAdvancedProjectFromAI(request: string): Promise<{
    analysis: string;
    type: string;
    files: Array<{ name: string; description: string; content: string }>;
    features: string[];
  }> {
    console.log('🤖 Creating advanced web project from AI request...');
    
    // Phân tích yêu cầu để xác định loại project
    const projectType = this.detectProjectType(request);
    const features = this.extractFeatures(request);
    
    // Tạo cấu trúc project hoàn chỉnh
    const projectFiles = await this.generateProjectStructure(request, projectType, features);
    
    // Tạo tất cả file trong workspace
    for (const file of projectFiles) {
      await WebBuilderService.createFile(file.name, file.content);
    }
    
    // Tự động setup package.json và dependencies nếu cần
    if (projectType.includes('node') || projectType.includes('react') || projectType.includes('backend')) {
      await this.setupNodeProject(projectType, features);
    }
    
    // Tự động chạy các lệnh setup cần thiết
    await this.autoSetupProject(projectType, features);
    
    return {
      analysis: this.generateProjectAnalysis(request, projectType, features),
      type: projectType,
      files: projectFiles.map(f => ({ 
        name: f.name, 
        description: f.description,
        content: f.content 
      })),
      features: features
    };
  }
  
  /**
   * Phát hiện loại project từ yêu cầu
   */
  private detectProjectType(request: string): string {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('portfolio') || lowerRequest.includes('hồ sơ')) return 'portfolio';
    if (lowerRequest.includes('blog') || lowerRequest.includes('tin tức')) return 'blog';
    if (lowerRequest.includes('ecommerce') || lowerRequest.includes('bán hàng') || lowerRequest.includes('shop')) return 'ecommerce';
    if (lowerRequest.includes('dashboard') || lowerRequest.includes('admin')) return 'dashboard';
    if (lowerRequest.includes('landing') || lowerRequest.includes('giới thiệu')) return 'landing';
    if (lowerRequest.includes('react') || lowerRequest.includes('vue') || lowerRequest.includes('angular')) return 'spa';
    if (lowerRequest.includes('api') || lowerRequest.includes('backend') || lowerRequest.includes('server')) return 'backend';
    if (lowerRequest.includes('database') || lowerRequest.includes('cơ sở dữ liệu')) return 'fullstack';
    
    return 'website';
  }
  
  /**
   * Trích xuất features từ yêu cầu
   */
  private extractFeatures(request: string): string[] {
    const features: string[] = [];
    const lowerRequest = request.toLowerCase();
    
    // Frontend features
    if (lowerRequest.includes('responsive') || lowerRequest.includes('mobile')) features.push('📱 Responsive Design');
    if (lowerRequest.includes('animation') || lowerRequest.includes('hiệu ứng')) features.push('✨ Animations & Effects');
    if (lowerRequest.includes('dark mode') || lowerRequest.includes('chế độ tối')) features.push('🌙 Dark Mode');
    if (lowerRequest.includes('search') || lowerRequest.includes('tìm kiếm')) features.push('🔍 Search Functionality');
    if (lowerRequest.includes('contact') || lowerRequest.includes('liên hệ')) features.push('📧 Contact Form');
    if (lowerRequest.includes('gallery') || lowerRequest.includes('hình ảnh')) features.push('🖼️ Image Gallery');
    
    // Backend features
    if (lowerRequest.includes('auth') || lowerRequest.includes('đăng nhập')) features.push('🔐 Authentication System');
    if (lowerRequest.includes('database') || lowerRequest.includes('cơ sở dữ liệu')) features.push('🗄️ Database Integration');
    if (lowerRequest.includes('api') || lowerRequest.includes('rest')) features.push('🔌 REST API');
    if (lowerRequest.includes('upload') || lowerRequest.includes('tải lên')) features.push('📤 File Upload');
    if (lowerRequest.includes('payment') || lowerRequest.includes('thanh toán')) features.push('💳 Payment Integration');
    
    // Advanced features
    if (lowerRequest.includes('chart') || lowerRequest.includes('biểu đồ')) features.push('📊 Data Visualization');
    if (lowerRequest.includes('real-time') || lowerRequest.includes('thời gian thực')) features.push('⚡ Real-time Updates');
    if (lowerRequest.includes('pwa') || lowerRequest.includes('offline')) features.push('📲 Progressive Web App');
    
    if (features.length === 0) {
      features.push('🌐 Modern Web Design', '⚡ Fast Loading', '📱 Mobile Friendly');
    }
    
    return features;
  }

  static async createFile(fileName: string, content: string): Promise<{ success: boolean; message: string }> {
    try {
      await ensureWorkspaceDir();
      const filePath = path.join(WORKSPACE_DIR, fileName);
      
      // Ensure directory exists for nested files
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true, message: `Đã tạo file ${fileName} thành công` };
    } catch (error) {
      return { success: false, message: `Lỗi khi tạo file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async updateFile(fileName: string, content: string): Promise<{ success: boolean; message: string }> {
    try {
      await ensureWorkspaceDir();
      const filePath = path.join(WORKSPACE_DIR, fileName);
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true, message: `Đã cập nhật file ${fileName} thành công` };
    } catch (error) {
      return { success: false, message: `Lỗi khi cập nhật file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async deleteFile(fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      const filePath = path.join(WORKSPACE_DIR, fileName);
      await fs.unlink(filePath);
      return { success: true, message: `Đã xóa file ${fileName} thành công` };
    } catch (error) {
      return { success: false, message: `Lỗi khi xóa file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async createFolder(folderName: string): Promise<{ success: boolean; message: string }> {
    try {
      await ensureWorkspaceDir();
      const folderPath = path.join(WORKSPACE_DIR, folderName);
      await fs.mkdir(folderPath, { recursive: true });
      return { success: true, message: `Đã tạo thư mục ${folderName} thành công` };
    } catch (error) {
      return { success: false, message: `Lỗi khi tạo thư mục: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async readFile(fileName: string): Promise<{ success: boolean; content?: string; message: string }> {
    try {
      const filePath = path.join(WORKSPACE_DIR, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content, message: `Đã đọc file ${fileName} thành công` };
    } catch (error) {
      return { success: false, message: `Lỗi khi đọc file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async listFiles(): Promise<{ success: boolean; files?: string[]; message: string }> {
    try {
      await ensureWorkspaceDir();
      
      const readDir = async (dir: string, relativePath = ''): Promise<string[]> => {
        const items = await fs.readdir(dir);
        const files: string[] = [];
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const itemRelativePath = path.join(relativePath, item);
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            files.push(`${itemRelativePath}/`);
            const subFiles = await readDir(fullPath, itemRelativePath);
            files.push(...subFiles);
          } else {
            files.push(itemRelativePath);
          }
        }
        
        return files;
      };
      
      const files = await readDir(WORKSPACE_DIR);
      return { success: true, files, message: 'Danh sách file thành công' };
    } catch (error) {
      return { success: false, message: `Lỗi khi liệt kê file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  static async executeCommand(command: string): Promise<{ success: boolean; output?: string; error?: string; message: string }> {
    try {
      await ensureWorkspaceDir();
      
      // Security: Allow only safe commands
      const allowedCommands = ['ls', 'pwd', 'echo', 'cat', 'grep', 'find', 'wc', 'head', 'tail'];
      const commandParts = command.trim().split(' ');
      const baseCommand = commandParts[0];
      
      if (!allowedCommands.includes(baseCommand)) {
        return { 
          success: false, 
          message: `Lệnh '${baseCommand}' không được phép. Chỉ cho phép: ${allowedCommands.join(', ')}` 
        };
      }

      const { stdout, stderr } = await execAsync(command, { 
        cwd: WORKSPACE_DIR,
        timeout: 10000 // 10 second timeout
      });
      
      return { 
        success: true, 
        output: stdout, 
        error: stderr,
        message: `Đã thực thi lệnh '${command}' thành công` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Lỗi khi thực thi lệnh: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async startDevServer(): Promise<{ success: boolean; message: string; port?: number }> {
    try {
      await ensureWorkspaceDir();
      
      // Create a simple HTTP server for the workspace
      const serverCode = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      
      switch (ext) {
        case '.css': contentType = 'text/css'; break;
        case '.js': contentType = 'application/javascript'; break;
        case '.json': contentType = 'application/json'; break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const port = 8080;
server.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});
      `;
      
      await fs.writeFile(path.join(WORKSPACE_DIR, 'server.js'), serverCode, 'utf8');
      
      return { 
        success: true, 
        message: 'Đã tạo development server. Chạy lệnh "node server.js" để khởi động.',
        port: 8080 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Lỗi khi tạo dev server: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}