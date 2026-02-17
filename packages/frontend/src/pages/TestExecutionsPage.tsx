import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { ExecutionResultsTable } from '../components/ExecutionResultsTable';
import { ExecutionDetailsModal } from '../components/ExecutionDetailsModal';
import { TestExecution } from '../store/api/executionsApi';
import { useGetProjectQuery } from '../store/api/projectsApi';
import { useGetTestSuitesQuery } from '../store/api/testSuitesApi';

export const TestExecutionsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useGetProjectQuery(projectId!);
  const { data: testSuites } = useGetTestSuitesQuery(projectId);

  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null);
  const [filterTestSuiteId, setFilterTestSuiteId] = useState<string>('');
  const [filterTestCaseId, setFilterTestCaseId] = useState<string>('');

  const handleViewDetails = (execution: TestExecution) => {
    setSelectedExecution(execution);
  };

  const handleCloseModal = () => {
    setSelectedExecution(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test Executions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {project?.name}
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Test Suite"
                select
                fullWidth
                value={filterTestSuiteId}
                onChange={(e) => setFilterTestSuiteId(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Suites</MenuItem>
                {testSuites?.map((suite) => (
                  <MenuItem key={suite.suiteId} value={suite.suiteId}>
                    {suite.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Test Case ID"
                fullWidth
                value={filterTestCaseId}
                onChange={(e) => setFilterTestCaseId(e.target.value)}
                size="small"
                placeholder="Enter test case ID"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Execution History Table */}
      <ExecutionResultsTable
        projectId={projectId}
        testSuiteId={filterTestSuiteId || undefined}
        testCaseId={filterTestCaseId || undefined}
        onViewDetails={handleViewDetails}
      />

      {/* Execution Details Modal */}
      <ExecutionDetailsModal
        executionId={selectedExecution?.executionId || null}
        open={!!selectedExecution}
        onClose={handleCloseModal}
      />
    </Box>
  );
};
