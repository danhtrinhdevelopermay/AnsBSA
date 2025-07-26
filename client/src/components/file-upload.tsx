import { useState, useRef } from "react";
import { Upload, X, Image, FileText, Video, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface FileAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  url: string;
  mimeType: string;
  size?: number;
}

interface FileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  selectedFiles: FileAttachment[];
  onRemoveFile: (index: number) => void;
}

export function FileUpload({ onFilesSelected, selectedFiles, onRemoveFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    const processedFiles: FileAttachment[] = [];

    files.forEach((file) => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File quá lớn",
          description: `${file.name} vượt quá 10MB`,
          variant: "destructive",
        });
        return;
      }

      // Determine file type
      let fileType: FileAttachment['type'] = 'file';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type.startsWith('video/')) {
        fileType = 'video';
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
      }

      // Convert to base64 for images (for AI analysis) with compression
      if (fileType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new (window as any).Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize image if too large (max 1024px)
            const maxSize = 1024;
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height * maxSize) / width;
                width = maxSize;
              } else {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with compression
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            processedFiles.push({
              type: fileType,
              name: file.name,
              url: compressedBase64,
              mimeType: 'image/jpeg',
              size: Math.round(compressedBase64.length * 0.75), // Estimate compressed size
            });
            
            if (processedFiles.length === files.filter(f => f.type.startsWith('image/')).length + files.filter(f => f.type.startsWith('video/')).length) {
              onFilesSelected([...selectedFiles, ...processedFiles]);
            }
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else if (fileType === 'video') {
        // Convert video to base64 for AI analysis
        const reader = new FileReader();
        reader.onload = (e) => {
          processedFiles.push({
            type: fileType,
            name: file.name,
            url: e.target?.result as string,
            mimeType: file.type,
            size: file.size,
          });
          
          if (processedFiles.length === files.filter(f => f.type.startsWith('video/')).length + files.filter(f => f.type.startsWith('image/')).length) {
            onFilesSelected([...selectedFiles, ...processedFiles]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // For other files, just store file info
        processedFiles.push({
          type: fileType,
          name: file.name,
          url: URL.createObjectURL(file),
          mimeType: file.type,
          size: file.size,
        });
      }
    });

    // If no images or videos, update immediately
    if (!files.some(f => f.type.startsWith('image/') || f.type.startsWith('video/'))) {
      onFilesSelected([...selectedFiles, ...processedFiles]);
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: FileAttachment['type']) => {
    switch (type) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      default:
        return FileText;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-3">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Upload Button */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center space-x-2 p-3 hover:bg-bg-light rounded-lg transition-colors h-auto"
      >
        <Upload className="h-5 w-5 text-primary" />
        <span className="text-sm text-text-primary">Tải file lên</span>
      </Button>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-bg-light rounded-lg"
              >
                {file.type === 'image' ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {file.type.toUpperCase()} • {formatFileSize(file.size)}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                  className="p-1 hover:bg-red-100 rounded-full"
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}