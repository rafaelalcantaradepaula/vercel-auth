const defaultAppConfig = {
  appName: "Vercel NextJs sample",
  appAuthor: "Your Full Name",
  authorEmail: "yourEmail@here",
  dbVersion: "1.1",
} as const;

export const appConfig = {
  appName: process.env.APP_NAME?.trim() || defaultAppConfig.appName,
  appAuthor: defaultAppConfig.appAuthor,
  authorEmail: defaultAppConfig.authorEmail,
  dbVersion: process.env.DB_VERSION?.trim() || defaultAppConfig.dbVersion,
};

export type AppConfig = typeof appConfig;
