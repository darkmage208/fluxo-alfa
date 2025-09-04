import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  ArrowLeft, 
  Database,
  DollarSign,
  User,
  Crown,
  Shield,
  TrendingUp,
  BarChart3,
  Calendar,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const TokenUsagePage = () => {
  const [overallStats, setOverallStats] = useState({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalEmbeddingTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalEmbeddingCost: 0,
    totalConsumptionCost: 0,
    messageCount: 0,
    period: '',
  });
  
  const [userUsageData, setUserUsageData] = useState({
    users: [],
    total: 0,
    page: 1,
    limit: 25,
    period: '',
  });
  
  const [timeframe, setTimeframe] = useState<'total' | 'month' | 'day'>('total');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTokenUsageData();
  }, [userUsageData.page, timeframe, selectedDate]);

  const loadTokenUsageData = async () => {
    try {
      setLoading(true);
      
      const startDate = timeframe === 'total' ? undefined : selectedDate;
      const endDate = timeframe === 'total' ? undefined : selectedDate;
      
      const [statsResponse, usersResponse] = await Promise.all([
        adminApiService.getTokenUsageByTimeframe(timeframe, startDate, endDate),
        adminApiService.getUserTokenUsageByTimeframe(timeframe, userUsageData.page, userUsageData.limit, startDate, endDate)
      ]);
      
      setOverallStats(statsResponse);
      
      setUserUsageData(prev => ({
        ...prev,
        users: usersResponse.data,
        total: usersResponse.pagination?.total || usersResponse.total,
        period: usersResponse.period || statsResponse.period,
      }));
      
    } catch (error: any) {
      toast({
        title: "Failed to load token usage data",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setUserUsageData(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newLimit: number) => {
    setUserUsageData(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const totalPages = Math.ceil(userUsageData.total / userUsageData.limit);

  if (loading && userUsageData.page === 1) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Zap className="w-8 h-8 mr-3 text-yellow-500" />
            Token Usage Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Detailed token consumption and cost analysis - {userUsageData.period}
          </p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Period:</span>
            <div className="flex rounded-lg border bg-background p-1">
              <button
                onClick={() => setTimeframe('day')}
                className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeframe === 'day' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-3 h-3 mr-1" />
                Day
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeframe === 'month' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays className="w-3 h-3 mr-1" />
                Month
              </button>
              <button
                onClick={() => setTimeframe('total')}
                className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeframe === 'total' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="w-3 h-3 mr-1" />
                All Time
              </button>
            </div>
          </div>

          {/* Date Picker */}
          {timeframe !== 'total' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">
                {timeframe === 'day' ? 'Date:' : 'Month:'}
              </span>
              <input
                type={timeframe === 'day' ? 'date' : 'month'}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs border rounded-md bg-background"
              />
            </div>
          )}
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Input Tokens</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overallStats.totalInputTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total input tokens consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Output Tokens</CardTitle>
            <ArrowLeft className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overallStats.totalOutputTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total output tokens generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embedding Tokens</CardTitle>
            <Database className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overallStats.totalEmbeddingTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Query embedding tokens used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {overallStats.totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All token types combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Model Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(overallStats.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Inference model costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embedding Costs</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(overallStats.totalEmbeddingCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Query embedding costs
            </p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(overallStats.totalConsumptionCost || (overallStats.totalCost + overallStats.totalEmbeddingCost))}
            </div>
            <p className="text-xs text-muted-foreground">
              AI + Embedding costs
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Per-User Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Token Usage Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed token consumption and costs per user, ordered by total cost
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Input Tokens</th>
                  <th className="text-left p-3">Output Tokens</th>
                  <th className="text-left p-3">Embedding Tokens</th>
                  <th className="text-left p-3">Total Tokens</th>
                  <th className="text-left p-3">AI Cost</th>
                  <th className="text-left p-3">Embedding Cost</th>
                  <th className="text-left p-3">Total Cost</th>
                  <th className="text-left p-3">Messages</th>
                  <th className="text-left p-3">Avg Tokens/Msg</th>
                </tr>
              </thead>
              <tbody>
                {userUsageData.users.map((user: any) => (
                  <tr key={user.userId} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="font-medium">{user.email}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {user.role === 'pro' && <Crown className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-mono text-sm">
                          {user.inputTokens.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-2 text-green-500" />
                        <span className="font-mono text-sm">
                          {user.outputTokens.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <Database className="w-4 h-4 mr-2 text-orange-500" />
                        <span className="font-mono text-sm">
                          {user.embeddingTokens?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
                        <span className="font-mono font-semibold">
                          {user.totalTokens.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                        <span className={`font-bold ${
                          user.totalCost > 5 ? 'text-red-600' : 
                          user.totalCost > 1 ? 'text-orange-600' : 
                          'text-green-600'
                        }`}>
                          {formatCurrency(user.totalCost)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-orange-600" />
                        <span className={`font-bold ${
                          user.embeddingCost > 1 ? 'text-orange-600' : 
                          user.embeddingCost > 0.1 ? 'text-yellow-600' : 
                          'text-gray-600'
                        }`}>
                          {formatCurrency(user.embeddingCost || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-red-600" />
                        <span className={`font-bold text-lg ${
                          user.totalConsumptionCost > 10 ? 'text-red-600' : 
                          user.totalConsumptionCost > 5 ? 'text-orange-600' : 
                          user.totalConsumptionCost > 1 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {formatCurrency(user.totalConsumptionCost || (user.totalCost + (user.embeddingCost || 0)))}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm">{user.messageCount}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm font-mono text-gray-600">
                        {user.avgTokensPerMessage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {userUsageData.users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No usage data found
              </div>
            )}
          </div>

          {/* Enhanced Pagination */}
          {userUsageData.total > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 pt-4 border-t bg-gray-50 px-4 py-3 rounded-lg space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-sm text-gray-600">
                  Showing {Math.min((userUsageData.page - 1) * userUsageData.limit + 1, userUsageData.total)} to{' '}
                  {Math.min(userUsageData.page * userUsageData.limit, userUsageData.total)} of{' '}
                  {userUsageData.total.toLocaleString()} users
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <Select 
                    value={userUsageData.limit.toString()} 
                    onValueChange={(value) => handlePageSizeChange(Number(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(userUsageData.page - 1)}
                    disabled={userUsageData.page <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const pages = [];
                      
                      // Always show first page
                      pages.push(
                        <Button
                          key={1}
                          variant={userUsageData.page === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={loading}
                          className="w-8 h-8 p-0"
                        >
                          1
                        </Button>
                      );
                      
                      // Add ellipsis if needed
                      if (userUsageData.page > 4) {
                        pages.push(<span key="ellipsis1" className="px-2 text-gray-400">...</span>);
                      }
                      
                      // Add pages around current page
                      const startPage = Math.max(2, userUsageData.page - 1);
                      const endPage = Math.min(totalPages - 1, userUsageData.page + 1);
                      
                      for (let i = startPage; i <= endPage; i++) {
                        if (i !== 1 && i !== totalPages) {
                          pages.push(
                            <Button
                              key={i}
                              variant={userUsageData.page === i ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(i)}
                              disabled={loading}
                              className="w-8 h-8 p-0"
                            >
                              {i}
                            </Button>
                          );
                        }
                      }
                      
                      // Add ellipsis if needed
                      if (userUsageData.page < totalPages - 3) {
                        pages.push(<span key="ellipsis2" className="px-2 text-gray-400">...</span>);
                      }
                      
                      // Always show last page if there's more than 1 page
                      if (totalPages > 1) {
                        pages.push(
                          <Button
                            key={totalPages}
                            variant={userUsageData.page === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        );
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(userUsageData.page + 1)}
                    disabled={userUsageData.page >= totalPages || loading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenUsagePage;