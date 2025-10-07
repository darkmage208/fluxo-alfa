import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { adminApiService } from '@/lib/admin-api';
import { Settings, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApiService.getSystemSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error(`❌ Loading Failed: Failed to load system settings. ${error instanceof Error ? error.message : 'Please refresh the page.'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string, type?: string, description?: string) => {
    try {
      setSaving(key);
      const updatedSetting = await adminApiService.updateSystemSetting(key, { value, type, description });

      setSettings(prev => prev.map(setting =>
        setting.key === key ? updatedSetting : setting
      ));

      toast.success(`${key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} updated successfully!`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error(`Failed to update ${key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSaving(null);
    }
  };


  const SystemPromptEditor = () => {
    const systemPromptSetting = settings.find(s => s.key === 'system_prompt');
    const [promptValue, setPromptValue] = useState(systemPromptSetting?.value || '');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
      if (systemPromptSetting) {
        setPromptValue(systemPromptSetting.value);
      }
    }, [systemPromptSetting]);

    const handleSave = () => {
      if (systemPromptSetting) {
        updateSetting('system_prompt', promptValue);
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Prompt Configuration
          </CardTitle>
          <CardDescription>
            Configure the AI assistant's behavior and personality through the system prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Hide' : 'Preview'}
              </Button>
              <Badge variant={systemPromptSetting?.isActive ? 'default' : 'secondary'}>
                {systemPromptSetting?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {showPreview ? (
            <div className="p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {promptValue}
              </pre>
            </div>
          ) : (
            <Textarea
              id="system-prompt"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="min-h-[40px] h-[400px] font-mono text-sm"
              placeholder="Enter the system prompt for the AI assistant..."
            />
          )}

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Character count: {promptValue.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPromptValue(systemPromptSetting?.value || '')}
                disabled={promptValue === systemPromptSetting?.value}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving === 'system_prompt' || promptValue === systemPromptSetting?.value}
              >
                {saving === 'system_prompt' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const AISettingsEditor = () => {
    const aiSettings = settings.filter(s => ['ai_model', 'max_tokens', 'temperature'].includes(s.key));

    // Available AI models
    const availableModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];

    const handleValueChange = (key: string, value: string) => {
      // Validate max_tokens
      if (key === 'max_tokens') {
        const num = parseInt(value);
        if (value !== '' && (isNaN(num) || num < 1 || num > 8192)) {
          toast.warning('⚠️ Max tokens must be between 1 and 8192');
          return;
        }
      }

      setSettings(prev => prev.map(s =>
        s.key === key ? { ...s, value } : s
      ));
    };

    const validateTemperature = (value: string) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 1;
    };

    const handleTemperatureChange = (value: string) => {
      // Only allow values between 0 and 1
      if (value === '' || validateTemperature(value)) {
        handleValueChange('temperature', value);
      } else {
        // Show validation error for invalid temperature
        toast.warning('⚠️ Temperature must be between 0.0 and 1.0');
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Model Configuration</CardTitle>
          <CardDescription>
            Configure AI model parameters and behavior settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiSettings.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={setting.key}>
                  {setting.key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                  {setting.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex gap-2">
                {setting.key === 'ai_model' ? (
                  <Select
                    value={setting.value}
                    onValueChange={(value) => handleValueChange('ai_model', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : setting.key === 'temperature' ? (
                  <Input
                    id={setting.key}
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={setting.value}
                    onChange={(e) => handleTemperatureChange(e.target.value)}
                    className="flex-1"
                    placeholder="0.0 - 1.0"
                  />
                ) : (
                  <Input
                    id={setting.key}
                    type={setting.key === 'max_tokens' ? 'number' : 'text'}
                    value={setting.value}
                    onChange={(e) => handleValueChange(setting.key, e.target.value)}
                    className="flex-1"
                    min={setting.key === 'max_tokens' ? '1' : undefined}
                    max={setting.key === 'max_tokens' ? '8192' : undefined}
                  />
                )}
                <Button
                  size="sm"
                  onClick={() => updateSetting(setting.key, setting.value)}
                  disabled={saving === setting.key || (setting.key === 'temperature' && !validateTemperature(setting.value))}
                >
                  {saving === setting.key ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {setting.description && (
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              )}
              {setting.key === 'temperature' && !validateTemperature(setting.value) && setting.value !== '' && (
                <p className="text-sm text-red-500">Temperature must be between 0.0 and 1.0</p>
              )}
              {setting.key === 'max_tokens' && (
                <p className="text-sm text-muted-foreground">Maximum tokens per response (1-8192)</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const CommonSettingsEditor = () => {
    const commonSettings = settings.filter(s => ['free_message_limit'].includes(s.key));

    const handleValueChange = (key: string, value: string) => {
      // Validate free_message_limit
      if (key === 'free_message_limit') {
        const num = parseInt(value);
        if (value !== '' && (isNaN(num) || num < 1 || num > 2000)) {
          toast.warning('⚠️ Free message limit must be between 1 and 2000');
          return;
        }
      }

      setSettings(prev => prev.map(s =>
        s.key === key ? { ...s, value } : s
      ));
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Common Settings</CardTitle>
          <CardDescription>
            Configure general system settings and user limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {commonSettings.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={setting.key}>
                  {setting.key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                  {setting.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  id={setting.key}
                  type="number"
                  value={setting.value}
                  onChange={(e) => handleValueChange(setting.key, e.target.value)}
                  className="flex-1"
                  min="1"
                  max="2000"
                  placeholder="1 - 2000"
                />
                <Button
                  size="sm"
                  onClick={() => updateSetting(setting.key, setting.value)}
                  disabled={saving === setting.key}
                >
                  {saving === setting.key ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {setting.description && (
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };


  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center">
            <Settings className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and AI behavior
          </p>
        </div>
        <Button onClick={loadSettings} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="system-prompt" className="space-y-6">
        <TabsList>
          <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
          <TabsTrigger value="common-settings">Common Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="system-prompt">
          <SystemPromptEditor />
        </TabsContent>

        <TabsContent value="ai-settings">
          <AISettingsEditor />
        </TabsContent>

        <TabsContent value="common-settings">
          <CommonSettingsEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;