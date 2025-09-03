import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/lib/admin-api';
import { formatDate } from '@/lib/utils';
import { 
  Database, 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  RefreshCw,
  Eye,
  EyeOff 
} from 'lucide-react';

const SourcesPage = () => {
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSource, setNewSource] = useState({ title: '', rawText: '', tags: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadSources();
  }, [searchTerm]);

  const loadSources = async () => {
    try {
      const response = await adminApiService.getSources(1, 100, searchTerm);
      setSources(response.data);
    } catch (error: any) {
      toast({
        title: "Failed to load sources",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSource = async () => {
    if (!newSource.title.trim() || !newSource.rawText.trim()) {
      toast({
        title: "Validation error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const tags = newSource.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      await adminApiService.createSource({
        title: newSource.title,
        rawText: newSource.rawText,
        tags,
      });
      
      setNewSource({ title: '', rawText: '', tags: '' });
      setIsCreating(false);
      await loadSources();
      
      toast({
        title: "Source created",
        description: "RAG source created and processing started",
      });
    } catch (error: any) {
      toast({
        title: "Failed to create source",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (sourceId: string, isActive: boolean) => {
    try {
      await adminApiService.updateSource(sourceId, { isActive: !isActive });
      await loadSources();
      toast({
        title: "Source updated",
        description: `Source ${!isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to update source",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure? This will permanently delete the source and all its embeddings.')) {
      return;
    }

    try {
      await adminApiService.deleteSource(sourceId);
      await loadSources();
      toast({
        title: "Source deleted",
        description: "RAG source removed permanently",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete source",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleReprocessAll = async () => {
    if (!confirm('Reprocess all sources? This may take several minutes.')) {
      return;
    }

    try {
      await adminApiService.reprocessSources();
      toast({
        title: "Reprocessing started",
        description: "All sources are being reprocessed in the background",
      });
    } catch (error: any) {
      toast({
        title: "Failed to start reprocessing",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Database className="w-8 h-8 mr-3" />
            RAG Sources
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage knowledge base content for AI responses
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleReprocessAll}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reprocess All
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Create Source Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Add New RAG Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Source title"
              value={newSource.title}
              onChange={(e) => setNewSource(prev => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="w-full h-32 p-3 border rounded-md resize-none"
              placeholder="Source content (will be chunked and embedded)"
              value={newSource.rawText}
              onChange={(e) => setNewSource(prev => ({ ...prev, rawText: e.target.value }))}
            />
            <Input
              placeholder="Tags (comma-separated)"
              value={newSource.tags}
              onChange={(e) => setNewSource(prev => ({ ...prev, tags: e.target.value }))}
            />
            <div className="flex items-center space-x-2">
              <Button onClick={handleCreateSource}>Create Source</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Sources ({sources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Content Preview</th>
                  <th className="text-left p-2">Updated</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source: any) => (
                  <tr key={source.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-blue-500" />
                          {source.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {source.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {source.tags.map((tag: string, i: number) => (
                                <span key={i} className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        source.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {source.isActive ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                        {source.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-gray-600 max-w-xs">
                      <div className="truncate">
                        {source.rawText.slice(0, 100)}...
                      </div>
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {formatDate(source.updatedAt)}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(source.id, source.isActive)}
                        >
                          {source.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteSource(source.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No sources found. Add your first knowledge base source to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesPage;