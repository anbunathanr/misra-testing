import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as RunIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetTestCasesBySuiteQuery,
  useCreateTestCaseMutation,
  CreateTestCaseInput,
  TestStep,
} from '../store/api/testCasesApi';
import { useGetTestSuiteQuery } from '../store/api/testSuitesApi';
import { useGetProjectQuery } from '../store/api/projectsApi';
import { ExecutionTriggerButton } from '../components/ExecutionTriggerButton';
import { ExecutionStatusBadge } from '../components/ExecutionStatusBadge';

export const TestCasesPage: React.FC = () => {
  const { projectId, suiteId } = useParams<{ projectId: string; suiteId: string }>();
  const navigate = useNavigate();
  const { data: project } = useGetProjectQuery(projectId!);
  const { data: suite } = useGetTestSuiteQuery(suiteId!);
  const { data: testCases, isLoading } = useGetTestCasesBySuiteQuery(suiteId!);
  const [createTestCase] = useCreateTestCaseMutation();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [latestExecutions, setLatestExecutions] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreateTestCaseInput>({
    suiteId: suiteId!,
    projectId: projectId!,
    name: '',
    description: '',
    type: 'functional',
    steps: [],
    priority: 'medium',
    tags: [],
  });
  const [currentStep, setCurrentStep] = useState<TestStep>({
    stepNumber: 1,
    action: 'navigate',
    target: '',
    value: '',
    expectedResult: '',
  });

  const handleCreateTestCase = async () => {
    try {
      await createTestCase(formData).unwrap();
      setOpenDialog(false);
      setFormData({
        suiteId: suiteId!,
        projectId: projectId!,
        name: '',
        description: '',
        type: 'functional',
        steps: [],
        priority: 'medium',
        tags: [],
      });
    } catch (error) {
      console.error('Failed to create test case:', error);
    }
  };

  const handleAddStep = () => {
    if (currentStep.target) {
      setFormData({
        ...formData,
        steps: [...formData.steps, { ...currentStep, stepNumber: formData.steps.length + 1 }],
      });
      setCurrentStep({
        stepNumber: formData.steps.length + 2,
        action: 'navigate',
        target: '',
        value: '',
        expectedResult: '',
      });
    }
  };

  const handleRemoveStep = (stepNumber: number) => {
    setFormData({
      ...formData,
      steps: formData.steps
        .filter(s => s.stepNumber !== stepNumber)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    });
  };

  const handleExecutionSuccess = (testCaseId: string, executionId: string) => {
    setLatestExecutions((prev) => ({
      ...prev,
      [testCaseId]: executionId,
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'functional': return 'primary';
      case 'ui': return 'secondary';
      case 'api': return 'success';
      case 'performance': return 'warning';
      default: return 'default';
    }
  };

  if (isLoading) {
    return <Typography>Loading test cases...</Typography>;
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" href="/projects" onClick={(e) => { e.preventDefault(); navigate('/projects'); }}>
          Projects
        </Link>
        <Link color="inherit" href={`/projects/${projectId}`} onClick={(e) => { e.preventDefault(); navigate(`/projects/${projectId}`); }}>
          {project?.name}
        </Link>
        <Typography color="text.primary">{suite?.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Test Cases</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Test Case
        </Button>
      </Box>

      <Grid container spacing={3}>
        {testCases?.map((testCase) => (
          <Grid item xs={12} key={testCase.testCaseId}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="div">
                      {testCase.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {testCase.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={testCase.type} color={getTypeColor(testCase.type)} size="small" />
                      <Chip label={testCase.priority} color={getPriorityColor(testCase.priority)} size="small" />
                    </Box>
                    {latestExecutions[testCase.testCaseId] && (
                      <ExecutionStatusBadge
                        executionId={latestExecutions[testCase.testCaseId]}
                        showProgress={true}
                      />
                    )}
                  </Box>
                </Box>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Steps ({testCase.steps.length}):
                </Typography>
                <List dense>
                  {testCase.steps.slice(0, 3).map((step) => (
                    <ListItem key={step.stepNumber}>
                      <ListItemText
                        primary={`${step.stepNumber}. ${step.action} - ${step.target}`}
                        secondary={step.expectedResult}
                      />
                    </ListItem>
                  ))}
                  {testCase.steps.length > 3 && (
                    <ListItem>
                      <ListItemText secondary={`... and ${testCase.steps.length - 3} more steps`} />
                    </ListItem>
                  )}
                </List>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
                  {testCase.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <ExecutionTriggerButton
                  testCaseId={testCase.testCaseId}
                  environment="test"
                  variant="text"
                  size="small"
                  onSuccess={(executionId) => handleExecutionSuccess(testCase.testCaseId, executionId)}
                />
                <Button
                  size="small"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate(`/projects/${projectId}/executions?testCaseId=${testCase.testCaseId}`)}
                >
                  History
                </Button>
                <IconButton size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {testCases?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No test cases yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first test case to start testing
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
            Create Test Case
          </Button>
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Test Case</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Test Case Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                select
                fullWidth
                required
              >
                <MenuItem value="functional">Functional</MenuItem>
                <MenuItem value="ui">UI</MenuItem>
                <MenuItem value="api">API</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
              </TextField>
              <TextField
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                select
                fullWidth
                required
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Test Steps</Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Action"
                value={currentStep.action}
                onChange={(e) => setCurrentStep({ ...currentStep, action: e.target.value as any })}
                select
                sx={{ width: 150 }}
              >
                <MenuItem value="navigate">Navigate</MenuItem>
                <MenuItem value="click">Click</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="assert">Assert</MenuItem>
                <MenuItem value="wait">Wait</MenuItem>
                <MenuItem value="api-call">API Call</MenuItem>
              </TextField>
              <TextField
                label="Target"
                value={currentStep.target}
                onChange={(e) => setCurrentStep({ ...currentStep, target: e.target.value })}
                fullWidth
                placeholder="CSS selector, URL, or API endpoint"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Value (optional)"
                value={currentStep.value}
                onChange={(e) => setCurrentStep({ ...currentStep, value: e.target.value })}
                fullWidth
              />
              <TextField
                label="Expected Result"
                value={currentStep.expectedResult}
                onChange={(e) => setCurrentStep({ ...currentStep, expectedResult: e.target.value })}
                fullWidth
              />
            </Box>
            <Button onClick={handleAddStep} variant="outlined" disabled={!currentStep.target}>
              Add Step
            </Button>

            {formData.steps.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Steps:</Typography>
                <List dense>
                  {formData.steps.map((step) => (
                    <ListItem
                      key={step.stepNumber}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveStep(step.stepNumber)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${step.stepNumber}. ${step.action} - ${step.target}`}
                        secondary={step.expectedResult}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTestCase}
            variant="contained"
            disabled={!formData.name || !formData.description || formData.steps.length === 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
