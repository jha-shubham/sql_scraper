const fs = require('fs');
const Sequelize = require('sequelize');
const tableConfig = require('./config.json');
const { databases: databaseConfig } = require('./secrets.json');;
const {
  processVariables,
  logger,
  templateVariables,
} = require('./helpers');

const backupScript = 'bkp_script.sh';

const fsStream = fs.createWriteStream(backupScript);
fsStream.write('#!/bin/bash\n', 'utf8');

const databaseRef = {
  railsapp: {
    config: databaseConfig.railsapp,
    tableConfig: tableConfig.database.railsapp,
  },
  zombie: {
    config: databaseConfig.zombie,
    tableConfig: tableConfig.database.zombie,
  },
};

// eslint-disable-next-line arrow-body-style
const getQueryFunction = (databaseName) => (query) => {
  // use sequelize to run queries to populate variables
  const { config } = databaseRef[databaseName];
  const sequelize = new Sequelize(config.database, config.username, config.password, config);
  return sequelize.query(query, {
    type: sequelize.QueryTypes.SELECT,
  });
};
const railsappVariables = processVariables(
  tableConfig.variables.railsapp,
  getQueryFunction('railsapp'),
);

const zombieVariables = processVariables(
  tableConfig.variables.zombie,
  getQueryFunction('zombie'),
);

Promise.all([zombieVariables, railsappVariables])
  // eslint-disable-next-line no-console
  .catch((err) => { console.error(err); })
  .then((varArray) => {
    const allVariables = varArray.reduce((acc, varMap) => ({ ...acc, ...varMap }));

    Object.keys(databaseRef).map((name) => {
      const database = databaseRef[name];
      const {
        username, password, host, port, database: databaseName,
      } = database.config;

      const conditionsAndTablesConfig = database.tableConfig;
      Object.keys(conditionsAndTablesConfig).forEach((tableName) => {
        let condition = '';
        if (conditionsAndTablesConfig[tableName].condition.length > 0) {
          const whereQuery = templateVariables(
            conditionsAndTablesConfig[tableName].condition,
            allVariables,
          );
          condition = ` --where="${whereQuery}"`;
        }
        const dumpCmd = `mysqldump  --single-transaction  --opt --protocol=TCP --host=${host} -P ${port} \
--user=${username} --password=${password} \
${databaseName} ${tableName} ${condition} > ${name}-${tableName}.sql\n`;

        // eslint-disable-next-line no-console
        console.log(`Done with table ${tableName}`);
        fsStream.write(dumpCmd);
      });
      return null;
    });
    // the finish event is emitted when all data has been flushed from the stream
    fsStream.on('finish', () => {
      logger('wrote all data to file');
    });

    fsStream.end(); // close the stream
  });
