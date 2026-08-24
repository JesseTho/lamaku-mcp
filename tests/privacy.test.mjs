import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  authorLabel,
  isStaffRole,
  person,
  privacyNote,
  pseudonym,
  scrubNames,
} from '../dist/privacy.js';

/**
 * The FERPA guard is the one part of this server where a bug is a disclosure
 * rather than an inconvenience: student names reaching a model reach a
 * vendor's logs. These tests exist so a refactor cannot quietly weaken it.
 */

describe('pseudonym', () => {
  it('is stable for the same id', () => {
    assert.equal(pseudonym(4821), pseudonym(4821));
  });

  it('does not collide across nearby ids', () => {
    const ids = [1, 2, 3, 100, 101, 4821, 4822];
    const handles = new Set(ids.map((i) => pseudonym(i)));
    assert.equal(handles.size, ids.length);
  });

  it('treats a numeric and string id as the same person', () => {
    assert.equal(pseudonym(4821), pseudonym('4821'));
  });

  it('never contains the raw id', () => {
    // The whole point is that the handle is not a key back into Brightspace.
    assert.doesNotMatch(pseudonym(4821), /4821/);
  });

  it('looks like a handle rather than a name', () => {
    assert.match(pseudonym(4821), /^student:[0-9a-f]+$/);
  });
});

describe('isStaffRole', () => {
  it('recognises the roles that are not protected records', () => {
    for (const role of ['Instructor', 'Teaching Assistant', 'Designer']) {
      assert.equal(isStaffRole(role), true, `${role} should be staff`);
    }
  });

  it('treats students and participants as protected', () => {
    for (const role of ['Student', 'Participant', 'Learner']) {
      assert.equal(isStaffRole(role), false, `${role} must not be staff`);
    }
  });

  it('fails closed on an unknown or missing role', () => {
    // An unrecognised role must be treated as a student, never as staff.
    assert.equal(isStaffRole(null), false);
    assert.equal(isStaffRole(undefined), false);
    assert.equal(isStaffRole('Some New Role D2L Added'), false);
  });
});

describe('person', () => {
  const student = {
    userId: 4821,
    displayName: 'Jane Doe',
    userName: 'jdoe',
    email: 'jdoe@hawaii.edu',
    roleName: 'Student',
  };

  it('emits no identifying field for a student by default', () => {
    const out = JSON.stringify(person(student));
    for (const leak of ['Jane', 'Doe', 'jdoe', 'hawaii.edu', '4821']) {
      assert.doesNotMatch(out, new RegExp(leak, 'i'), `leaked ${leak}`);
    }
  });

  it('drops the raw userId, not just the name', () => {
    // userId is a direct key back into Brightspace and anything sharing the
    // same institutional id, so pseudonymising the name is not enough.
    assert.equal(
      Object.prototype.hasOwnProperty.call(person(student), 'userId'),
      false,
    );
  });

  it('reveals only when explicitly asked', () => {
    assert.match(JSON.stringify(person(student, true)), /Jane Doe/);
  });

  it('does not redact course staff', () => {
    const out = JSON.stringify(
      person({ ...student, displayName: 'Dr Ada Lovelace', roleName: 'Instructor' }),
    );
    assert.match(out, /Ada Lovelace/);
  });
});

describe('scrubNames', () => {
  it('removes a name from surrounding prose', () => {
    const out = scrubNames('Jane Doe asked about lab 3.', ['Jane Doe']);
    assert.doesNotMatch(out, /Jane Doe/);
  });

  it('leaves the rest of the sentence intact', () => {
    assert.match(scrubNames('Jane Doe asked about lab 3.', ['Jane Doe']), /lab 3/);
  });

  it('scrubs a "Last, First" display name, which D2L returns constantly', () => {
    // The comma leaves no word boundary after "Smith", so a trailing 
    // never matched and the surname went through in the clear.
    const out = scrubNames('Smith, Jane asked about lab 3.', ['Smith, Jane']);
    assert.doesNotMatch(out, /Smith/);
    assert.doesNotMatch(out, /Jane/);
  });

  it('scrubs a hyphenated or apostrophised surname', () => {
    assert.doesNotMatch(scrubNames("Aoife O'Brien-Smith posted.", ["Aoife O'Brien-Smith"]), /Brien/);
  });

  it('handles regex metacharacters in a name without throwing', () => {
    // A name with a bracket or a dot must not be compiled as a pattern.
    assert.doesNotThrow(() => scrubNames('A. O(Brien) posted.', ['A. O(Brien)']));
    assert.doesNotMatch(scrubNames('A. O(Brien) posted.', ['A. O(Brien)']), /Brien/);
  });

  it('passes text through untouched when revealing', () => {
    const text = 'Jane Doe asked about lab 3.';
    assert.equal(scrubNames(text, ['Jane Doe'], true), text);
  });
});

describe('authorLabel and privacyNote', () => {
  it('labels a student post without naming them', () => {
    const label = authorLabel(
      { userId: 4821, displayName: 'Jane Doe', roleName: 'Student' },
      false,
    );
    assert.doesNotMatch(String(label), /Jane/);
  });

  it('says plainly when identities were withheld', () => {
    const note = JSON.stringify(privacyNote(false, 3));
    assert.match(note, /student|privacy|pseudony|withheld|redact/i);
  });

  it('says plainly when identities were revealed', () => {
    const note = JSON.stringify(privacyNote(true, 3));
    assert.ok(note.length > 0);
  });
});
