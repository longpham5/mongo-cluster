export const getServerDomains = () => {
  const domainsString = process.env.AVAILABLE_DOMAINS 
    || process.env.NEXT_PUBLIC_AVAILABLE_DOMAINS;
  
  const domains = domainsString
    ?.split(',')
    .map(d => d.trim())
    .filter(d => d.length > 0) 
    || ['longppham5.xyz'];
  
  const defaultDomain = process.env.DEFAULT_DOMAIN 
    || process.env.NEXT_PUBLIC_DEFAULT_DOMAIN 
    || domains[0];

  return {
    domains,
    defaultDomain,
  };
};

// For backwards compatibility (build-time only)
export const AVAILABLE_DOMAINS = getServerDomains().domains;
export const DEFAULT_DOMAIN = getServerDomains().defaultDomain;