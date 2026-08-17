import sql from 'mssql';
import { ENV } from './env';

let pool: sql.ConnectionPool | null = null;

export async function getMSSQLPool(): Promise<sql.ConnectionPool | null> {
  if (!ENV.MSSQL_HOST || !ENV.MSSQL_PASSWORD) {
    // Quietly return null when MSSQL host/password is not configured
    return null;
  }

  if (pool && pool.connected) {
    return pool;
  }

  const config: sql.config = {
    server: ENV.MSSQL_HOST,
    port: ENV.MSSQL_PORT,
    user: ENV.MSSQL_USER,
    password: ENV.MSSQL_PASSWORD,
    database: ENV.MSSQL_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log(`[MSSQL] Connected to SQL Server at ${ENV.MSSQL_HOST}:${ENV.MSSQL_PORT}/${ENV.MSSQL_DATABASE}`);
    await initializeMSSQLTables(pool);
    return pool;
  } catch (error: any) {
    console.warn('[MSSQL] SQL Server unreachable. Continuing in S3-Native Datastore Mode.');
    return null;
  }
}

async function initializeMSSQLTables(poolConnection: sql.ConnectionPool): Promise<void> {
  const initScript = `
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RawQueue')
    BEGIN
      CREATE TABLE RawQueue (
        id NVARCHAR(50) PRIMARY KEY,
        platform NVARCHAR(50) NOT NULL,
        channelName NVARCHAR(150) NOT NULL,
        rawMessageId NVARCHAR(150) NOT NULL,
        rawText NVARCHAR(MAX) NOT NULL,
        rawHtml NVARCHAR(MAX) NULL,
        receivedAt DATETIME2 DEFAULT SYSDATETIME(),
        processed BIT DEFAULT 0,
        retryCount INT DEFAULT 0,
        classifierResult NVARCHAR(MAX) NULL,
        processingError NVARCHAR(MAX) NULL,
        createdAt DATETIME2 DEFAULT SYSDATETIME()
      );
      CREATE INDEX IX_RawQueue_Processed ON RawQueue(processed);
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Jobs')
    BEGIN
      CREATE TABLE Jobs (
        id NVARCHAR(50) PRIMARY KEY,
        rawQueueId NVARCHAR(50) NULL,
        companyName NVARCHAR(200) NOT NULL,
        jobTitle NVARCHAR(200) NOT NULL,
        jobType NVARCHAR(100) NULL,
        location NVARCHAR(200) NULL,
        isRemote BIT NULL,
        ctcMentioned BIT DEFAULT 0,
        ctcRange NVARCHAR(100) NULL,
        applicationLink NVARCHAR(MAX) NULL,
        skillsRequired NVARCHAR(MAX) NULL,
        experienceRequired NVARCHAR(100) NULL,
        rawDescription NVARCHAR(MAX) NOT NULL,
        dedupHash NVARCHAR(64) NOT NULL,
        isDuplicate BIT DEFAULT 0,
        matchScore INT DEFAULT 0,
        matchConfidence FLOAT DEFAULT 0.0,
        gapAnalysis NVARCHAR(MAX) NULL,
        fitBreakdown NVARCHAR(MAX) NULL,
        scoreFlag NVARCHAR(50) DEFAULT 'auto',
        approvalStatus NVARCHAR(50) DEFAULT 'pending',
        applicationStatus NVARCHAR(50) DEFAULT 'not_applied',
        resumeVersionUrl NVARCHAR(MAX) NULL,
        resumeNotes NVARCHAR(MAX) NULL,
        coverLetterText NVARCHAR(MAX) NULL,
        referralContacts NVARCHAR(MAX) NULL,
        createdAt DATETIME2 DEFAULT SYSDATETIME(),
        updatedAt DATETIME2 DEFAULT SYSDATETIME()
      );
      CREATE INDEX IX_Jobs_ApprovalStatus ON Jobs(approvalStatus);
      CREATE INDEX IX_Jobs_DedupHash ON Jobs(dedupHash);
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProcessingErrors')
    BEGIN
      CREATE TABLE ProcessingErrors (
        id NVARCHAR(50) PRIMARY KEY,
        rawQueueId NVARCHAR(50) NOT NULL,
        stage NVARCHAR(50) NOT NULL,
        error NVARCHAR(MAX) NOT NULL,
        retryCount INT DEFAULT 0,
        createdAt DATETIME2 DEFAULT SYSDATETIME()
      );
    END;
  `;

  await poolConnection.request().query(initScript);
}
