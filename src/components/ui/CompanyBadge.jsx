import { Box } from '@chakra-ui/react';
import { getContrastColor } from '../../utils/colorUtils.js';

export default function CompanyBadge({ company, ...props }) {
  const bg = company?.color || 'gray.700';
  const color = getContrastColor(company?.color || '#2d3748');

  return (
    <Box 
      bg={bg} 
      color={color} 
      textAlign="center" 
      py="2" 
      borderRadius="md" 
      fontWeight="bold"
      {...props}
    >
      {company?.shortName}
    </Box>
  );
}
