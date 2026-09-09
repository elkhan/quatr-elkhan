import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      styleSrc: ["'self'"],
      // Both development and production acceptance currently use loopback HTTP.
      upgradeInsecureRequests: null,
    },
  },
  strictTransportSecurity: false,
  xFrameOptions: { action: "deny" },
});
