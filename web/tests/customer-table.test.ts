import assert from "node:assert/strict";
import test from "node:test";
import {
  customerContactNames,
  customerLocation,
} from "../lib/customer-table.ts";

test("renders customer contact names instead of a count", () => {
  assert.equal(
    customerContactNames([
      { full_name: "Alex Nguyen" },
      { full_name: "Minh Tran" },
    ]),
    "Alex Nguyen, Minh Tran",
  );
  assert.equal(customerContactNames([]), "—");
});

test("builds a customer location from headquarters and country", () => {
  assert.equal(
    customerLocation({
      hq_location: "Ho Chi Minh City",
      country: "Vietnam",
      geo_tier: "Tier 1",
    }),
    "Ho Chi Minh City, Vietnam",
  );
  assert.equal(
    customerLocation({ hq_location: null, country: null, geo_tier: "Vietnam" }),
    "Vietnam",
  );
});
