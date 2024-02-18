#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VanityNumbersStack } from '../lib/VanityNumbersStack';

const app = new cdk.App();
new VanityNumbersStack(app, 'VanityNumbersStack');