import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import ModalBackdrop from './ui/ModalBackdrop.jsx';

const whenChanged = (value) => {
  if (!value) return 'Last changed: unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Last changed: unknown'
    : `Last changed: ${date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })}`;
};

function Copy({ title, game, changedAt, accent }) {
  return (
    <Box flex="1" bg="gray.800" p="3" borderRadius="md" border="1px solid" borderColor={accent}>
      <Text fontSize="xs" color={accent} fontWeight="bold" mb="1">{title}</Text>
      <Text color="white" fontSize="sm" fontWeight="bold">{game.gameName || game.gameId}</Text>
      <Text color="gray.400" fontSize="xs">{(game.players || []).join(', ')}</Text>
      <Text color="gray.500" fontSize="xs" mt="1">{whenChanged(changedAt)}</Text>
    </Box>
  );
}

export default function RemoteImportDialog({ localGame, remoteGame, remoteUpdatedAt, onKeepMine, onUseShared }) {
  return (
    <ModalBackdrop onClose={onKeepMine} maxW="md" role="dialog" aria-modal="true" aria-labelledby="remote-import-title">
      <Heading id="remote-import-title" size="md" color="white" mb="2">You already have this game</Heading>
      <Text color="gray.300" fontSize="sm" mb="4">
        Opening the shared copy will replace the one on this device. There is no undo.
      </Text>

      <Flex gap="3" mb="6" direction={{ base: 'column', sm: 'row' }}>
        <Copy title="ON THIS DEVICE" game={localGame} changedAt={localGame.updatedAt} accent="gray.400" />
        <Copy title="SHARED WITH YOU" game={remoteGame} changedAt={remoteUpdatedAt} accent="teal.300" />
      </Flex>

      <Flex gap="3" justify="flex-end">
        <Button variant="outline" color="white" onClick={onKeepMine}>Keep mine</Button>
        <Button colorPalette="teal" onClick={onUseShared}>Use the shared one</Button>
      </Flex>
    </ModalBackdrop>
  );
}
