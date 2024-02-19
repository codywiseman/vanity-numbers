import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { ConnectContactFlowEvent } from 'aws-lambda'

// Instantiate S3 client to interact with S3 bucket
const s3 = new AWS.S3();
//Instantiate DynamoDB client to interact with DynamoDB
const dynamoDB = new AWS.DynamoDB();

//Export the main getVanityNumbers function as handler
exports.handler = async (event: ConnectContactFlowEvent): Promise<{}> => {
  return getVanityNumbers(event);
}

// Map of phoney keypad digits and their corresponding letters used to generate letter combos for customer phone number
const digitToLetters: { [key: string]: string[] } = {
  '2': ['A', 'B', 'C'],
  '3': ['D', 'E', 'F'],
  '4': ['G', 'H', 'I'],
  '5': ['J', 'K', 'L'],
  '6': ['M', 'N', 'O'],
  '7': ['P', 'Q', 'R', 'S'],
  '8': ['T', 'U', 'V'],
  '9': ['W', 'X', 'Y', 'Z']
};

// Function that creates all possible letter combos for last 4 digits of customer phone number
function listCombinations(digits: string): string[] {
  if (digits.length === 0) return [];

  // Get last 4 digits of phone number
  const lastFourDigits = digits.slice(-4);

  const result: string[] = [];

  // There are no corresponding letter for 1 and 0 on a keypad so a vanity number cannot be created for these phone numbers
  if (lastFourDigits.includes('1') || lastFourDigits.includes('0')) {
    console.error('Cannot create vanity for phone number containng 1 or 0')
    return result;
  }
  
  function generateCombinations(combination: string, index: number) {
    // Base case - if the current index equals the length of the last four digits,
    // add the current combination to the result array and return.
    if (index === lastFourDigits.length) {
      result.push(combination);
      return;
    }
    
    // Recursively iterate over all possible letters for the current digit
    const currentDigit = lastFourDigits[index];
    const letters = digitToLetters[currentDigit];
    
    for (let letter of letters) {
      generateCombinations(combination + letter, index + 1);
    }
  }
  
  generateCombinations('', 0);
  
  return result;
}

// Retrieves the four-letter.txt file from S3
async function retrieveWordsfromS3(): Promise<string[]> {
  // Currently retrieving the file from local directory when testing
  // Ideally have this testing logic isolated to test file so it does not exist in the deployed lambda
  if(process.env.TESTING) {
    const filePath = path.resolve(__dirname, '../resources/four-letter.txt');
    const fourLetterWords = fs.readFileSync(filePath, 'utf8').trim().split(/\s+/);
    return fourLetterWords;
  }

  try {
    const bucketName = process.env.BUCKET_NAME;

    if (!bucketName) {
      console.error('BUCKET_NAME environment variable is not defined.');
      return [];
    }

    const params: AWS.S3.GetObjectRequest = {
      Bucket: bucketName,
      Key: 'four-letter.txt'
    };

    const data = await s3.getObject(params).promise();

    if (!data.Body) {
      console.error('Empty response body from S3');
      return [];
    }

    const words = data.Body.toString('utf8').split(/\r?\n/);

    return words;

  } catch (error) {
      console.error('Error:', error);
      return [];
  }
}

// Compare generated combos to list of 4 letter words
// Returns max of 5 matches
function compareCombinations(combinations: string[], words: string[]): string[] {
  const existingCombinations: string[] = [];
  for (let i = 0; i < combinations.length; i++) {
      const combination = combinations[i];
      if (words.includes(combination)) {
          if (existingCombinations.length >= 5) {
              return existingCombinations;
          }
          existingCombinations.push(combination);
      }
  }
  return existingCombinations;
}

// Join prefix of phone number with last generated vanity word
function formatMatches(matches: string[], digits: string): string[] {
  const prefix = digits.slice(0, -4);
  const formattedMatches: string[] = [];
  matches.forEach(match => {
    formattedMatches.push(prefix + match);
  });
  return formattedMatches;
}

// Save vanity number to DynamoDB
async function saveVanityToDynamo(customerEndpoint, formattedMatches): Promise<void>  {
  if(process.env.TESTING) {
    // If running test on lambda, skip saving number to dynamo for now
        // Use something like LocalStack to test AWS API calls
    return;
  }
  
  if (formattedMatches.length === 0) {
    return;
  }

  try {

    const tableName = process.env.TABLE_NAME;

    if (!tableName) {
      console.error('TABLE_NAME environment variable is not defined.');
      return;
    }

    const params = {
        TableName: tableName,
        Item: {
            'phoneNumber': { S: customerEndpoint },
            'vanityNumbers': { SS: formattedMatches }
        }
    };

    await dynamoDB.putItem(params).promise();

  } catch (error) {
    console.error('Error adding item to DynamoDB:', error);
  }
}

// Generate SSML prompt that will play in Connect
function getConnectPrompt(formattedMatches: string[]): string {
  let prompt = ''

  // If no vanity number was generated, return prompt informaing caller no vanity numbers available
  if(formattedMatches.length === 0) {
    prompt = '<speak>There are no vanity numbers available for your phone number</speak>';
  } else {
    // Append all generated vanity numbers to prompt
    let numbers = '';
    formattedMatches.forEach(match => {
      const prefix = match.slice(0, -4)
      const vanity = match.slice(-4)

      numbers = numbers + `<break time="500ms"/><say-as interpret-as="telephone">${prefix}</say-as>${vanity}`
    })
    prompt = `<speak>Your vanity number options are ${numbers}</speak>`;
  }
  return prompt;
}

async function getVanityNumbers(event: any): Promise<{prompt: string}> {
  const customerEndpoint = event.Details.ContactData.Attributes.Number;
  const combinations = listCombinations(customerEndpoint);
  const words = await retrieveWordsfromS3();
  const matches = compareCombinations(combinations, words);
  const formattedMatches = formatMatches(matches, customerEndpoint);
  
  await saveVanityToDynamo(customerEndpoint, formattedMatches);

  return { prompt: getConnectPrompt(formattedMatches) };
}