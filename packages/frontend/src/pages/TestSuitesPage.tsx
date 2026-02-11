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
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetTestSuitesQuery, useCreateTestSuiteMutation, CreateTestSuiteInput } from '../store/api/testSuitesApi';
import { useGetProjectQuery } from '../store/api/projectsApi';

export const TestSuitesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useGetProjectQuery(projectId!);
  const { data: suites, isLoading } = useGetTestSuitesQuery(projectId);
  const [createSuite] = useCreateTestSuiteMutation();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<CreateTestSuiteInput>({
    projectId: projectId!,
    name: '',
    description: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const handleCreateSuite = async () => {
    try {
      await createSuite(formData).unwrap();
      setOpenDialog(false);
      setFormData({ projectId: projectId!, name: '', description: '', tags: [] });
      setTagInput('');
    } catch (error) {
      console.error('Failed to create test suite:', error);
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(tag => tag !== tagToRemove) });
  };

  if (isLoading) {
    return <Typography>Loading test suites...</Typography>;
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" href="/projects" onClick={(e) => { e.preventDefault(); navigate('/projects'); }}>
          Projects
        </Link>
        <Typography color="text.primary">{project?.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Test Suites</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Test Suite
        </Button>
      </Box>

      <Grid container spacing={3}>
        {suites?.map((suite) => (
          <Grid item xs={12} md={6} lg={4} key={suite.suiteId}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                  {suite.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {suite.description}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {suite.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => navigate(`/projects/${projectId}/suites/${suite.suiteId}`)}
                >
                  View Tests
                </Button>
                <IconButton size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {suites?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No test suites yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first test suite to organize your tests
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
            Create Test Suite
          </Button>
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Test Suite</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Suite Name"
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
              rows={3}
              required
            />
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Add Tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  size="small"
                  fullWidth
                />
                <Button onClick={handleAddTag} variant="outlined">Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {formData.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSuite}
            variant="contained"
            disabled={!formData.name || !formData.description}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
