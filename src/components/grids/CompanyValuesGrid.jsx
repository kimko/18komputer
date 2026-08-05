import { Fragment } from 'react';
import { Box, Flex, Heading, Button, Grid, GridItem, Text } from '@chakra-ui/react';
import { getShareValue, getCompanyOrTotal } from '../../utils/dashboardMath.js';
import { getContrastColor } from '../../utils/colorUtils.js';

export default function CompanyValuesGrid({ 
  activeCompanies, 
  maxOr, 
  dashboardState, 
  updateMaxOr, 
  setActivePopup 
}) {
  if (activeCompanies.length === 0) return null;

  return (
    <Box mb="8">
      <Flex justify="center" align="center" gap="4" mb="4" wrap="wrap">
        <Heading as="h2" size="lg" color="teal.400" textAlign="center">Company Values & Results</Heading>
        <Flex gap="1">
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => updateMaxOr(maxOr - 1)} disabled={maxOr <= 1}>- OR</Button>
          <Button size="xs" variant="outline" color="white" borderColor="gray.600" onClick={() => updateMaxOr(maxOr + 1)}>+ OR</Button>
        </Flex>
      </Flex>
      
      <Box overflowX="auto" mb="8">
        <Grid templateColumns={`80px 100px 80px repeat(${maxOr}, 80px)`} gap="2" alignItems="center" w="max-content" mx="auto">
          <GridItem></GridItem>
          <GridItem textAlign="center"><Text fontWeight="bold" color="white">Share Price</Text></GridItem>
          <GridItem textAlign="center"><Text fontWeight="bold" color="cyan.300">OR Total</Text></GridItem>
          {Array.from({ length: maxOr }).map((_, i) => (
            <GridItem key={i} textAlign="center"><Text fontWeight="bold" color="white">OR {i + 1}</Text></GridItem>
          ))}

          {activeCompanies.map(c => {
            const companyOrTotal = getCompanyOrTotal(dashboardState, maxOr, c.shortName);
            return (
            <Fragment key={c.shortName}>
              <GridItem>
                <Box bg={c.color || 'gray.700'} color={getContrastColor(c.color || '#2d3748')} textAlign="center" py="2" borderRadius="md" fontWeight="bold">
                  {c.shortName}
                </Box>
              </GridItem>
              <GridItem>
                <Button data-testid="share-price-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'shareValue', companyId: c.shortName })}>
                  {getShareValue(dashboardState, activeCompanies, c.shortName)}
                </Button>
              </GridItem>
              <GridItem>
                <Box w="100%" bg="gray.900" color="cyan.300" textAlign="center" py="2" borderRadius="md" fontWeight="bold">
                  {companyOrTotal > 0 ? companyOrTotal : ''}
                </Box>
              </GridItem>
              {Array.from({ length: maxOr }).map((_, i) => {
                const val = dashboardState.ors[c.shortName]?.[`or${i + 1}`];
                return (
                  <GridItem key={i}>
                    <Button data-testid="or-btn" w="100%" bg="gray.800" _hover={{ bg: 'gray.700' }} color="white" onClick={() => setActivePopup({ type: 'or', companyId: c.shortName, orIndex: i + 1 })}>
                      {val !== undefined && val !== '' ? val : ''}
                    </Button>
                  </GridItem>
                );
              })}
            </Fragment>
          )})}
        </Grid>
      </Box>
    </Box>
  );
}
