import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  EyeOff,
  MoreHorizontal,
  Edit,
  AlertCircle
} from 'lucide-react';

const SourcesPage = () => {
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSource, setNewSource] = useState({ title: '', rawText: '', tags: '' });
  const [selectedSource, setSelectedSource] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(source.id, source.isActive)}
                          >
                            {source.isActive ? (
                              <><EyeOff className="mr-2 h-4 w-4" />Deactivate</>
                            ) : (
                              <><Eye className="mr-2 h-4 w-4" />Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const content = `Title: ${source.title}\n\nContent:\n${source.rawText}\n\nTags: ${source.tags?.join(', ') || 'None'}`;
                              navigator.clipboard.writeText(content);
                              toast({
                                title: "Content copied",
                                description: "Source content copied to clipboard",
                              });
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Copy Content
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSource(source);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSource(source.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Source
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Source Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
              Source Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive information about this knowledge base source
            </DialogDescription>
          </DialogHeader>
          
          {selectedSource && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Basic Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Title:</span>
                        <p className="text-base font-semibold mt-1">{selectedSource.title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            selectedSource.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedSource.isActive ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                            {selectedSource.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Content Length:</span>
                        <p className="text-base mt-1">{selectedSource.rawText?.length?.toLocaleString() || 0} characters</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Timestamps</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Created:</span>
                        <p className="text-base mt-1">{formatDate(selectedSource.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                        <p className="text-base mt-1">{formatDate(selectedSource.updatedAt)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Source ID:</span>
                        <p className="text-sm mt-1 font-mono bg-white px-2 py-1 rounded border">
                          {selectedSource.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              {selectedSource.tags && selectedSource.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Tags ({selectedSource.tags.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSource.tags.map((tag: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Content Preview</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const content = `Title: ${selectedSource.title}\n\nContent:\n${selectedSource.rawText}\n\nTags: ${selectedSource.tags?.join(', ') || 'None'}`;
                      navigator.clipboard.writeText(content);
                      toast({
                        title: "Content copied",
                        description: "Full source content copied to clipboard",
                      });
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Copy Full Content
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap text-gray-700 font-mono leading-relaxed">
                    {selectedSource.rawText}
                  </pre>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedSource.rawText?.split(/\s+/).length || 0}</div>
                  <div className="text-sm text-blue-700 mt-1">Words</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedSource.rawText?.split('\n').length || 0}</div>
                  <div className="text-sm text-green-700 mt-1">Lines</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{selectedSource.tags?.length || 0}</div>
                  <div className="text-sm text-purple-700 mt-1">Tags</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SourcesPage;