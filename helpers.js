const DEBUG = false;

// eslint-disable-next-line no-console
const logger = (log) => { if (DEBUG) logger(log); };

/** Get the list of variables required for full templating of
 * the given string
 *
 * @param {string} templateString The string with <> variables
 * @returns {Array} an array of variable names
 */
function getRequiredVariables(templateString) {
  return (templateString.match(/<[a-z_0-9]*>/g) || []) // find vars
    .map((x) => `${x}`.replace(/^<|>$/g, '')); // remove < & >
}

/** This actually replaces the placeholders.
 *
 * @param {string} templateString The string that has the template placeholders
 * @param {object} variables This holds all the real values for the vars
 * @returns {string} the processed string
 */
function templateVariables(templateString, variables) {
  const variablesReq = getRequiredVariables(templateString);
  let result = templateString;
  variablesReq.forEach((tempVar) => {
    result = result.replace(
      new RegExp(`<${tempVar}>`, 'g'),
      variables[tempVar],
    );
  });
  return result;
}

/** This function plugs in all the values for the variables.
 *
 * @param {object} variables the config for the variables
 * @param {object} queryFunction a database instance to interact with the db
 * @returns {Promise} contains all the variables with plugged in data
 */
async function processVariables(variables = {}, queryFunction) {
  const unprocessed = [];
  Object.keys(variables).map((varName) => unprocessed.push(varName));

  const result = {};
  let count = 0;
  while (unprocessed.length > 0) {
    count += 1;
    if (count > 200000) { // Probably will end up in an infinite loop now
      // eslint-disable-next-line no-console
      logger('.');
    }
    const varName = unprocessed.shift(); // Get the first element in the list
    let predicate = variables[varName];

    const variablesReq = getRequiredVariables(predicate);

    logger(`${varName} => ${predicate}`);
    logger(variablesReq);
    if (variablesReq.some((tempVar) => !{}.propertyIsEnumerable.call(result, tempVar))) {
      // if at least one pre-requisite variable is not processed.
      unprocessed.push(varName); // Push back into the list for later processing
      logger('Push back into list for further processing');
    } else { // No Dependencies on other variables;
      // TODO Use a Promise.all to do this simultaneously
      // also need to check if the variable is not already in the currently calculated list
      if (getRequiredVariables(predicate).length > 0) {
        const sqlQuery = templateVariables(predicate, result); // add to result set
        // eslint-disable-next-line no-await-in-loop
        const resultArray = (await queryFunction(sqlQuery)).map((row) => row[varName]);
        // the above mapping is to convert the record object to an array

        predicate = resultArray.length === 0 ? '(null)' : `(${resultArray.join(',')})`;
      }
      result[varName] = predicate;
    }
    logger(`Result ${JSON.stringify(result, 0, 2)}`);
  }
  return result;
}

module.exports = {
  processVariables,
  templateVariables,
  logger,
};
