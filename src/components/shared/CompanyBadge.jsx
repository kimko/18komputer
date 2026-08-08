import { Box } from '@chakra-ui/react';

export default function CompanyBadge({ company, ...props }) {
  if (!company) return null;
  return (
    <Box
      p={2}
      bg={company.color || '#8884d8'}
      color="white"
      borderRadius="md"
      fontWeight="bold"
      textAlign="center"
      textShadow="0px 1px 2px rgba(0, 0, 0, 0.8)"
      border={company.color === '#ffffff' || !company.color ? '1px solid #ccc' : 'none'}
      minW="60px"
      {...props}
    >
      {company.id}
    </Box>
  );
}
