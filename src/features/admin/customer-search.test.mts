import assert from "node:assert/strict";
import test from "node:test";
import { customerMatchesQuery } from "./customer-search.ts";

const customer = { displayName: "やすだ かつみ", telephoneNumber: "09012345678" };

test("customer search accepts names with or without spaces", () => {
  for (const query of ["やすだかつみ", "やすだ かつみ", "やすだ　かつみ", "かつみ", ""]) {
    assert.equal(customerMatchesQuery(customer, query), true);
  }
  assert.equal(customerMatchesQuery(customer, "別の名前"), false);
});

test("phone searches accept hyphens and full-width digits", () => {
  assert.equal(customerMatchesQuery(customer, "090-1234-5678"), true);
  assert.equal(customerMatchesQuery(customer, "０９０１２３４５６７８"), true);
});
