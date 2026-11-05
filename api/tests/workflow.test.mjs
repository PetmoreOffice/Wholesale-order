import assert from 'node:assert/strict';
import { test } from 'node:test';
import { routeIndex } from '../../shared/orderWorkflow.js';
import { assignToAdmin, cancelByCustomer, moveByAdmin, replyByCustomer } from '../src/orders/workflow.js';

const admin = { uid: 'admin-1', name: 'แอดมินทดสอบ' };
const customer = { uid: 'customer', name: 'ร้านทดสอบ' };
const order = (status, extra = {}) => ({ orderId: 1, customerId: 'customer', status, history: [], messages: [], assignmentLog: [], ...extra });

test('an admin moves an order only along the allowed road, after taking it', () => {
  const taken = order('submitted');
  assignToAdmin(taken, admin, null);
  assert.equal(taken.status, 'assigned');
  assert.throws(() => moveByAdmin(taken, admin, 'completed', null), /ไม่สามารถเปลี่ยน/);
  assert.throws(() => moveByAdmin(taken, { uid: 'other', name: 'x' }, 'approved', null), /รับช่วง/);
  assert.equal(moveByAdmin(taken, admin, 'approved', null), 'assigned');
  assert.equal(taken.status, 'approved');
  assert.ok(taken.approvedAt);
});

test('asking for information leaves a message the customer can read, and a reply returns the order', () => {
  const asked = order('assigned', { assignedAdminId: admin.uid });
  moveByAdmin(asked, admin, 'need_information', 'ยืนยันหน่วยขาย');
  assert.equal(asked.messages.at(-1).messageBody, 'ยืนยันหน่วยขาย');
  replyByCustomer(asked, customer, 'เป็นลัง');
  assert.equal(asked.status, 'assigned');
});

test('customers cannot cancel after approval', () => {
  assert.throws(() => cancelByCustomer(order('approved'), customer, null), /ยกเลิกเองไม่ได้/);
  const open = order('submitted');
  cancelByCustomer(open, customer, null);
  assert.equal(open.status, 'cancelled');
});

test('exits are placed at the last main stop the order passed', () => {
  assert.equal(routeIndex('approved'), 2);
  assert.equal(routeIndex('shipped'), 3);
  // History is newest first, as addHistory writes it.
  assert.equal(routeIndex('need_information', [{ toStatus: 'need_information' }, { toStatus: 'assigned' }]), 1);
  assert.equal(routeIndex('rejected', [{ fromStatus: 'assigned', toStatus: 'rejected' }, { toStatus: 'submitted' }]), 1);
  assert.equal(routeIndex('rejected', []), 0);
});
