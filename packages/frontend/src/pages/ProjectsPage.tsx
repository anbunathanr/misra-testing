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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGetProjectsQuery, useCreateProjectMutation, CreateProjectInput } from '../store/api/projectsApi';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useGetProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    targetUrl: '',
    environment: 'dev',
  });

  const handleCreateProject = async () => {
    try {
      await createProject(formData).unwrap();
      setOpenDialog(false);
      setFormData({ name: '', description: '', targetUrl: '', environment: 'dev' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'error';
      case 'staging': return 'warning';
      case 'dev': return 'info';
      default: return 'default';
    }
  };

  if (isLoading) {
    return <Typography>Loading projects...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Test Projects</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          New Project
        </Button>
      </Box>

      <Grid container spacing={3}>
        {projects?.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.projectId}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {project.name}
                  </Typography>
                  <Chip
                    label={project.environment}
                    color={getEnvironmentColor(project.environment)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target: {project.targetUrl}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => navigate(`/projects/${project.projectId}`)}
                >
                  View
                </Button>
                <IconButton size="small" onClick={() => navigate(`/projects/${project.projectId}/edit`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {projects?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first test project to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
            Create Project
          </Button>
        </Box>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Project Name"
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
            <TextField
              label="Target URL"
              value={formData.targetUrl}
              onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
              fullWidth
              placeholder="https://example.com"
              required
            />
            <TextField
              label="Environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
              select
              fullWidth
              required
            >
              <MenuItem value="dev">Development</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            disabled={!formData.name || !formData.description || !formData.targetUrl}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
