import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { 
  FolderOpen, 
  FileText, 
  Play, 
  Save, 
  Terminal, 
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  Code,
  Globe,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export default function WebBuilder() {
  const [files, setFiles] = useState<FileNode[]>([
    {
      name: 'index.html',
      type: 'file',
      content: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trang web của tôi</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Chào mừng đến với trang web của tôi!</h1>
    <p>Đây là một trang web đơn giản được tạo bằng HTML.</p>
    <button onclick="sayHello()">Nhấp vào tôi!</button>
    
    <script src="script.js"></script>
</body>
</html>`
    },
    {
      name: 'style.css',
      type: 'file',
      content: `body {
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

h1 {
    font-size: 2.5em;
    margin-bottom: 20px;
    text-align: center;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

p {
    font-size: 1.2em;
    margin-bottom: 30px;
    text-align: center;
}

button {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 1.1em;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

button:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}`
    },
    {
      name: 'script.js',
      type: 'file',
      content: `function sayHello() {
    alert('Xin chào! Chào mừng bạn đến với trang web của tôi!');
}

// Thêm hiệu ứng khi trang web được tải
document.addEventListener('DOMContentLoaded', function() {
    console.log('Trang web đã được tải thành công!');
    
    // Thêm hiệu ứng fade-in cho các element
    const elements = document.querySelectorAll('h1, p, button');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 200);
    });
});`
    }
  ]);

  const [activeFile, setActiveFile] = useState<FileNode | null>(files[0]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Chào mừng đến với Web Builder Terminal!',
    'Gõ "help" để xem danh sách lệnh có sẵn.',
    ''
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    generatePreview();
  }, [files]);

  useEffect(() => {
    loadWorkspaceFiles();
  }, []);

  const loadWorkspaceFiles = async () => {
    try {
      const response = await fetch('/api/web-builder/files');
      const result = await response.json();
      
      if (result.success && result.files && result.files.length > 0) {
        const workspaceFiles: FileNode[] = [];
        
        for (const fileName of result.files) {
          if (!fileName.endsWith('/')) { // Skip directories
            const fileResponse = await fetch(`/api/web-builder/files/${fileName}`);
            const fileResult = await fileResponse.json();
            
            if (fileResult.success) {
              workspaceFiles.push({
                name: fileName,
                type: 'file',
                content: fileResult.content
              });
            }
          }
        }
        
        if (workspaceFiles.length > 0) {
          setFiles(workspaceFiles);
          setActiveFile(workspaceFiles[0]);
          toast({
            title: "Đã tải workspace",
            description: `Đã tải ${workspaceFiles.length} file từ workspace`,
          });
        }
      }
    } catch (error) {
      console.error('Error loading workspace files:', error);
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const generatePreview = () => {
    const htmlFile = files.find(f => f.name === 'index.html');
    if (htmlFile) {
      let content = htmlFile.content || '';
      
      // Inject CSS
      const cssFile = files.find(f => f.name === 'style.css');
      if (cssFile) {
        content = content.replace(
          '<link rel="stylesheet" href="style.css">',
          `<style>${cssFile.content}</style>`
        );
      }
      
      // Inject JS
      const jsFile = files.find(f => f.name === 'script.js');
      if (jsFile) {
        content = content.replace(
          '<script src="script.js"></script>',
          `<script>${jsFile.content}</script>`
        );
      }
      
      setPreviewContent(content);
    }
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      setActiveFile(file);
    }
  };

  const handleFileContentChange = (content: string) => {
    if (activeFile) {
      setFiles(prev => prev.map(file => 
        file.name === activeFile.name ? { ...file, content } : file
      ));
      setActiveFile(prev => prev ? { ...prev, content } : null);
    }
  };

  const handleTerminalCommand = () => {
    const command = terminalInput.trim();
    if (!command) return;

    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    setTerminalInput('');

    switch (command.toLowerCase()) {
      case 'help':
        setTerminalOutput(prev => [...prev, 
          'Danh sách lệnh có sẵn:',
          '  help     - Hiển thị danh sách lệnh',
          '  ls       - Liệt kê file',
          '  clear    - Xóa terminal',
          '  run      - Chạy dự án',
          '  save     - Lưu tất cả file',
          ''
        ]);
        break;
      
      case 'ls':
        setTerminalOutput(prev => [...prev, 
          files.map(f => f.name).join('  '),
          ''
        ]);
        break;
      
      case 'clear':
        setTerminalOutput(['']);
        break;
      
      case 'run':
        setTerminalOutput(prev => [...prev, 'Đang chạy dự án...', '']);
        runProject();
        break;
      
      case 'save':
        setTerminalOutput(prev => [...prev, 'Đã lưu tất cả file.', '']);
        toast({
          title: "Đã lưu",
          description: "Tất cả file đã được lưu thành công",
        });
        break;
      
      default:
        setTerminalOutput(prev => [...prev, `Lệnh không được nhận dạng: ${command}`, '']);
    }
  };

  const runProject = () => {
    setIsRunning(true);
    generatePreview();
    setTimeout(() => setIsRunning(false), 1000);
    toast({
      title: "Đã chạy dự án",
      description: "Dự án đã được cập nhật trong preview",
    });
  };

  const createNewFile = async () => {
    const fileName = prompt('Tên file mới:');
    if (fileName) {
      try {
        const response = await fetch('/api/web-builder/files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: fileName,
            content: ''
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          const newFile: FileNode = {
            name: fileName,
            type: 'file',
            content: ''
          };
          setFiles(prev => [...prev, newFile]);
          setActiveFile(newFile);
          
          toast({
            title: "Đã tạo file",
            description: `File ${fileName} đã được tạo thành công`,
          });
        } else {
          toast({
            title: "Lỗi",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Lỗi",
          description: "Không thể tạo file",
          variant: "destructive",
        });
      }
    }
  };

  const saveFile = async () => {
    if (!activeFile) return;
    
    try {
      const response = await fetch(`/api/web-builder/files/${activeFile.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: activeFile.content || ''
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Đã lưu",
          description: `File ${activeFile.name} đã được lưu thành công`,
        });
      } else {
        toast({
          title: "Lỗi",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể lưu file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay về Chat
          </Button>
          <Code className="h-6 w-6 text-blue-400" />
          <h1 className="text-lg font-semibold">Web Builder</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={createNewFile} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" />
            File mới
          </Button>
          <Button size="sm" onClick={saveFile} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-1" />
            Lưu
          </Button>
          <Button size="sm" onClick={runProject} disabled={isRunning} className="bg-purple-600 hover:bg-purple-700">
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? 'Đang chạy...' : 'Chạy'}
          </Button>
          <Button size="sm" onClick={loadWorkspaceFiles} className="bg-orange-600 hover:bg-orange-700">
            <FolderOpen className="h-4 w-4 mr-1" />
            Tải lại
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <PanelGroup direction="horizontal">
          {/* File Explorer */}
          <Panel defaultSize={20} minSize={15}>
            <div className="h-full bg-gray-800 border-r border-gray-700">
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-sm font-medium flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  File Explorer
                </h3>
              </div>
              <div className="p-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-700 ${
                      activeFile?.name === file.name ? 'bg-blue-600' : ''
                    }`}
                    onClick={() => handleFileClick(file)}
                  >
                    <FileText className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle />

          {/* Code Editor */}
          <Panel defaultSize={50}>
            <div className="h-full flex flex-col">
              {/* Tab Bar */}
              {activeFile && (
                <div className="bg-gray-800 border-b border-gray-700 flex">
                  <div className="flex items-center px-4 py-2 bg-gray-700">
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="text-sm">{activeFile.name}</span>
                  </div>
                </div>
              )}
              
              {/* Editor */}
              <div className="flex-1 bg-gray-900">
                {activeFile ? (
                  <textarea
                    value={activeFile.content || ''}
                    onChange={(e) => handleFileContentChange(e.target.value)}
                    className="w-full h-full p-4 bg-gray-900 text-white font-mono text-sm resize-none outline-none"
                    placeholder="Bắt đầu viết code..."
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chọn một file để bắt đầu chỉnh sửa</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle />

          {/* Preview & Terminal */}
          <Panel defaultSize={30}>
            <PanelGroup direction="vertical">
              {/* Preview */}
              <Panel defaultSize={70}>
                <div className="h-full bg-white">
                  <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-green-400" />
                    <span className="text-sm font-medium">Preview</span>
                  </div>
                  <iframe
                    srcDoc={previewContent}
                    className="w-full h-full border-0"
                    title="Preview"
                  />
                </div>
              </Panel>

              <PanelResizeHandle />

              {/* Terminal */}
              <Panel defaultSize={30} minSize={20}>
                <div className="h-full bg-black flex flex-col">
                  <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center">
                    <Terminal className="h-4 w-4 mr-2 text-green-400" />
                    <span className="text-sm font-medium">Terminal</span>
                  </div>
                  
                  <div
                    ref={terminalRef}
                    className="flex-1 p-3 overflow-y-auto font-mono text-sm"
                  >
                    {terminalOutput.map((line, index) => (
                      <div key={index} className="text-green-400">
                        {line}
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-700 p-2 flex items-center">
                    <span className="text-green-400 mr-2">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleTerminalCommand()}
                      className="flex-1 bg-transparent text-green-400 outline-none font-mono"
                      placeholder="Gõ lệnh..."
                    />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}