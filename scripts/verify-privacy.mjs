import {
  person,
  authorLabel,
  pseudonym,
  scrubNames,
  privacyNote,
} from '../dist/privacy.js';

let bad = 0;
const check = (label, pass, detail = '') => {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) bad++;
};

const student = {
  userId: 998877,
  displayName: 'Kealoha, Malia',
  firstName: 'Malia',
  lastName: 'Kealoha',
  username: 'mkealoha',
  email: 'mkealoha@hawaii.edu',
  orgDefinedId: '12345678',
  roleName: 'Student',
};

console.log('\nFERPA guard');
const red = person(student);
const blob = JSON.stringify(red);
check('name removed', !blob.includes('Malia') && !blob.includes('Kealoha'), blob);
check('username removed', !blob.includes('mkealoha'));
check('email removed', !blob.includes('hawaii.edu'));
check('org id removed', !blob.includes('12345678'));
check('raw userId removed', !blob.includes('998877'));
check('handle present', /^student:[0-9a-f]{6}$/.test(red.ref), red.ref);

check('pseudonym stable', pseudonym(998877) === pseudonym(998877));
check('pseudonym unique per user', pseudonym(998877) !== pseudonym(998878));

const revealed = person(student, true);
check('reveal returns real name', revealed.displayName === 'Kealoha, Malia');
check('reveal returns email', revealed.email === 'mkealoha@hawaii.edu');

const staff = person({ userId: 1944, displayName: 'Thompson, Jesse', roleName: 'Instructor' });
check('staff not redacted', staff.displayName === 'Thompson, Jesse', staff.ref);

check(
  'author label pseudonymised',
  /^student:[0-9a-f]{6}$/.test(authorLabel(998877, 'Malia Kealoha')),
);
check('author label reveals on request', authorLabel(998877, 'Malia Kealoha', true) === 'Malia Kealoha');

const prose = 'Great work Malia, but Kealoha should review section 2.';
const scrubbed = scrubNames(prose, ['Malia Kealoha']);
check('names scrubbed from prose', !/Malia|Kealoha/.test(scrubbed), scrubbed);
check('prose kept otherwise', scrubbed.includes('section 2'));

check('privacy banner emitted', 'privacy' in privacyNote(false, 3));
check('no banner when revealed', Object.keys(privacyNote(true, 3)).length === 0);

console.log(`\n${bad === 0 ? 'ALL CHECKS PASSED' : bad + ' CHECK(S) FAILED'}\n`);
process.exit(bad === 0 ? 0 : 1);
