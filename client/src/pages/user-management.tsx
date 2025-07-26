import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X, UserCheck, UserX } from 'lucide-react';

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface UserManagementProps {
  user?: {
    id: string;
    email: string;
    username: string | null;
    credits: number;
    role: string;
  } | null;
}

export function UserManagement({ user: currentUser }: UserManagementProps) {
  // Check if user has admin access
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Truy cập bị từ chối</CardTitle>
            <CardDescription>Bạn cần đăng nhập để truy cập trang này.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Truy cập bị từ chối</CardTitle>
            <CardDescription>Chỉ admin mới có thể truy cập trang quản lý người dùng.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Role hiện tại: {currentUser.role}</p>
            <Button className="mt-4" onClick={() => window.location.href = '/'}>
              Quay về trang chủ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<CreditTransaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách người dùng',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const fetchUserTransactions = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setUserTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch user transactions:', error);
    }
  };

  const handleEditCredits = (user: User) => {
    setEditingUserId(user.id);
    setEditCredits(user.credits.toString());
  };

  const handleSaveCredits = async (userId: string) => {
    const newCredits = parseInt(editCredits);
    if (isNaN(newCredits) || newCredits < 0) {
      toast({
        title: 'Lỗi',
        description: 'Credits phải là số không âm',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits: newCredits }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? { ...user, credits: newCredits } : user
        ));
        setEditingUserId(null);
        toast({
          title: 'Thành công',
          description: data.message,
        });
      } else {
        throw new Error('Failed to update credits');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật credits',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditCredits('');
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    fetchUserTransactions(user.id);
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isActive: !isActive } : user
        ));
        toast({
          title: 'Thành công',
          description: `Đã ${!isActive ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản`,
        });
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái tài khoản',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getCreditChangeColor = (amount: number) => {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải danh sách người dùng...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
        <Button onClick={fetchUsers}>Làm mới</Button>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng ({users.length})</CardTitle>
          <CardDescription>
            Quản lý thông tin và credits của tất cả người dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Đăng nhập cuối</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.email}</div>
                      {user.username && (
                        <div className="text-sm text-muted-foreground">{user.username}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingUserId === user.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editCredits}
                          onChange={(e) => setEditCredits(e.target.value)}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveCredits(user.id)}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{user.credits.toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCredits(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Người dùng'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        {user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(user.lastLogin)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewUser(user)}
                    >
                      Xem chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết người dùng: {selectedUser.email}</CardTitle>
            <CardDescription>
              Lịch sử giao dịch và thông tin chi tiết
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Thông tin cơ bản</h4>
                <div className="space-y-1 text-sm">
                  <div>ID: {selectedUser.id}</div>
                  <div>Credits hiện tại: {selectedUser.credits.toLocaleString()}</div>
                  <div>Ngày tạo: {formatDate(selectedUser.createdAt)}</div>
                  <div>Đăng nhập cuối: {formatDate(selectedUser.lastLogin)}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Lịch sử giao dịch</h4>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead>Thay đổi</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge variant="outline">{transaction.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getCreditChangeColor(transaction.amount)}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </span>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Button onClick={() => setSelectedUser(null)}>Đóng</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}