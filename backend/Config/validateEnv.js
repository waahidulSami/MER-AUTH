const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
];

export const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missing.join(", ")}`);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
};
