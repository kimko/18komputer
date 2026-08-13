import React from 'react';
import { Heading, Text, Button, Center } from '@chakra-ui/react';
import { reportProblem } from '../services/monitoring/monitoring.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    reportProblem(error, { componentStack: errorInfo?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh" bg="gray.900" color="white" flexDirection="column" gap="4">
          <Heading color="red.400">Something went wrong.</Heading>
          <Text color="gray.300">{this.state.error?.message}</Text>
          <Button colorPalette="orange" onClick={() => window.location.href = '/'}>
            Return to Menu
          </Button>
        </Center>
      );
    }
    return this.props.children;
  }
}
