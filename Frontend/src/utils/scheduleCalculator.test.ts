import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLeadsInput,
  calculateEstimatedSendTime,
  validateComposeForm,
  filterEmails,
} from './scheduleCalculator';

test('parseLeadsInput detects valid emails and skips duplicates and invalid addresses', () => {
  const sampleCSV = `
email
aarav.mehta@northwind.io
priya.nair@brightlabs.co
not-an-email
aarav.mehta@northwind.io
invalid@domain
daniel.cho@orbitworks.ai
`;

  const result = parseLeadsInput(sampleCSV);
  assert.equal(result.leadCount, 3);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.invalidCount, 2);
  assert.deepEqual(result.validEmails, [
    'aarav.mehta@northwind.io',
    'priya.nair@brightlabs.co',
    'daniel.cho@orbitworks.ai',
  ]);
});

test('calculateEstimatedSendTime calculates correct estimated duration for 128 emails at 50/hr', () => {
  const result = calculateEstimatedSendTime(128, 2, 50);
  assert.equal(result.formattedDuration, '2h 34m');
  assert.equal(result.summaryText, '128 emails · est. 2h 34m to send · about 50 per hour');
});

test('validateComposeForm flags missing required fields', () => {
  const emptyForm = {
    subject: '',
    body: '',
    fileName: null,
    leadCount: 0,
    hourlyLimit: '',
    delaySeconds: '',
  };

  const { errors, isValid } = validateComposeForm(emptyForm);
  assert.equal(isValid, false);
  assert.equal(errors.subject, 'Subject is required');
  assert.equal(errors.leads, 'Add a file with at least one valid email');
  assert.equal(errors.hourlyLimit, 'Must be at least 1');
});

test('validateComposeForm passes with valid parameters', () => {
  const validForm = {
    subject: 'Quick intro: scaling outbound at Northwind',
    body: 'Hello...',
    fileName: 'leads-q4.csv',
    leadCount: 128,
    hourlyLimit: 50,
    delaySeconds: 2,
  };

  const { errors, isValid } = validateComposeForm(validForm);
  assert.equal(isValid, true);
  assert.equal(Object.keys(errors).length, 0);
});

test('filterEmails filters by email or subject correctly', () => {
  const list = [
    {
      id: '1',
      email: 'aarav.mehta@northwind.io',
      subject: 'Quick intro: scaling outbound',
      status: 'Scheduled' as const,
    },
    {
      id: '2',
      email: 'sara.iqbal@cloudmint.com',
      subject: 'Idea for CloudMint Q4 pipeline',
      status: 'Sent' as const,
    },
  ];

  const filtered1 = filterEmails(list, 'northwind');
  assert.equal(filtered1.length, 1);
  assert.equal(filtered1[0].email, 'aarav.mehta@northwind.io');

  const filtered2 = filterEmails(list, 'cloudmint');
  assert.equal(filtered2.length, 1);
  assert.equal(filtered2[0].email, 'sara.iqbal@cloudmint.com');
});
