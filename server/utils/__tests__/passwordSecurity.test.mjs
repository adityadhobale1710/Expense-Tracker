import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isCommonPassword, commonPasswordValidator } from '../passwordSecurity.js';

describe('passwordSecurity', () => {
  describe('isCommonPassword()', () => {
    test('must reject common passwords', () => {
      const mustReject = [
        'password',
        'Password',
        'PASSWORD',
        'password123',
        'Password123',
        'PASSWORD123',
        'P@ssword123',
        '12345678',
        'qwerty123',
        'admin123',
        'welcome123',
        'letmein',
        'iloveyou'
      ];
      
      for (const pw of mustReject) {
        assert.strictEqual(isCommonPassword(pw), true, `Expected '${pw}' to be rejected (return true)`);
      }
    });

    test('must not reject strong unique passwords', () => {
      const mustNotReject = [
        'Xk9#mQz2Lp!',
        'Tr0ub4dor&3xyz',
        'correct-horse-battery-staple-42',
        'Blueberry7492!'
      ];
      
      for (const pw of mustNotReject) {
        assert.strictEqual(isCommonPassword(pw), false, `Expected '${pw}' to NOT be rejected (return false)`);
      }
    });
  });

  describe('commonPasswordValidator()', () => {
    test('returns custom error message for common password', () => {
      let messageCalled = false;
      const helpers = {
        message: (msg) => {
          messageCalled = true;
          return { isError: true, msg };
        }
      };
      
      const result = commonPasswordValidator('password123', helpers);
      assert.strictEqual(messageCalled, true);
      assert.strictEqual(result.isError, true);
      assert.strictEqual(result.msg, 'This password is too common. Please choose a stronger password.');
    });

    test('returns original value for strong password', () => {
      let messageCalled = false;
      const helpers = {
        message: () => {
          messageCalled = true;
        }
      };
      
      const result = commonPasswordValidator('Xk9#mQz2Lp!', helpers);
      assert.strictEqual(messageCalled, false);
      assert.strictEqual(result, 'Xk9#mQz2Lp!');
    });
  });
});
