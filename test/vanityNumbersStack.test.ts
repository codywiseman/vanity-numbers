import { App } from 'aws-cdk-lib';
import { VanityNumbersStack } from '../lib/VanityNumbersStack';
import { Template } from 'aws-cdk-lib/assertions';

describe('Vanity Number', () => {

  let vanityNumbersStackTemplate: Template;

  beforeAll(() => {
    const testApp = new App({
      outdir: 'cdk.out'
    });
    const vanityNumbersStack = new VanityNumbersStack(testApp, 'VanityNumbersStack');
    vanityNumbersStackTemplate = Template.fromStack(vanityNumbersStack);
  })

  test('Lambda is created', () => {
    const resource = vanityNumbersStackTemplate.findResources('AWS::Lambda::Function')
    const lambdaNames = Object.keys(resource)

    let exists = false;

    lambdaNames.forEach(lambda => {
      if(lambda.includes('createVanity')) {
        exists = true;
      }
    })

    expect(exists).toBeTruthy();
  })

  // test('S3 bucket is created', () => {
  //  
  // })

  // test('DynamoDB table is created', () => {
  //   
  // })

  // test('Lambda has vanity S3 bucket read permission', () => {
  //  
  // })

  // test('Lambda has vanity dynamo read/write permission', () => {
  //  
  // })

})