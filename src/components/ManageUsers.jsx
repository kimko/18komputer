import { useState, useEffect } from 'react';
import { Box, Button, VStack, Heading, Text, Center, Input, Flex, IconButton } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { getUsers, saveUsers, deleteUser } from '../api/mockApi.js';

export default function ManageUsers() {
  const [, navigate] = useLocation();
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleAddUser = (e) => {
    e.preventDefault();
    const name = newUserName.trim();
    if (name && !users.includes(name)) {
      saveUsers([name]);
      setUsers(getUsers());
      setNewUserName('');
    }
  };

  const handleDelete = (name) => {
    deleteUser(name);
    setUsers(getUsers());
  };

  return (
    <Center minH="100vh" bg="gray.900" color="white" p="4">
      <Box
        w="100%"
        maxW="md"
        bg="gray.800"
        p="8"
        borderRadius="xl"
        boxShadow="2xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <VStack gap="6" align="stretch">
          <Flex justify="space-between" align="center">
            <Heading as="h2" size="xl" color="orange.400">
              Manage Users
            </Heading>
            <IconButton variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm" aria-label="Close" onClick={() => navigate('/')}>
              ✕
            </IconButton>
          </Flex>

          <form onSubmit={handleAddUser}>
            <Flex gap="2">
              <Input
                placeholder="New user name..."
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                bg="gray.900"
                border="none"
                _focus={{ ring: 2, ringColor: 'orange.400' }}
              />
              <Button type="submit" colorPalette="orange">
                Add
              </Button>
            </Flex>
          </form>

          <Box mt="4">
            {users.length === 0 ? (
              <Text color="gray.500" textAlign="center" py="4">
                No users saved yet.
              </Text>
            ) : (
              <VStack gap="2" align="stretch">
                {users.map((name) => (
                  <Flex
                    key={name}
                    bg="gray.700"
                    p="3"
                    borderRadius="md"
                    justify="space-between"
                    align="center"
                  >
                    <Text fontWeight="medium" color="white">{name}</Text>
                    <IconButton
                      aria-label="Delete user"
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(name)}
                    >
                      ✕
                    </IconButton>
                  </Flex>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </Center>
  );
}
