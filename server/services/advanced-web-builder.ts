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

export class AdvancedWebBuilderService {
  /**
   * Tạo project web nâng cao từ yêu cầu AI với auto-redirect
   */
  async createAdvancedProjectFromAI(request: string): Promise<{
    analysis: string;
    type: string;
    files: Array<{ name: string; description: string; content: string }>;
    features: string[];
    autoRedirect: boolean;
  }> {
    console.log('🤖 Creating advanced web project from AI request...');
    
    // Phân tích yêu cầu để xác định loại project
    const projectType = this.detectProjectType(request);
    const features = this.extractFeatures(request);
    
    // Tạo cấu trúc project hoàn chỉnh
    const projectFiles = await this.generateProjectStructure(request, projectType, features);
    
    // Tạo tất cả file trong workspace
    for (const file of projectFiles) {
      await this.createFile(file.name, file.content);
    }
    
    // Tự động setup project nếu cần
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
      features: features,
      autoRedirect: true
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

  /**
   * Tạo cấu trúc project hoàn chỉnh
   */
  private async generateProjectStructure(request: string, projectType: string, features: string[]): Promise<Array<{ name: string; description: string; content: string }>> {
    const files: Array<{ name: string; description: string; content: string }> = [];
    
    // Luôn tạo các file cơ bản
    files.push(
      {
        name: 'index.html',
        description: 'Main HTML file with semantic structure',
        content: this.generateHTML(request, projectType, features)
      },
      {
        name: 'styles/main.css',
        description: 'Modern CSS with CSS Grid and Flexbox',
        content: this.generateCSS(projectType, features)
      },
      {
        name: 'scripts/main.js',
        description: 'Interactive JavaScript with ES6+ features',
        content: this.generateJavaScript(projectType, features)
      },
      {
        name: 'README.md',
        description: 'Project documentation and setup guide',
        content: this.generateREADME(request, projectType, features)
      }
    );
    
    // Thêm file theo loại project
    if (projectType === 'backend' || projectType === 'fullstack') {
      files.push(
        {
          name: 'server/app.js',
          description: 'Express.js backend server',
          content: this.generateBackendServer(features)
        },
        {
          name: 'server/routes/api.js',
          description: 'API routes and endpoints',
          content: this.generateAPIRoutes(features)
        },
        {
          name: 'package.json',
          description: 'Node.js dependencies and scripts',
          content: this.generatePackageJSON(projectType, features)
        }
      );
    }
    
    if (projectType === 'react' || projectType === 'spa') {
      files.push(
        {
          name: 'src/App.jsx',
          description: 'React main component',
          content: this.generateReactApp(request, features)
        },
        {
          name: 'src/components/Header.jsx',
          description: 'Header component',
          content: this.generateReactComponent('Header', features)
        },
        {
          name: 'package.json',
          description: 'React dependencies and build scripts',
          content: this.generateReactPackageJSON(features)
        }
      );
    }
    
    if (features.some(f => f.includes('Database'))) {
      files.push(
        {
          name: 'database/schema.sql',
          description: 'Database schema and initial data',
          content: this.generateDatabaseSchema(projectType)
        },
        {
          name: 'database/config.js',
          description: 'Database connection configuration',
          content: this.generateDatabaseConfig()
        }
      );
    }
    
    // Tạo file cấu hình
    files.push(
      {
        name: '.gitignore',
        description: 'Git ignore file for common files',
        content: this.generateGitIgnore(projectType)
      },
      {
        name: 'config.json',
        description: 'Project configuration file',
        content: this.generateConfig(projectType, features)
      }
    );
    
    return files;
  }

  /**
   * Tạo HTML content
   */
  private generateHTML(request: string, projectType: string, features: string[]): string {
    const title = this.extractTitleFromRequest(request) || 'My Website';
    const hasAuth = features.some(f => f.includes('Authentication'));
    const hasSearch = features.some(f => f.includes('Search'));
    
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="Website được tạo tự động với AI - ${title}">
    <meta name="keywords" content="website, ${projectType}, modern, responsive">
    <link rel="stylesheet" href="styles/main.css">
    ${features.some(f => f.includes('PWA')) ? '<link rel="manifest" href="manifest.json">' : ''}
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1>${title}</h1>
            </div>
            <ul class="nav-menu">
                <li><a href="#home">Trang chủ</a></li>
                <li><a href="#about">Giới thiệu</a></li>
                <li><a href="#services">Dịch vụ</a></li>
                <li><a href="#contact">Liên hệ</a></li>
                ${hasAuth ? '<li><a href="#login" class="btn-login">Đăng nhập</a></li>' : ''}
            </ul>
            ${hasSearch ? '<div class="search-box"><input type="text" placeholder="Tìm kiếm..."><button>🔍</button></div>' : ''}
        </nav>
    </header>

    <main class="main">
        <section id="home" class="hero">
            <div class="hero-content">
                <h2>Chào mừng đến với ${title}</h2>
                <p>Khám phá những tính năng tuyệt vời của chúng tôi</p>
                <button class="cta-button">Bắt đầu ngay</button>
            </div>
        </section>

        <section id="about" class="section">
            <div class="container">
                <h3>Về chúng tôi</h3>
                <p>Chúng tôi cung cấp giải pháp công nghệ hiện đại và chất lượng cao.</p>
                <div class="features-grid">
                    ${features.map(feature => `<div class="feature-card"><h4>${feature}</h4></div>`).join('\n                    ')}
                </div>
            </div>
        </section>

        ${features.some(f => f.includes('Gallery')) ? `
        <section id="gallery" class="gallery-section">
            <div class="container">
                <h3>Thư viện ảnh</h3>
                <div class="gallery-grid">
                    <div class="gallery-item">
                        <img src="https://via.placeholder.com/300x200/4285f4/ffffff?text=Image+1" alt="Gallery Image 1">
                    </div>
                    <div class="gallery-item">
                        <img src="https://via.placeholder.com/300x200/34a853/ffffff?text=Image+2" alt="Gallery Image 2">
                    </div>
                    <div class="gallery-item">
                        <img src="https://via.placeholder.com/300x200/ea4335/ffffff?text=Image+3" alt="Gallery Image 3">
                    </div>
                </div>
            </div>
        </section>` : ''}

        ${features.some(f => f.includes('Contact')) ? `
        <section id="contact" class="contact-section">
            <div class="container">
                <h3>Liên hệ với chúng tôi</h3>
                <form class="contact-form">
                    <input type="text" placeholder="Tên của bạn" required>
                    <input type="email" placeholder="Email" required>
                    <textarea placeholder="Tin nhắn" required></textarea>
                    <button type="submit">Gửi tin nhắn</button>
                </form>
            </div>
        </section>` : ''}
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 ${title}. Tất cả quyền được bảo lưu.</p>
            <p>Được tạo bởi AI Assistant với tình yêu ❤️</p>
        </div>
    </footer>

    <script src="scripts/main.js"></script>
</body>
</html>`;
  }

  // Tất cả các method tạo content khác
  private generateCSS(projectType: string, features: string[]): string {
    return `/* Modern CSS Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* CSS Variables */
:root {
    --primary-color: #4285f4;
    --secondary-color: #34a853;
    --accent-color: #ea4335;
    --text-color: #202124;
    --bg-color: #ffffff;
    --border-radius: 8px;
    --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    --transition: all 0.3s ease;
}

/* Base Styles */
body {
    font-family: 'Roboto', 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--bg-color);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header & Navigation */
.header {
    background: white;
    box-shadow: var(--box-shadow);
    position: sticky;
    top: 0;
    z-index: 1000;
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
}

.nav-brand h1 {
    color: var(--primary-color);
    font-size: 1.5rem;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 2rem;
    align-items: center;
}

.nav-menu a {
    text-decoration: none;
    color: var(--text-color);
    font-weight: 500;
    transition: var(--transition);
}

.nav-menu a:hover {
    color: var(--primary-color);
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    padding: 4rem 0;
    text-align: center;
}

.hero-content h2 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.hero-content p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
}

.cta-button {
    background: white;
    color: var(--primary-color);
    padding: 1rem 2rem;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1.1rem;
    cursor: pointer;
    transition: var(--transition);
}

.cta-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--box-shadow);
}

/* Features Grid */
.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.feature-card {
    background: white;
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    text-align: center;
    transition: var(--transition);
}

.feature-card:hover {
    transform: translateY(-5px);
}

/* Responsive Design */
@media (max-width: 768px) {
    .nav {
        flex-direction: column;
        gap: 1rem;
    }
    
    .nav-menu {
        flex-direction: column;
        gap: 1rem;
    }
    
    .hero-content h2 {
        font-size: 2rem;
    }
    
    .features-grid {
        grid-template-columns: 1fr;
    }
}`;
  }

  private generateJavaScript(projectType: string, features: string[]): string {
    return `// Modern JavaScript for ${projectType} project
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Website loaded successfully!');
    
    // Performance monitoring
    const loadTime = performance.now();
    console.log(\`⚡ Page loaded in \${Math.round(loadTime)}ms\`);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Mobile menu toggle
    function setupMobileMenu() {
        const nav = document.querySelector('.nav');
        const navMenu = document.querySelector('.nav-menu');
        
        if (window.innerWidth <= 768) {
            // Add mobile menu functionality
            console.log('📱 Mobile view detected');
        }
    }
    
    window.addEventListener('resize', setupMobileMenu);
    setupMobileMenu();

    // Interactive features
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            alert('🎉 Chào mừng bạn đến với website của chúng tôi!');
        });
    }
    
    // Contact form handling
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('✅ Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.');
            contactForm.reset();
        });
    }
    
    // Add scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    console.log('✅ All features initialized successfully!');
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('❌ Global error:', e.error);
});

// PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('📲 PWA ready!'))
            .catch(() => console.log('PWA not available'));
    });
}`;
  }

  // Các method helper khác
  private generateREADME(request: string, projectType: string, features: string[]): string {
    return `# ${projectType.toUpperCase()} Project

## Mô tả
Project được tạo tự động từ yêu cầu AI: "${request}"

## Tính năng
${features.map(f => `- ${f}`).join('\n')}

## Cấu trúc thư mục
\`\`\`
project/
├── index.html          # Main HTML file
├── styles/
│   └── main.css        # CSS styles
├── scripts/
│   └── main.js         # JavaScript code
└── README.md           # This file
\`\`\`

## Công nghệ sử dụng
- HTML5 Semantic
- CSS3 (Grid, Flexbox, Variables)
- JavaScript ES6+
- Responsive Design
- Modern Web Standards

## Hướng dẫn sử dụng
1. Mở file \`index.html\` trong trình duyệt
2. Hoặc chạy local server: \`python -m http.server 8000\`
3. Truy cập \`http://localhost:8000\`

Created by AI Assistant 🤖`;
  }

  private generatePackageJSON(projectType: string, features: string[]): string {
    return JSON.stringify({
      name: `${projectType}-project`,
      version: "1.0.0",
      description: "Auto-generated web project",
      main: "server/app.js",
      scripts: {
        "start": "node server/app.js",
        "dev": "nodemon server/app.js"
      },
      dependencies: {
        "express": "^4.18.2"
      }
    }, null, 2);
  }

  private generateBackendServer(features: string[]): string {
    return `const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(\`🚀 Server running on port \${PORT}\`);
});`;
  }

  private generateAPIRoutes(features: string[]): string {
    return `const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

module.exports = router;`;
  }

  private generateGitIgnore(projectType: string): string {
    return `node_modules/\n.env\ndist/\n*.log`;
  }

  private generateConfig(projectType: string, features: string[]): string {
    return JSON.stringify({ projectType, features, autoGenerated: true }, null, 2);
  }

  private extractTitleFromRequest(request: string): string | null {
    const patterns = [
      /trang web (.+)/i,
      /website (.+)/i,
      /tạo (.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = request.match(pattern);
      if (match) return match[1].split(' ').slice(0, 3).join(' ');
    }
    return null;
  }

  private generateProjectAnalysis(request: string, projectType: string, features: string[]): string {
    return `Đã phân tích yêu cầu: "${request}"

**Loại project:** ${projectType.toUpperCase()}
**Features:** ${features.length} tính năng được tích hợp

Hệ thống đã tự động tạo cấu trúc project hoàn chỉnh với modern web standards.`;
  }

  // File operations
  private async createFile(fileName: string, content: string): Promise<void> {
    await ensureWorkspaceDir();
    const filePath = path.join(WORKSPACE_DIR, fileName);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  private async setupNodeProject(projectType: string, features: string[]): Promise<void> {
    console.log('📦 Setting up Node.js project...');
  }

  private async autoSetupProject(projectType: string, features: string[]): Promise<void> {
    console.log('🔧 Auto-setting up project...');
    const dirs = ['assets', 'images', 'styles', 'scripts'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(WORKSPACE_DIR, dir), { recursive: true });
    }
  }

  // Các method khác cho React, Database, etc.
  private generateReactApp(request: string, features: string[]): string {
    return `import React from 'react';
function App() {
  return (
    <div className="App">
      <h1>React App</h1>
      <p>Auto-generated from: ${request}</p>
    </div>
  );
}
export default App;`;
  }

  private generateReactComponent(name: string, features: string[]): string {
    return `import React from 'react';
function ${name}() {
  return <header><h1>${name} Component</h1></header>;
}
export default ${name};`;
  }

  private generateReactPackageJSON(features: string[]): string {
    return JSON.stringify({
      name: "react-project",
      version: "1.0.0",
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
      }
    }, null, 2);
  }

  private generateDatabaseSchema(projectType: string): string {
    return `-- Database schema for ${projectType}
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  }

  private generateDatabaseConfig(): string {
    return `module.exports = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'myproject'
};`;
  }
}